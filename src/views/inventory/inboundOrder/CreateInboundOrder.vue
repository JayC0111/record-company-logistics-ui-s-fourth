<template>
  <div class="page-container" v-loading="pageLoading">
    <div class="page-main-header">
      <h2 class="page-main-title">
        {{ pageTitle }}
      </h2>
    </div>

    <el-card class="content-section-card">
      <el-form ref="inboundOrderFormRef" :model="formHeader" :rules="headerRules" label-width="110px" label-position="right">
        <h3 class="section-title">入库单 - 表头信息</h3>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="入库单号:">
              <el-input v-model="formHeader.putaway_order_no" placeholder="保存后自动生成" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="入库负责人:" prop="creatorName">
              <el-input v-model="formHeader.creatorName" placeholder="加载中..." readonly disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="创建时间:" prop="creation_time">
              <el-date-picker
                v-model="formHeader.creation_time"
                type="datetime"
                placeholder="选择或自动记录"
                style="width: 100%;"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                :disabled="isViewMode || isEditMode"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="关联采购单:">
              <el-input v-model="formHeader.related_purchase_order_nos" placeholder="根据明细自动汇总" disabled type="textarea" :rows="1"/>
            </el-form-item>
          </el-col>
           <el-col :span="8">
            <el-form-item label="入库单状态:">
              <el-input :value="getInboundStatusText(formHeader.status)" placeholder="保存后更新" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注:" prop="notes">
              <el-input
                v-model="formHeader.notes"
                type="textarea"
                :rows="2"
                placeholder="请输入备注信息"
                :disabled="isViewMode || formHeader.status === 'COMPLETED' || formHeader.status === 'CANCELLED'"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <el-card class="content-section-card" style="margin-top: 20px;">
        <h3 class="section-title">
            <span>入库单 - 商品明细</span>
            <div v-if="canAddOrEditLines">
                <el-button type="primary" :icon="LinkIcon" @click="handleOpenSelectPoLinesDialog">关联已收货PO明细</el-button>
            </div>
        </h3>
        <el-table :data="formLines" border stripe style="width: 100%" empty-text="请通过“关联已收货PO明细”按钮添加商品">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="purchase_order_no" label="来源采购单" width="180" show-overflow-tooltip/>
            <el-table-column prop="productCode" label="商品编码" width="150" show-overflow-tooltip />
            <el-table-column prop="productName" label="商品名称" min-width="200" show-overflow-tooltip />
            <el-table-column prop="specification" label="规格型号" width="120" show-overflow-tooltip />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column label="本次入库数量" width="150" align="right">
            <template #default="scope">
                <el-input-number
                v-if="canAddOrEditLines"
                v-model="scope.row.quantity_to_putaway"
                :min="0.01"
                :max="scope.row._maxCanPutawayFromDialog || Number.MAX_SAFE_INTEGER" 
                :precision="2"
                :controls="false"
                size="small"
                style="width: 100px;"
                placeholder="输入数量"
                @change="() => handleItemQuantityChange(scope.row, scope.$index)"
                />
                <span v-else>{{ scope.row.quantity_to_putaway }}</span>
            </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" v-if="canAddOrEditLines">
            <template #default="scope">
                <el-button type="danger" link :icon="DeleteIcon" @click="handleRemoveItem(scope.$index)">
                移除
                </el-button>
            </template>
            </el-table-column>
        </el-table>
        <div v-if="canAddOrEditLines && formLines.length === 0" class="empty-items-placeholder">
            请通过“关联已收货PO明细”按钮添加入库商品
        </div>
    </el-card>

    <div class="page-actions-footer fixed">
      <el-button @click="handleCancel">
        {{ isViewMode ? '返 回' : '取 消' }}
      </el-button>
      <el-button
        type="primary"
        @click="handleSubmitInboundOrder"
        v-if="isCreateMode && formLines.length > 0"
        :loading="submitLoading"
      >
        提交入库单
      </el-button>
      <el-button
        type="primary"
        @click="handleUpdateInboundOrder"
        v-if="isEditMode && formHeader.status === 'PENDING'"
        :loading="submitLoading"
      >
        保存修改
      </el-button>
      <el-button
        type="success"
        @click="handleConfirmPutawayComplete"
        v-if="canConfirmComplete"
        :loading="submitLoading"
      >
        确认入库完成
      </el-button>
    </div>

    <SelectReceivedPOLinesDialog
      v-if="selectPoLinesDialogVisible"
      v-model:visible="selectPoLinesDialogVisible"
      :existing-po-line-ids="existingPoLineIdsInForm"
      @confirm="handleAddPoLinesFromDialog"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch, nextTick, defineProps, onActivated } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Link as LinkIcon, Delete as DeleteIcon } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/modules/auth.js';
import { createInboundOrder, getInboundOrderDetail, updateInboundOrder } from '@/api/inboundOrder.js';
import SelectReceivedPOLinesDialog from '@/components/shared/SelectReceivedPOLinesDialog.vue';

defineOptions({
  name: 'CreateInboundOrder' // 与路由组件名一致，便于keep-alive
});

const props = defineProps({
  id: String, // 从路由props接收
  mode: String // 从路由props接收
});

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const inboundOrderFormRef = ref(null);
const pageLoading = ref(false);
const submitLoading = ref(false);
const selectPoLinesDialogVisible = ref(false);

const initialFormHeaderState = () => ({
  id: null,
  putaway_order_no: '',
  creatorId: '',
  creatorName: '',
  creation_time: _formatDateTimeToString(new Date()), // 默认当前时间
  related_purchase_order_nos: '',
  status: 'PENDING', // 新建时默认为 PENDING
  notes: '',
  items: [], // items将移至formLines
});

const formHeader = reactive(initialFormHeaderState());
const formLines = ref([]); // 商品明细行

// 使用props或route.query来确定当前模式
const currentRouteMode = computed(() => props.mode || route.query.mode);
const currentRouteId = computed(() => props.id || route.params.id);

const isCreateMode = computed(() => !currentRouteId.value && currentRouteMode.value !== 'edit' && currentRouteMode.value !== 'view');
const isEditMode = computed(() => !!currentRouteId.value && currentRouteMode.value === 'edit');
const isViewMode = computed(() => !!currentRouteId.value && currentRouteMode.value === 'view');

const pageTitle = computed(() => {
  if (isEditMode.value) return '编辑入库单';
  if (isViewMode.value) return '入库单详情';
  return '新建入库单';
});

// 控制是否可以编辑表单内容或添加/删除行
const canAddOrEditLines = computed(() => isCreateMode.value || (isEditMode.value && formHeader.status === 'PENDING'));
const canConfirmComplete = computed(() => (isEditMode.value || isViewMode.value) && formHeader.status === 'PENDING' && formLines.value.length > 0);


const headerRules = reactive({
  creation_time: [{ required: true, message: '请选择创建时间', trigger: 'change' }],
  notes: [{ max: 255, message: '备注长度不能超过255个字符', trigger: 'blur' }],
});

const inboundStatusOptions = [
  { value: 'PENDING', label: '待处理' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' },
];

const getInboundStatusText = (statusValue) => {
  const option = inboundStatusOptions.find(opt => opt.value === statusValue);
  return option ? option.label : statusValue;
};

const _formatDateTimeToString = (dateObj) => {
    if (!dateObj) return null;
    const date = new Date(dateObj);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const resetForm = () => {
  Object.assign(formHeader, initialFormHeaderState());
  formLines.value = [];
  formHeader.creation_time = _formatDateTimeToString(new Date()); // 确保重置时时间也是最新的
  nextTick(() => {
    if (inboundOrderFormRef.value) {
      inboundOrderFormRef.value.clearValidate();
    }
  });
};

const loadCreatorInfo = () => {
  if (userStore.currentUser) {
    formHeader.creatorId = userStore.currentUser.id || userStore.currentUser.userId;
    formHeader.creatorName = userStore.currentUser.fullName || userStore.currentUser.username || '未知用户';
  } else {
    formHeader.creatorName = '获取中...'; // 异步获取的情况可以先占位
     // 如果 store 中没有，可以尝试调用API，但新建时通常用当前登录用户
    userStore.fetchUserInfo().then(() => {
        formHeader.creatorId = userStore.currentUser?.id || userStore.currentUser?.userId;
        formHeader.creatorName = userStore.currentUser?.fullName || userStore.currentUser?.username || '加载失败';
    }).catch(() => {
        formHeader.creatorName = '加载创建人失败';
    });
  }
};


const loadInboundOrderData = async (orderId) => {
  if (!orderId) {
    resetForm();
    if (isCreateMode.value) { // 只有在确实是新建模式时才加载创建人
        loadCreatorInfo();
    }
    return;
  }
  pageLoading.value = true;
  try {
    const response = await getInboundOrderDetail(orderId);
    if (response.code === 200 && response.data) {
      resetForm(); // 先重置
      Object.assign(formHeader, response.data); // 再赋值
      formLines.value = (response.data.items || []).map(item => ({
        ...item,
        // 确保 quantity_to_putaway 是数字
        quantity_to_putaway: Number(item.quantity_to_putaway) || 0,
        // _maxCanPutawayFromDialog 用于在编辑时限制数量，但入库单明细数量通常在创建时确定
        // 如果编辑时允许修改数量，需要额外逻辑来确定其最大值（通常是原值，除非关联的PO有变动）
        _maxCanPutawayFromDialog: Number(item.quantity_to_putaway) || Number.MAX_SAFE_INTEGER,
        // 从API获取的明细行应该有 purchase_order_no 或类似字段
        purchase_order_no: item.purchase_order_no || item.poNumber || '' 
      }));
      // 如果表头没有创建人信息，且是编辑或查看，尝试补充（通常API应返回完整信息）
      if (!formHeader.creatorName && formHeader.creatorId) {
          // 理想情况是API直接返回creatorName
          // 如果没有，可以根据creatorId去查询用户，但这会增加复杂性
          // 此处假设API返回时creatorName已存在或业务上不需要再查
      }
    } else {
      ElMessage.error(response.message || '获取入库单详情失败');
      router.push({ name: 'InboundOrderList' });
    }
  } catch (error) {
    console.error('获取入库单详情错误:', error);
    ElMessage.error('获取入库单详情时发生网络错误');
    router.push({ name: 'InboundOrderList' });
  } finally {
    pageLoading.value = false;
  }
};


// 使用 onActivated 确保组件被 keep-alive 缓存后，每次进入都刷新数据（如果ID变了或模式变了）
onActivated(() => {
  console.log('[CreateInboundOrder] Activated. Route ID:', currentRouteId.value, 'Route Mode:', currentRouteMode.value);
  // 检查路由参数是否真的改变了，或者是否从列表页强制刷新
  if (currentRouteId.value) {
      if (formHeader.id !== currentRouteId.value || currentRouteMode.value !== (props.mode || route.query.mode)) {
         loadInboundOrderData(currentRouteId.value);
      } else if (isViewMode.value || isEditMode.value) { // 如果ID和模式没变，但可能是从其他地方返回，也刷新下
          loadInboundOrderData(currentRouteId.value);
      }
  } else if (isCreateMode.value) { // 如果是新建模式，确保表单是初始状态
      resetForm();
      loadCreatorInfo();
  }
});

onMounted(() => {
  console.log('[CreateInboundOrder] Mounted. Route ID:', currentRouteId.value, 'Route Mode:', currentRouteMode.value);
  if (currentRouteId.value) {
    loadInboundOrderData(currentRouteId.value);
  } else { // 新建模式
    resetForm();
    loadCreatorInfo();
  }
});


// 监听路由参数变化，用于编辑/查看不同ID的单据
watch([() => route.params.id, () => route.query.mode], ([newId, newModeParam], [oldId, oldModeParam]) => {
    const newMode = props.mode || newModeParam;
    const oldMode = props.mode || oldModeParam; // oldMode 应该基于之前的 props.mode 或 route.query.mode

    console.log(`[CreateInboundOrder] Watch route params/query. ID: ${oldId} -> ${newId}, Mode: ${oldMode} -> ${newMode}`);
    if (newId && (newId !== oldId || newMode !== oldMode)) {
        loadInboundOrderData(newId);
    } else if (!newId && isCreateMode.value) { // 从有ID的页面跳转到新建页面
        resetForm();
        loadCreatorInfo();
    }
}, { immediate: false }); // immediate: false 因为 onMounted 和 onActivated 会处理初始加载


// 汇总关联的采购单号
watch(formLines, (newItems) => {
  const poNumbers = new Set(newItems.map(item => item.purchase_order_no || item.poNumber).filter(Boolean));
  formHeader.related_purchase_order_nos = Array.from(poNumbers).join(', ');
}, { deep: true });

const existingPoLineIdsInForm = computed(() => {
  return formLines.value.map(item => item.purchaseOrderLineId || item.purchase_order_line_id).filter(Boolean);
});

const handleOpenSelectPoLinesDialog = () => {
  selectPoLinesDialogVisible.value = true;
};

const handleAddPoLinesFromDialog = (selectedPoLines) => {
  if (selectedPoLines && selectedPoLines.length > 0) {
    selectedPoLines.forEach(poLine => {
      const existingItem = formLines.value.find(
        item => (item.purchaseOrderLineId || item.purchase_order_line_id) === poLine.purchaseOrderLineId
      );
      if (!existingItem) {
        formLines.value.push({
          purchaseOrderLineId: poLine.purchaseOrderLineId,
          purchase_order_no: poLine.poNumber, // 确保字段名统一
          productId: poLine.productId,
          productCode: poLine.productCode,
          productName: poLine.productName,
          specification: poLine.specification,
          unit: poLine.unit,
          quantity_to_putaway: Number(poLine.quantityToPutaway) || 0, // 从弹窗获取
           // 记录从弹窗带过来的最大可入库数量，用于InputNumber的max属性
          _maxCanPutawayFromDialog: Number(poLine.quantityToPutaway) || Number.MAX_SAFE_INTEGER 
        });
      } else {
        ElMessage.warning(`采购明细 ${poLine.productName} (PO: ${poLine.poNumber}) 已存在。`);
      }
    });
  }
  selectPoLinesDialogVisible.value = false;
};

const handleRemoveItem = (index) => {
  formLines.value.splice(index, 1);
};

const handleItemQuantityChange = (row, index) => {
  if (row.quantity_to_putaway <= 0 && canAddOrEditLines.value) {
    ElMessageBox.confirm(`商品 "${row.productName}" 的入库数量为0，是否要移除该明细行？`, '提示', {
      confirmButtonText: '移除',
      cancelButtonText: '保留',
      type: 'warning',
    }).then(() => {
      handleRemoveItem(index);
    }).catch(() => {
      row.quantity_to_putaway = 0.01; // 或者恢复到之前的值
    });
  }
  // 检查是否超过从弹窗带过来的最大可入库量
  if (row._maxCanPutawayFromDialog !== undefined && row.quantity_to_putaway > row._maxCanPutawayFromDialog) {
      ElMessage.warning(`商品 "${row.productName}" 的入库数量已超过其来源采购明细的可入库上限 (${row._maxCanPutawayFromDialog})。请调整。`);
      // row.quantity_to_putaway = row._maxCanPutawayFromDialog; // 可以选择自动修正
  }
};

const preparePayload = (action = 'submit') => { // action可以是 'submit', 'update', 'complete'
  const payload = {
    ...formHeader,
    id: currentRouteId.value || formHeader.id, // 确保编辑时有ID
    items: formLines.value.map(item => ({
      // 确保字段名与后端API定义一致
      purchase_order_line_id: item.purchaseOrderLineId || item.purchase_order_line_id,
      product_id: item.productId,
      // productCode, productName等信息后端应能通过product_id获取，通常不需重复提交
      // 但如果API需要，则添加
      productCode: item.productCode,
      productName: item.productName,
      specification: item.specification,
      unit: item.unit,
      quantity_to_putaway: Number(item.quantity_to_putaway),
      // 如果是更新明细，可能需要传递明细行自己的ID (如果后端是分别更新)
      // id: item.id 
    })),
  };
  
  // 根据操作类型调整status
  if (action === 'submit' && isCreateMode.value) {
      payload.status = 'PENDING';
  } else if (action === 'update' && isEditMode.value) {
      payload.status = formHeader.status; // 编辑时，状态通常由其他操作改变，保存时不直接改变
  } else if (action === 'complete') {
      payload.status = 'COMPLETED';
  }

  // 移除不必要的临时字段
  payload.items.forEach(item => {
    delete item._maxCanPutawayFromDialog;
  });
  delete payload.creatorName; // 通常由后端根据creatorId填充或记录
  // putaway_order_no 在创建时由后端生成，编辑时只读

  return payload;
};


const handleSubmitInboundOrder = async () => { // 新建提交
  if (!inboundOrderFormRef.value) return;
  await inboundOrderFormRef.value.validate(async (valid) => {
    if (valid) {
      if (formLines.value.length === 0) {
        ElMessage.warning('请至少添加入库商品明细。');
        return;
      }
      const hasInvalidQuantity = formLines.value.some(item => !(Number(item.quantity_to_putaway) > 0));
      if (hasInvalidQuantity) {
        ElMessage.warning('所有明细的本次入库数量必须大于0。');
        return;
      }

      submitLoading.value = true;
      try {
        const payload = preparePayload('submit');
        // 确保 creatorId 在提交时被正确设置
        if (!payload.creatorId && userStore.currentUser) {
            payload.creatorId = userStore.currentUser.id || userStore.currentUser.userId;
        } else if (!payload.creatorId) {
            ElMessage.error('无法获取创建人信息，请刷新页面或重新登录。');
            submitLoading.value = false;
            return;
        }

        const response = await createInboundOrder(payload);
        if (response.code === 200) {
          ElMessage.success('入库单提交成功！');
          goBackToList();
        } else {
          ElMessage.error(response.message || '提交失败');
        }
      } catch (error) {
        console.error('提交入库单错误:', error);
        ElMessage.error('提交入库单时发生网络错误');
      } finally {
        submitLoading.value = false;
      }
    } else {
      ElMessage.error('表单校验失败，请检查输入项。');
    }
  });
};

const handleUpdateInboundOrder = async () => { // 编辑保存
  if (!inboundOrderFormRef.value) return;
  await inboundOrderFormRef.value.validate(async (valid) => {
    if (valid) {
      if (formLines.value.length === 0) {
        ElMessage.warning('请至少添加入库商品明细。');
        return;
      }
       const hasInvalidQuantity = formLines.value.some(item => !(Number(item.quantity_to_putaway) > 0));
      if (hasInvalidQuantity) {
        ElMessage.warning('所有明细的本次入库数量必须大于0。');
        return;
      }
      submitLoading.value = true;
      try {
        const payload = preparePayload('update');
        const response = await updateInboundOrder(formHeader.id, payload);
        if (response.code === 200) {
          ElMessage.success('入库单修改成功！');
          goBackToList();
        } else {
          ElMessage.error(response.message || '修改失败');
        }
      } catch (error) {
        console.error('修改入库单错误:', error);
        ElMessage.error('修改入库单时发生网络错误');
      } finally {
        submitLoading.value = false;
      }
    } else {
      ElMessage.error('表单校验失败，请检查输入项。');
    }
  });
};

const handleConfirmPutawayComplete = async () => {
  if (formHeader.status !== 'PENDING') {
    ElMessage.warning(`订单状态为【${getInboundStatusText(formHeader.status)}】，无法执行此操作。`);
    return;
  }
   if (formLines.value.length === 0) {
        ElMessage.warning('请至少添加入库商品明细。');
        return;
    }
    const hasInvalidQuantity = formLines.value.some(item => !(Number(item.quantity_to_putaway) > 0));
    if (hasInvalidQuantity) {
    ElMessage.warning('所有明细的本次入库数量必须大于0才能完成入库。');
    return;
    }

  ElMessageBox.confirm('确定所有商品已按明细数量完成上架入库吗？此操作将更新库存。', '确认入库完成', {
    confirmButtonText: '确定完成',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    submitLoading.value = true;
    try {
      const payload = preparePayload('complete'); // action 'complete' 会设置status为COMPLETED
      const response = await updateInboundOrder(formHeader.id, payload);
      if (response.code === 200) {
        ElMessage.success('确认入库完成操作成功！库存已更新。');
        // 更新当前页面的状态，并变为只读
        formHeader.status = response.data?.status || 'COMPLETED';
        if (response.data?.items) { // 如果API返回了更新后的items
            formLines.value = response.data.items.map(item => ({
                ...item,
                quantity_to_putaway: Number(item.quantity_to_putaway)
            }));
        }
         // 可以选择刷新页面或导航到详情页（只读模式）
        // loadInboundOrderData(formHeader.id); // 重新加载以获取最新状态和数据
        // router.replace({ name: 'InboundOrderDetail', params: { id: formHeader.id }, query: { mode: 'view'} });
        // 为简单起见，也可以直接返回列表
        goBackToList();

      } else {
        ElMessage.error(response.message || '确认入库完成失败。');
      }
    } catch (error) {
      console.error('确认入库完成错误:', error);
      ElMessage.error('确认入库完成时发生网络错误。');
    } finally {
      submitLoading.value = false;
    }
  }).catch(() => {
    // 用户取消
  });
};


let initialFormStateSnapshot = '{}'; // 初始化为空JSON字符串

// 更新快照的时机：数据加载完成时（编辑/查看模式）或表单重置后（新建模式）
watch([formHeader, formLines], () => {
    if (!pageLoading.value) { // 确保不是在加载数据时频繁更新快照
        initialFormStateSnapshot = JSON.stringify({ header: formHeader, lines: formLines.value });
    }
}, { deep: true, immediate: false }); // immediate false, 等待首次加载/重置后手动设置

// 手动设置初始快照
const setInitialSnapshot = () => {
    initialFormStateSnapshot = JSON.stringify({ header: formHeader, lines: formLines.value });
};
// 在 onMounted 和 loadInboundOrderData 成功后, 以及 resetForm 后调用 setInitialSnapshot
onMounted(() => {
  // ...
  if (currentRouteId.value) {
    // loadInboundOrderData(currentRouteId.value).then(setInitialSnapshot); // 异步加载后设置
  } else {
    // resetForm();
    // loadCreatorInfo();
    setInitialSnapshot(); // 新建模式下立即设置
  }
});
// 修改 loadInboundOrderData 成功回调中也设置快照
// 修改 resetForm 后也设置快照


function hasChanges() {
  if (isViewMode.value) return false;
  const currentStateSnapshot = JSON.stringify({ header: formHeader, lines: formLines.value });
  return currentStateSnapshot !== initialFormStateSnapshot;
}

const handleCancel = () => {
  if (!isViewMode.value && hasChanges()) {
    ElMessageBox.confirm('表单内容有更改且尚未保存，确定要离开吗？', '提示', {
      confirmButtonText: '确定离开',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      goBackToList();
    }).catch(() => {});
  } else {
    goBackToList();
  }
};

const goBackToList = () => {
  // 使用 router.replace 防止在浏览器历史中留下当前未完成的表单页
  // 如果是从列表页跳转过来的，可以用 router.back()
  router.push({ name: 'InboundOrderList' }); // 假设列表页的路由名称
};

</script>

<style scoped>
.page-container {
  padding-bottom: 80px; /* 为固定的底部操作栏留出空间 */
}
/* section-title 和 page-actions-footer.fixed 的样式应已在 global.css 定义 */
.empty-items-placeholder {
  text-align: center;
  color: var(--font-color-light);
  padding: 20px;
  border: 1px dashed var(--border-color);
  margin-top: 10px;
  border-radius: 4px;
}
.el-form-item {
   margin-bottom: 18px; /* 参考出库单 */
}
</style>