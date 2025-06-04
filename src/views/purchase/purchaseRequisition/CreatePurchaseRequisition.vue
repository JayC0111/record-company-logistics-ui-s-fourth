<template>
  <div class="create-purchase-requisition-page" v-loading="pageLoading">
    <div class="content-section-card">
      <h3 class="section-title">
        {{ pageTitle }}
        <el-button @click="handleCancel" :icon="ArrowLeft" v-if="!isApproveMode">
          {{ (isViewMode || isEditMode) ? '返回列表' : '取消' }}
        </el-button>
      </h3>
      <el-form
        :model="formHeader"
        :rules="headerRules"
        ref="headerFormRef"
        label-width="100px"
        label-position="right"
        :disabled="isViewMode || isApproveMode"
      >
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="计划单号:">
              <el-input v-model="formHeader.requisition_no" placeholder="保存后自动生成" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="申请日期:" prop="request_date">
              <el-date-picker
                v-model="formHeader.request_date"
                type="date"
                placeholder="选择申请日期"
                style="width: 100%;"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled="isViewMode || isApproveMode"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="申请人:" prop="requesterName">
              <el-input v-model="formHeader.requesterName" placeholder="加载中..." readonly disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="申请部门:" prop="request_department">
              <el-input v-model="formHeader.request_department" placeholder="请输入申请部门" :disabled="isViewMode || isApproveMode" />
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="采购用途:" prop="purpose">
              <el-input v-model="formHeader.purpose" type="textarea" :rows="1" placeholder="请输入采购用途" :disabled="isViewMode || isApproveMode" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
           <el-col :span="8" v-if="formHeader.id || isViewMode || isApproveMode">
             <el-form-item label="单据状态:">
               <el-input :value="getStatusText(formHeader.status) || '未保存'" placeholder="保存后更新" disabled />
             </el-form-item>
           </el-col>
           <el-col :span="isViewMode || isApproveMode || formHeader.id ? 16 : 24">
             <el-form-item label="备注:" prop="notes">
               <el-input v-model="formHeader.notes" type="textarea" :rows="1" placeholder="请输入备注信息" :disabled="isViewMode || (isApproveMode && isApprovalActionPositive)" />
             </el-form-item>
           </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="content-section-card">
      <h3 class="section-title">
        <span>采购计划-商品明细</span>
        <div v-if="!isViewMode && !isApproveMode">
          <el-button type="primary" :icon="Plus" @click="openProductSelector">添加商品</el-button>
        </div>
      </h3>
      <el-table :data="formLines" border style="width: 100%">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="productCode" label="商品编码" width="140" />
        <el-table-column prop="productName" label="商品名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="specification" label="规格型号" width="140" />
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column label="需求数量" width="150" align="right">
          <template #default="{ row }">
            <el-input-number
              v-model="row.estimated_quantity"
              :step="1" :min="1"
              controls-position="right"
              style="width: 100%;"
              @change="() => calculateLineTotal(row)"
              :disabled="isViewMode || isApproveMode"
            />
          </template>
        </el-table-column>
        <el-table-column label="预估单价" width="150" align="right">
          <template #default="{ row }">
            <el-input-number
              v-model="row.estimated_unit_price"
              :precision="2" :step="0.01" :min="0"
              controls-position="right"
              style="width: 100%;"
              @change="() => calculateLineTotal(row)"
              :disabled="isViewMode || isApproveMode"
            />
          </template>
        </el-table-column>
        <el-table-column prop="estimatedAmount" label="预估金额" width="150" align="right">
          <template #default="{ row }">
            {{ formatCurrency(row.estimatedAmount) }}
          </template>
        </el-table-column>
        <el-table-column label="建议供应商" min-width="180">
            <template #default="{ row, $index }">
            <el-input
                v-if="isViewMode || isApproveMode"
                v-model="row.suggestedSupplierName"
                placeholder="无建议"
                readonly
                disabled
            />
            <el-input 
                v-else 
                v-model="row.suggestedSupplierName" 
                placeholder="点击选择供应商" 
                readonly 
                @click="openSupplierSelector($index)">
                <template #append>
                    <el-button :icon="Search" @click="openSupplierSelector($index)" />
                </template>
            </el-input>
            </template>
        </el-table-column>
        <el-table-column label="行备注" width="180">
            <template #default="{ row }">
            <el-input v-model="row.line_notes" placeholder="明细备注" :disabled="isViewMode || isApproveMode" />
            </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center" fixed="right" v-if="!isViewMode && !isApproveMode">
          <template #default="{ $index }">
            <el-button type="danger" link :icon="Delete" @click="handleDeleteProduct($index)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无商品明细，请点击“添加商品”按钮" />
        </template>
      </el-table>
      <div class="table-summary-footer">
        <span>合计预估金额：<span class="total-amount-value">{{ formatCurrency(totalEstimatedAmount) }}</span></span>
        <span>总需求数量/条目：{{ totalEstimatedQuantity }} / {{ formLines.length }} 条</span>
      </div>

      <div v-if="isApproveMode" class="approval-section content-section-card" style="margin-top: 20px;">
        <h3 class="section-title">采购计划审批</h3>
        <el-form label-width="100px" :model="approvalData" :rules="approvalRules" ref="approvalFormRef">
          <el-form-item label="审批意见:" prop="comment">
            <el-input
              v-model="approvalData.comment"
              type="textarea"
              :rows="3"
              placeholder="请输入审批意见（审批不通过时建议填写）"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="success" @click="handlePerformApproval(true)" :loading="loading">批准</el-button>
            <el-button type="danger" @click="handlePerformApproval(false)" :loading="loading">拒绝</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="page-actions-footer modified-actions-footer">
        <el-button @click="handleCancel">
          {{ (isViewMode || isApproveMode || isEditMode) ? '返 回' : '取 消' }}
        </el-button>
        <template v-if="!isViewMode && !isApproveMode">
          <el-button class="btn-save-draft" @click="handleSaveDraft" :loading="loading">保存草稿</el-button>
          <el-button
            type="primary"
            @click="handleSubmitForApproval"
            :loading="loading"
            v-if="!formHeader.id || formHeader.status === 'DRAFT' || formHeader.status === 'REJECTED'"
          >提交审批</el-button>
        </template>
      </div>
    </div>

    <ProductSelectorDialog
      v-if="productSelectorVisible"
      v-model:visible="productSelectorVisible"
      @select="handleProductSelect" 
      :multiple="true"
    />
    <SupplierSelectorDialog
      v-if="supplierSelectorVisible"
      v-model:visible="supplierSelectorVisible"
      @select="handleSupplierSelect"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick, defineProps, onActivated } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Delete, Search, ArrowLeft } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/modules/auth'; // 修改了路径，与CreateSalesOrder一致

import ProductSelectorDialog from '@/components/shared/ProductSelectorDialog.vue';
import SupplierSelectorDialog from '@/components/shared/SupplierSelectorDialog.vue'; // 假设此组件存在

import { 
  createPurchaseRequisition, 
  getPurchaseRequisitionDetail, 
  updatePurchaseRequisition,
  submitPurchaseRequisition, // 用于提交审批
  approvePurchaseRequisition // 用于审批操作
} from '@/api/purchaseRequisition';

defineOptions({
  name: 'CreatePurchaseRequisition' // 与文件名一致
});

const props = defineProps({
  mode: String, // create, edit, view, approve (approve 模式用于展示审批界面)
  id: String    // 从路由获取的ID，用于 edit/view/approve 模式
});

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const headerFormRef = ref(null);
const approvalFormRef = ref(null); // 审批表单的引用

const loading = ref(false); // 通用按钮加载状态
const pageLoading = ref(false); // 页面加载状态

// 审批相关数据
const approvalData = reactive({ comment: '' });
const isApprovalActionPositive = ref(true); // 用于判断审批意见是否必填

const isViewMode = computed(() => props.mode === 'view');
const isEditMode = computed(() => props.id && props.mode === 'edit'); // 使用 props.id
const isCreateMode = computed(() => !props.id && props.mode === 'create');
const isApproveMode = computed(() => props.id && props.mode === 'approve' && formHeader.status === 'PENDING_APPROVAL');


const initialFormHeaderState = () => ({
  id: null,
  requisition_no: '',
  request_date: new Date().toISOString().slice(0, 10),
  requester_id: userStore.currentUser?.id || '',
  requesterName: userStore.currentUser?.fullName || userStore.currentUser?.username || '',
  request_department: userStore.currentUser?.department || '', // 假设用户信息包含部门
  purpose: '',
  notes: '',
  status: 'DRAFT',
  totalEstimatedAmount: 0,
});

const formHeader = reactive(initialFormHeaderState());
const formLines = ref([]);

const headerRules = {
  request_date: [{ required: true, message: '请选择申请日期', trigger: 'change' }],
  requesterName: [{ required: true, message: '申请人信息加载失败或未设置', trigger: 'blur' }],
  request_department: [{ required: true, message: '请输入申请部门', trigger: 'blur' }],
  purpose: [{ required: true, message: '请输入采购用途', trigger: 'blur' }],
};

const approvalRules = reactive({
    comment: [{ 
        required: computed(() => isApproveMode.value && !isApprovalActionPositive.value), // 拒绝时必填
        message: '拒绝采购计划时，请输入审批意见', 
        trigger: 'blur' 
    }]
});

const purchaseRequisitionStatusOptions = [
  { value: 'DRAFT', label: '草稿' },
  { value: 'PENDING_APPROVAL', label: '待审批' },
  { value: 'APPROVED', label: '已批准' },
  { value: 'REJECTED', label: '已拒绝' },
  { value: 'PARTIALLY_CONVERTED', label: '部分转单' }, // 假设有这些状态
  { value: 'FULLY_CONVERTED', label: '已转单' },
  { value: 'CANCELLED', label: '已取消' }
];

const getStatusText = (statusValue) => {
  const option = purchaseRequisitionStatusOptions.find(opt => opt.value === statusValue);
  return option ? option.label : statusValue;
};

const productSelectorVisible = ref(false);
const supplierSelectorVisible = ref(false);
const currentEditingItemIndex = ref(-1);

// 统一的路由名称，用于判断组件是否应该响应路由变化
const relevantRouteNames = ['CreatePurchasePlan', 'EditPurchasePlan', 'PurchasePlanDetail', 'ApprovePurchasePlan']; // 假设审批路由

const resetFormForCreate = () => {
  Object.assign(formHeader, initialFormHeaderState());
  formLines.value = [];
  approvalData.comment = '';
  isApprovalActionPositive.value = true; // 重置审批意图
  nextTick(() => {
    if (headerFormRef.value) headerFormRef.value.clearValidate();
    if (approvalFormRef.value) approvalFormRef.value.clearValidate();
  });
};

const loadRequesterInfo = () => { // 类似 loadSalespersonInfo
  if (userStore.currentUser && userStore.currentUser.id) {
    formHeader.requester_id = userStore.currentUser.id;
    formHeader.requesterName = userStore.currentUser.fullName || userStore.currentUser.username;
    formHeader.request_department = formHeader.request_department || userStore.currentUser?.department || ''; // 优先保留已填写的部门
    nextTick(() => {
      if (headerFormRef.value && formHeader.requesterName) {
        headerFormRef.value.clearValidate('requesterName');
      }
    });
  } else {
    ElMessage.warning('无法获取当前用户信息，申请人信息可能不正确。');
  }
};


const loadRequisitionData = async (requisitionId) => {
  if (!requisitionId) {
    resetFormForCreate();
    loadRequesterInfo();
    return;
  }
  pageLoading.value = true;
  try {
    const res = await getPurchaseRequisitionDetail(requisitionId);
    if (res.code === 200 && res.data) {
      resetFormForCreate(); // 先重置，再赋值
      Object.assign(formHeader, res.data);
      formHeader.totalEstimatedAmount = Number(res.data.totalEstimatedAmount) || 0;
      // 确保申请人信息在加载后如果为空，则尝试从store填充
      if (!formHeader.requesterName && formHeader.requester_id === userStore.currentUser?.id) {
        formHeader.requesterName = userStore.currentUser?.fullName || userStore.currentUser?.username;
      }


      formLines.value = (res.data.items || []).map(item => {
        const quantity = Number(item.estimated_quantity) || 0;
        const price = Number(item.estimated_unit_price) || 0;
        return { 
          ...item, 
          estimated_quantity: quantity,
          estimated_unit_price: price,
          estimatedAmount: parseFloat((quantity * price).toFixed(2))
        };
      });
      const calculatedTotalFromLines = formLines.value.reduce((sum, item) => sum + (item.estimatedAmount || 0), 0);
      if (Math.abs(formHeader.totalEstimatedAmount - calculatedTotalFromLines) > 0.001 && calculatedTotalFromLines !==0 ) {
        formHeader.totalEstimatedAmount = parseFloat(calculatedTotalFromLines.toFixed(2));
      } else if (formHeader.totalEstimatedAmount === 0 && calculatedTotalFromLines !== 0) {
         formHeader.totalEstimatedAmount = parseFloat(calculatedTotalFromLines.toFixed(2));
      }

    } else { 
      ElMessage.error(res.message || '加载采购计划单数据失败'); 
    }
  } catch (error) { 
    console.error("加载采购计划单数据失败:", error); 
    ElMessage.error(error.message || '加载数据时发生错误'); 
  } 
  finally { pageLoading.value = false; }
};


onMounted(() => {
  const currentId = props.id || route.params.id;
  if (relevantRouteNames.includes(route.name)) {
    if (currentId && (props.mode === 'edit' || props.mode === 'view' || props.mode === 'approve')) {
      loadRequisitionData(currentId);
    } else {
      resetFormForCreate();
      loadRequesterInfo();
    }
  }
});

onActivated(() => {
  const currentId = props.id || route.params.id;
   if (relevantRouteNames.includes(route.name)) {
    if (currentId && (props.mode === 'edit' || props.mode === 'view' || props.mode === 'approve')) {
      loadRequisitionData(currentId);
    } else if (!currentId && (props.mode === 'create' || !props.mode)) {
      resetFormForCreate();
      loadRequesterInfo();
    }
  }
});

watch(() => [props.id, props.mode, route.name, route.params.id], ([newIdProp, newMode, newRouteName, newIdParam]) => {
    const currentId = newIdProp || newIdParam;
    if (relevantRouteNames.includes(newRouteName)) {
        if (currentId && (newMode === 'edit' || newMode === 'view' || newMode === 'approve')) {
            loadRequisitionData(currentId);
        } else if (!currentId && (newMode === 'create' || !newMode)) {
            resetFormForCreate();
            loadRequesterInfo();
        }
    }
}, { deep: true, immediate: false }); // immediate: false to avoid double load on mount if props are set


const totalEstimatedAmount = computed(() => {
  if (formHeader.id && (isViewMode.value || isApproveMode.value || isEditMode.value)) {
    return Number(formHeader.totalEstimatedAmount) || 0;
  }
  return formLines.value.reduce((sum, item) => sum + (item.estimatedAmount || 0), 0);
});

const totalEstimatedQuantity = computed(() => {
  return formLines.value.reduce((sum, item) => sum + (Number(item.estimated_quantity) || 0), 0);
});

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '0.00';
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const calculateLineTotal = (row) => {
  if (typeof row.estimated_unit_price === 'number' && typeof row.estimated_quantity === 'number') {
    row.estimatedAmount = parseFloat((row.estimated_unit_price * row.estimated_quantity).toFixed(2));
  } else { row.estimatedAmount = 0; }
  if (!isViewMode.value && !isApproveMode.value) { 
      formHeader.totalEstimatedAmount = parseFloat(formLines.value.reduce((sum, item) => sum + (item.estimatedAmount || 0), 0).toFixed(2));
  }
};

const openProductSelector = () => { if (isViewMode.value || isApproveMode.value) return; productSelectorVisible.value = true; };

const handleProductSelect = (selectedItems) => {
  if (isViewMode.value || isApproveMode.value) return;
  if (selectedItems && selectedItems.length > 0) {
    selectedItems.forEach(product => { 
      if (formLines.value.some(item => item.product_id === product.id)) {
          ElMessage.warning(`商品 "${product.name}" 已在列表中。`);
          return;
      }
      formLines.value.push({ 
        // id: null, // 后端生成
        product_id: product.id, 
        productCode: product.productCode, 
        productName: product.name, 
        specification: product.specification, 
        unit: product.unit, 
        estimated_quantity: 1, 
        estimated_unit_price: Number(product.costPrice) || 0, // 使用成本价作为预估
        estimatedAmount: Number(product.costPrice) || 0,
        suggested_supplier_id: null,
        suggestedSupplierName: '',
        line_notes: ''
      }); 
    });
    if (!isViewMode.value && !isApproveMode.value) { 
      formHeader.totalEstimatedAmount = parseFloat(formLines.value.reduce((sum, item) => sum + (item.estimatedAmount || 0), 0).toFixed(2)); 
    }
  }
  productSelectorVisible.value = false;
};

const openSupplierSelector = (index) => {
    if (isViewMode.value || isApproveMode.value) return;
    currentEditingItemIndex.value = index;
    supplierSelectorVisible.value = true;
};
const handleSupplierSelect = (supplier) => {
    if (supplier && currentEditingItemIndex.value !== -1) {
        formLines.value[currentEditingItemIndex.value].suggested_supplier_id = supplier.id;
        formLines.value[currentEditingItemIndex.value].suggestedSupplierName = supplier.name;
    }
    currentEditingItemIndex.value = -1;
    supplierSelectorVisible.value = false;
};

const handleDeleteProduct = (index) => {
  if (isViewMode.value || isApproveMode.value) return;
  formLines.value.splice(index, 1);
  if (!isViewMode.value && !isApproveMode.value) { 
    formHeader.totalEstimatedAmount = parseFloat(formLines.value.reduce((sum, item) => sum + (item.estimatedAmount || 0), 0).toFixed(2)); 
  }
};

const validateFormsInternal = async () => { 
  if (isViewMode.value) return true; 
  // if (isApproveMode.value && isApprovalActionPositive.value) return true; // 批准时不对主表单校验

  let valid = false;
  if (headerFormRef.value) { try { await headerFormRef.value.validate(); valid = true; } catch (error) { valid = false; } } 
  else { return false; }
  if (!valid) return false;

  if (!isApproveMode.value && formLines.value.length === 0) { 
      ElMessage.warning('请至少添加一个商品到采购计划！'); return false; 
  }
  for (const item of formLines.value) { 
    if (!(Number(item.estimated_quantity) > 0)) { 
      ElMessage.warning(`商品 "${item.productName}" 的需求数量必须大于0！`); return false; 
    }
    if (item.estimated_unit_price === null || item.estimated_unit_price === undefined || Number(item.estimated_unit_price) < 0) {
      ElMessage.warning(`商品 "${item.productName}" 的预估单价无效！`); return false; 
    }
  }
  return true;
};

const preparePayload = () => { 
  const calculatedTotalAmount = parseFloat(formLines.value.reduce((sum, item) => sum + (item.estimatedAmount || 0), 0).toFixed(2));
  return {
    ...(formHeader.id && { id: formHeader.id }), 
    request_date: formHeader.request_date, 
    requester_id: formHeader.requester_id,
    requesterName: formHeader.requesterName, // 后端可能不需要，但前端表单有
    request_department: formHeader.request_department, 
    purpose: formHeader.purpose, 
    notes: formHeader.notes, 
    status: formHeader.status, // 提交审批时会覆盖
    totalEstimatedAmount: (isViewMode.value || isApproveMode.value) ? Number(formHeader.totalEstimatedAmount) : calculatedTotalAmount,
    items: formLines.value.map(line => ({ 
      ...(line.id && { id: line.id }), 
      product_id: line.product_id, 
      productCode: line.productCode, // 后端可能不需要
      productName: line.productName, // 后端可能不需要
      specification: line.specification, // 后端可能不需要
      unit: line.unit, // 后端可能不需要
      estimated_quantity: line.estimated_quantity, 
      estimated_unit_price: line.estimated_unit_price,
      suggested_supplier_id: line.suggested_supplier_id,
      suggestedSupplierName: line.suggestedSupplierName, // 后端可能不需要
      line_notes: line.line_notes
    })),
  };
};

const handleSaveDraft = async () => {
  if (isViewMode.value || isApproveMode.value) return;
  const isValid = await validateFormsInternal(); if (!isValid) return;
  
  const payload = preparePayload(); 
  payload.status = 'DRAFT'; 
  
  loading.value = true;
  try {
    let res;
    if (formHeader.id) { res = await updatePurchaseRequisition(formHeader.id, payload); } 
    else { res = await createPurchaseRequisition(payload); }
    if (res.code === 200 && res.data) {
      ElMessage.success(formHeader.id ? '采购计划草稿更新成功！' : '采购计划草稿已保存！');
      // 更新表单数据，特别是ID和单号
      Object.assign(formHeader, res.data); // 后端返回的数据可能更完整
      formLines.value = (res.data.items || []).map(item => { // 重新计算金额以防万一
          const qty = Number(item.estimated_quantity) || 0;
          const price = Number(item.estimated_unit_price) || 0;
          return {...item, estimatedAmount: parseFloat((qty * price).toFixed(2))};
      });
      formHeader.totalEstimatedAmount = parseFloat(formLines.value.reduce((sum, item) => sum + (item.estimatedAmount || 0), 0).toFixed(2));

      if (!props.id && res.data.id) { // 如果是新建后保存，更新路由以便后续操作是编辑
          router.replace({ name: 'EditPurchasePlan', params: { id: res.data.id }, query: { mode: 'edit'} });
      }

    } else { ElMessage.error(res.message || (formHeader.id ? '更新草稿失败' : '保存草稿失败')); }
  } catch (error) { console.error("保存/更新草稿失败:", error); ElMessage.error(error.message || '操作草稿时发生错误'); } 
  finally { loading.value = false; }
};

const handleSubmitForApproval = async () => {
  if (isViewMode.value || isApproveMode.value) return;
  const isValid = await validateFormsInternal(); if (!isValid) return;

  ElMessageBox.confirm( 
    (formHeader.id && formHeader.status !== 'DRAFT' && formHeader.status !== 'REJECTED')
      ? `计划单当前状态为【${getStatusText(formHeader.status)}】，确定要强制提交审批吗?` 
      : (formHeader.id ? '确定要提交此修改后的采购计划进行审批吗?' : '确定要提交此采购计划进行审批吗?'), 
    '提交确认', 
    { confirmButtonText: '确定提交', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    loading.value = true;
    try {
      let currentId = formHeader.id;
      // 如果是新建或草稿、已拒绝状态，先保存/更新一次，确保后端数据最新
      if (!formHeader.id || formHeader.status === 'DRAFT' || formHeader.status === 'REJECTED') {
        const draftPayload = preparePayload();
        draftPayload.status = 'DRAFT'; // 先保存为草稿
        const saveRes = formHeader.id 
                        ? await updatePurchaseRequisition(formHeader.id, draftPayload) 
                        : await createPurchaseRequisition(draftPayload);
        if (saveRes.code === 200 && saveRes.data) {
          currentId = saveRes.data.id; // 获取或确认ID
           Object.assign(formHeader, saveRes.data); // 更新表单数据
        } else {
          ElMessage.error(saveRes.message || '提交前保存草稿失败');
          loading.value = false;
          return;
        }
      }
      
      if (!currentId) {
          ElMessage.error('无法获取计划单ID，无法提交审批。');
          loading.value = false;
          return;
      }

      // 调用提交审批接口
      const submitRes = await submitPurchaseRequisition(currentId);
      if (submitRes.code === 200) { 
        ElMessage.success('采购计划已提交审批'); 
        router.push({ name: 'PurchasePlanList' }); // 假设列表页路由名
      } else { 
        ElMessage.error(submitRes.message || '提交审批失败'); 
        if (submitRes.data && submitRes.data.status) { // 如果后端返回了更新后的状态
            formHeader.status = submitRes.data.status;
        }
      }
    } catch (error) { 
      console.error("提交审批失败:", error); 
      ElMessage.error(error.message || '提交审批发生错误'); 
    } finally { 
      loading.value = false; 
    }
  }).catch(() => { 
    ElMessage.info('已取消提交'); 
  });
};

const handlePerformApproval = async (isApproved) => {
  if (!isApproveMode.value) return;
  isApprovalActionPositive.value = isApproved; 

  let approvalFormValid = true;
  if (approvalFormRef.value) { try { await approvalFormRef.value.validate(); } catch (e) { approvalFormValid = false; } }
  if (!approvalFormValid) return;

  const actionText = isApproved ? '批准' : '拒绝';
  try {
    await ElMessageBox.confirm(`确定要“${actionText}”此采购计划吗？`, '审批确认', { confirmButtonText: `确定${actionText}`, cancelButtonText: '取消', type: 'warning', });
    loading.value = true;
    // 注意：approvePurchaseRequisition API 需要的第二个参数是对象 { approved: boolean, comment: string }
    const res = await approvePurchaseRequisition(formHeader.id, { approved: isApproved, comment: approvalData.comment });
    if (res.code === 200 && res.data) {
      ElMessage.success(`采购计划已“${actionText}”`);
      // router.push({ name: 'PurchasePlanList' }); // 通常审批后返回列表
       loadRequisitionData(formHeader.id); // 重新加载以更新状态和可能的审批备注
       props.mode = 'view'; // 审批后切换到查看模式
    } else { ElMessage.error(res.message || '审批操作失败'); }
  } catch (error) { 
    if (error !== 'cancel') { 
      console.error("审批操作失败:", error); 
      ElMessage.error(error.message || '审批操作发生错误'); 
    } 
  } finally { 
    loading.value = false; 
  }
};


const handleCancel = () => { 
  // 根据当前模式决定是返回列表还是提示
  if (isViewMode.value || isApproveMode.value || isEditMode.value) {
    router.push({ name: 'PurchasePlanList' }); // 假设列表页路由名
  } else { // create mode
    if (formLines.value.length > 0 || formHeader.purpose || formHeader.request_department) { // 检查是否有未保存的更改
      ElMessageBox.confirm('表单内容尚未保存，确定要取消并返回列表吗？', '取消确认', {
        confirmButtonText: '确定返回',
        cancelButtonText: '继续编辑',
        type: 'warning'
      }).then(() => {
        router.push({ name: 'PurchasePlanList' });
      }).catch(() => {
        // User chose to continue editing
      });
    } else {
      router.push({ name: 'PurchasePlanList' });
    }
  }
};

const pageTitle = computed(() => {
  if (props.mode === 'edit') return '编辑采购计划单';
  if (props.mode === 'view') return '采购计划单详情';
  if (props.mode === 'approve') return '审批采购计划单';
  return '新建采购计划单';
});

</script>

<style scoped>
/* 与 CreateSalesOrder.vue 类似的样式 */
.create-purchase-requisition-page {
  /* 与CreateSalesOrder.vue的根元素class一致或类似 */
}
.el-form-item { 
  margin-bottom: 18px; 
}
.el-form-item .el-input, 
.el-form-item .el-select, 
.el-form-item .el-date-picker { 
  width: 100%; 
}
.table-summary-footer { 
  margin-top: 20px; 
  text-align: right; 
  font-size: 14px; 
  color: var(--font-color-secondary); /* 引用global.css中的变量 */
}
.table-summary-footer span + span { 
  margin-left: 30px; 
}
.total-amount-value { 
  font-weight: bold; 
  color: var(--error-color); /* 引用global.css中的变量 */
}
.page-actions-footer.modified-actions-footer { /* 确保类名与CreateSalesOrder.vue中一致 */
  margin-top: 20px; 
  padding-top: 20px; 
  border-top: 1px solid var(--border-color-light, #e4e7ed);
  padding-left: 0; 
  padding-right: 0;
  padding-bottom: 0;
  /* border-radius: 0 0 4px 4px; */ /* CreateSalesOrder.vue中没有这一行 */
  display: flex; 
  justify-content: flex-end; 
}
.page-actions-footer.modified-actions-footer .el-button + .el-button { 
  margin-left: 10px; 
}

.approval-section .el-form-item { 
  margin-bottom: 20px; 
}

/* 从 CreateSalesOrder.vue 借鉴的 section-title 样式 */
.content-section-card {
  background-color: var(--page-section-background, #ffffff);
  border-radius: 4px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
}
.content-section-card:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 16px; /* 与CreateSalesOrder.vue一致 */
  font-weight: 500;
  color: var(--page-section-title-color, var(--primary-color)); /* 引用global.css */
  margin: -4px 0 20px 0; /* 与CreateSalesOrder.vue一致 */
  padding-bottom: 16px; /* 与CreateSalesOrder.vue一致 */
  border-bottom: 1px solid var(--page-section-title-border-color, #e2e4eb); /* 引用global.css */
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>