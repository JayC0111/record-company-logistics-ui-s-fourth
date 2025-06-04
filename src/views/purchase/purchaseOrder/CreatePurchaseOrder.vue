<template>
  <div class="create-purchase-order-page" v-loading="pageLoading">
    <div class="content-section-card">
      <h3 class="section-title">采购单 - 表头信息</h3>
      <el-form :model="formHeader" :rules="headerRules" ref="headerFormRef" label-width="110px" label-position="right">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="采购单号:">
              <el-input v-model="formHeader.poNumber" placeholder="保存后自动生成" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="采购负责人:" prop="creatorName">
              <el-input v-model="formHeader.creatorName" placeholder="加载中..." readonly />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="下单日期:" prop="orderDate">
              <el-date-picker
                v-model="formHeader.orderDate"
                type="date"
                placeholder="选择或自动记录"
                style="width: 100%;"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                :disabled="isViewMode || !canEditHeader()"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="供应商:" prop="supplierName">
              <el-input
                v-model="formHeader.supplierName"
                placeholder="请选择供应商"
                readonly
                :disabled="isViewMode || !canEditHeader()" 
              >
                <template #append v-if="canEditHeader()">
                  <el-button :icon="Search" @click="openSelectSupplierDialog"></el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="联系电话:">
              <el-input v-model="formHeader.supplierPhone" placeholder="选择供应商后自动带入" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="供应商地址:">
              <el-input v-model="formHeader.supplierAddress" placeholder="选择供应商后自动带入" disabled type="textarea" :rows="1" autosize />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="采购单状态:">
              <el-input :value="getPurchaseStatusText(formHeader.status)" placeholder="保存后更新" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="16">
            <el-form-item label="备注:" prop="notes">
              <el-input
                v-model="formHeader.notes"
                type="textarea"
                :rows="1" 
                autosize
                placeholder="请输入备注信息"
                :disabled="isViewMode || isReceivingMode"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="content-section-card">
      <h3 class="section-title">
        <span>采购单 - 商品明细</span>
        <div v-if="isCreateMode || isEditMode"> 
          <el-button type="primary" :icon="DocumentAdd" @click="openSelectPurchaseRequisitionLineDialog">关联采购计划单明细</el-button>
          <el-button type="primary" :icon="Plus" @click="openProductSelectorDialog">添加商品</el-button>
        </div>
      </h3>
      <el-table :data="formLines" border style="width: 100%" empty-text="请通过“关联采购计划单明细”或“添加商品”按钮添加商品">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="sourceRequisitionNo" label="来源计划单" width="160" show-overflow-tooltip/>
        <el-table-column prop="productCode" label="商品编号" width="140" />
        <el-table-column prop="productName" label="商品名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="specification" label="规格型号" width="120" />
        <el-table-column prop="unit" label="单位" width="70" />
        <el-table-column prop="orderedQuantity" label="订购数量" width="120" align="right">
            <template #default="{ row }">
                <template v-if="isCreateMode || isEditMode">
                    <el-input-number
                        v-model="row.orderedQuantity"
                        :min="1"
                        :controls="false"
                        style="width: 100%"
                        @change="() => calculateLineTotal(row)"
                    />
                </template>
                <template v-else>{{ row.orderedQuantity }}</template>
            </template>
        </el-table-column>
        <el-table-column prop="unitPrice" label="采购单价" width="120" align="right">
            <template #default="{ row }">
                <template v-if="isCreateMode || isEditMode">
                    <el-input-number
                        v-model="row.unitPrice"
                        :min="0.01" 
                        :precision="2"
                        :controls="false"
                        style="width: 100%"
                        @change="() => calculateLineTotal(row)"
                    />
                </template>
                <template v-else>{{ row.unitPrice?.toFixed(2) }}</template>
            </template>
        </el-table-column>
        <el-table-column prop="lineTotal" label="行总金额" width="120" align="right">
            <template #default="{ row }">
                {{ row.lineTotal?.toFixed(2) }}
            </template>
        </el-table-column>
         <el-table-column prop="lineNotes" label="行备注" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
                <template v-if="isCreateMode || isEditMode">
                     <el-input v-model="row.lineNotes" placeholder="请输入行备注" />
                </template>
                <template v-else>{{ row.lineNotes }}</template>
            </template>
        </el-table-column>
        <el-table-column prop="receivedQuantity" label="已收货数量" width="120" align="right" />
        <el-table-column prop="putawayQuantity" label="已入库数量" width="120" align="right" />
        <el-table-column label="本次收货数量" width="150" align="right" v-if="isReceivingMode">
            <template #default="{ row }">
                <el-input-number
                    v-model="row.currentReceiveQuantity"
                    :min="0"
                    :max="Number(row.orderedQuantity) - Number(row.receivedQuantity)"
                    controls-position="right"
                    style="width: 100%"
                />
            </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center" fixed="right" v-if="isCreateMode || isEditMode">
          <template #default="{ $index }">
            <el-button type="danger" link :icon="Delete" @click="handleRemoveLine($index)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
        <div class="total-amount-display text-right mt-20">
          <span style="font-weight: bold;">总金额: </span>
          <span style="font-size: 18px; color: var(--primary-color);">¥ {{ calculateTotalAmount()?.toFixed(2) }}</span>
      </div>
    </div>

    <div class="page-actions-footer">
      <el-button @click="handleCancel">
        {{ (isViewMode || isReceivingMode) ? '返 回' : '取 消' }}
      </el-button>
      <el-button
        type="primary"
        @click="handleSubmitPurchaseOrder"
        v-if="isCreateMode && formLines.length > 0"
        :loading="loading"
      >确认采购单</el-button>
      <el-button
        type="primary"
        @click="handleUpdatePurchaseOrder"
        v-if="isEditMode && formLines.length > 0"
        :loading="loading"
      >保存修改</el-button>
      <el-button
        type="success"
        @click="handleConfirmReceipt"
        v-if="isReceivingMode"
        :loading="loading"
      >确认收货</el-button>
    </div>

    <SupplierSelectorDialog
      v-if="selectSupplierDialogVisible"
      v-model:visible="selectSupplierDialogVisible"
      @confirm="handleSupplierSelected"
    />

    <ProductSelectorDialog
      v-if="productSelectorDialogVisible"
      v-model:visible="productSelectorDialogVisible"
      @confirm="handleProductsSelected"
      :show-quantity-input="true"
      quantity-input-label="订购数量"
      :quantity-min="1"
      :quantity-default="1"
    />

    <PurchaseRequisitionLineSelectorDialog
      v-if="selectPurchaseRequisitionLineDialogVisible"
      v-model:visible="selectPurchaseRequisitionLineDialogVisible"
      @confirm="handlePurchaseRequisitionLinesSelected"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick, defineProps, onActivated } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Plus, DocumentAdd, Delete } from '@element-plus/icons-vue'; 
import { useUserStore } from '@/stores/modules/auth'; 

import SupplierSelectorDialog from '@/components/shared/SupplierSelectorDialog.vue'; 
import ProductSelectorDialog from '@/components/shared/ProductSelectorDialog.vue'; 
import PurchaseRequisitionLineSelectorDialog from '@/components/shared/SelectApprovedPRLinesDialog.vue'; 

import {
  createPurchaseOrder,
  getPurchaseOrderDetail,
  updatePurchaseOrder,
  confirmReceipt,
} from '@/api/purchaseOrder';
import { getSupplierDetail } from '@/api/supplier'; 

defineOptions({
  name: 'CreatePurchaseOrder'
});

const props = defineProps({
  id: String,
  mode: String
});

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const headerFormRef = ref(null);
const loading = ref(false);
const pageLoading = ref(false);

const selectSupplierDialogVisible = ref(false); 
const productSelectorDialogVisible = ref(false); 
const selectPurchaseRequisitionLineDialogVisible = ref(false); 

const initialFormHeaderState = () => ({
  id: null,
  poNumber: '',
  supplierId: null,
  supplierName: '',
  supplierPhone: '',
  supplierAddress: '',
  orderDate: null,
  totalAmount: 0,
  creatorId: '',
  creatorName: '',
  status: 'DRAFT', 
  notes: '',
});

const formHeader = reactive(initialFormHeaderState());
const formLines = ref([]);

const currentMode = computed(() => props.mode || route.query.mode);

const isCreateMode = computed(() => !props.id && currentMode.value !== 'edit' && currentMode.value !== 'view' && currentMode.value !== 'process');
const isEditMode = computed(() => !!props.id && currentMode.value === 'edit');
const isViewMode = computed(() => currentMode.value === 'view');
const isReceivingMode = computed(() => !!props.id && currentMode.value === 'process'); 

const headerRules = reactive({
  supplierName: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  orderDate: [{ required: true, message: '请选择下单日期', trigger: 'change' }],
  notes: [{ max: 255, message: '备注长度不能超过255个字符', trigger: 'blur' }]
});

const purchaseStatusOptions = [
    { value: 'DRAFT', label: '草稿' },
    { value: 'PENDING_APPROVAL', label: '待审批' }, 
    { value: 'APPROVED', label: '已批准' },
    { value: 'CONFIRMED', label: '已确认' }, 
    { value: 'PENDING_RECEIPT', label: '待收货' }, 
    { value: 'PARTIALLY_RECEIVED', label: '部分收货' },
    { value: 'FULLY_RECEIVED', label: '全部收货' },
    { value: 'FULLY_PUTAWAY', label: '全部入库' }, 
    { value: 'CANCELLED', label: '已取消' },
];

const getPurchaseStatusText = (statusValue) => {
    const option = purchaseStatusOptions.find(opt => opt.value === statusValue);
    return option ? option.label : statusValue;
};

// 调整：允许在创建和编辑模式下更改供应商和下单日期
const canEditHeader = () => isCreateMode.value || isEditMode.value;


const _formatDateToString = (dateObj) => {
    if (!dateObj) return null;
    const date = new Date(dateObj);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const resetForm = () => {
  console.log('[CreatePurchaseOrder.vue] resetForm called');
  Object.assign(formHeader, initialFormHeaderState());
  formLines.value = [];
  nextTick(() => { if (headerFormRef.value) headerFormRef.value.clearValidate(); });
};

const loadCreatorInfo = async () => {
  if (!isCreateMode.value && formHeader.creatorId && formHeader.creatorName) return;

  formHeader.creatorName = "加载中...";
  try {
    const currentUser = userStore.currentUser; 
    if (currentUser && currentUser.id) {
      formHeader.creatorId = currentUser.id;
      formHeader.creatorName = currentUser.fullName || currentUser.username;
    } else {
      formHeader.creatorName = "加载失败";
      if (isCreateMode.value) formHeader.creatorId = 'mock-creator-id'; 
    }
  } catch (error) {
    formHeader.creatorName = "加载异常";
    if (isCreateMode.value) formHeader.creatorId = 'mock-creator-id'; 
    console.error("Failed to load creator info for purchase order:", error);
  }
};

const loadPurchaseOrderData = async (orderId) => {
  if (!orderId) {
    resetForm();
    loadCreatorInfo();
    formHeader.orderDate = _formatDateToString(new Date());
    return;
  }
  pageLoading.value = true;
  console.log(`[CreatePurchaseOrder.vue] loadPurchaseOrderData for ID: ${orderId}, mode: ${currentMode.value}`);
  try {
    const res = await getPurchaseOrderDetail(orderId);
    console.log('[CreatePurchaseOrder.vue] API response for getPurchaseOrderDetail:', JSON.parse(JSON.stringify(res)));
    if (res.code === 200 && res.data) {
      resetForm();
      Object.assign(formHeader, {
        id: res.data.id,
        poNumber: res.data.po_number, 
        supplierId: res.data.supplier_id,
        supplierName: res.data.supplierName, 
        supplierPhone: res.data.supplierPhone || '', 
        supplierAddress: res.data.supplierAddress || '', 
        orderDate: res.data.order_date,
        totalAmount: res.data.total_amount,
        creatorId: res.data.creator_id,
        creatorName: res.data.creatorName, 
        status: res.data.status,
        notes: res.data.notes,
      });

      formLines.value = (res.data.items || []).map(item => ({
        id: item.id,
        purchaseRequisitionLineId: item.purchase_requisition_line_id, 
        productId: item.product_id,
        productCode: item.productCode, 
        productName: item.productName, 
        specification: item.specification, 
        unit: item.unit, 
        orderedQuantity: Number(item.ordered_quantity) || 0, 
        unitPrice: Number(item.unit_price) || 0, 
        lineTotal: (Number(item.ordered_quantity) * Number(item.unit_price)) || 0, 
        receivedQuantity: Number(item.received_quantity) || 0, 
        putawayQuantity: Number(item.putaway_quantity) || 0, 
        currentReceiveQuantity: 0, 
        lineNotes: item.line_notes || '', // 确保 lineNotes 被映射 
        sourceRequisitionNo: item.sourceRequisitionNo || '', 
      }));
      calculateTotalAmount(); 

      console.log('[CreatePurchaseOrder.vue] Purchase order data loaded. Header:', JSON.parse(JSON.stringify(formHeader)), 'Lines:', JSON.parse(JSON.stringify(formLines.value)));
    } else {
      ElMessage.error(res.message || '加载采购单数据失败');
      if (!props.id) router.push({ name: 'PurchaseOrderList' });
    }
  } catch (error) {
    console.error('加载采购单数据异常:', error);
    ElMessage.error(error.message || '加载采购单数据异常');
    if (!props.id) router.push({ name: 'PurchaseOrderList' });
  } finally { pageLoading.value = false; }
};

onMounted(() => {
  console.log('[CreatePurchaseOrder.vue] Mounted. Props ID:', props.id, 'Props mode:', props.mode, 'Route query mode:', route.query.mode);
  if (props.id) {
    loadPurchaseOrderData(props.id);
  } else {
    resetForm();
    loadCreatorInfo();
    formHeader.orderDate = _formatDateToString(new Date());
  }
});

onActivated(() => {
  console.log('[CreatePurchaseOrder.vue] Activated. Props ID:', props.id, 'Props mode:', props.mode, 'Route query mode:', route.query.mode);
  if (props.id) {
    console.log('[CreatePurchaseOrder.vue] Re-loading data due to activation for purchase order ID:', props.id);
    loadPurchaseOrderData(props.id);
  } else {
    console.log('[CreatePurchaseOrder.vue] Activated in create mode, ensuring form is reset and creator info loaded.');
    resetForm();
    loadCreatorInfo();
    formHeader.orderDate = _formatDateToString(new Date());
  }
});

watch(() => props.id, (newId, oldId) => {
  console.log(`[CreatePurchaseOrder.vue] Watch props.id changed from "${oldId}" to "${newId}", currentMode: ${currentMode.value}`);
  if (newId && newId !== oldId) {
    loadPurchaseOrderData(newId);
  } else if (!newId && oldId && isCreateMode.value) {
    resetForm();
    loadCreatorInfo();
    formHeader.orderDate = _formatDateToString(new Date());
  }
});

watch(currentMode, (newMode, oldMode) => {
  console.log(`[CreatePurchaseOrder.vue] Watch currentMode changed from "${oldMode}" to "${newMode}", ID: ${props.id}`);
  if (props.id && newMode !== oldMode && (newMode === 'view' || newMode === 'edit' || newMode === 'process')) {
    loadPurchaseOrderData(props.id);
  }
});

const openSelectSupplierDialog = () => {
  selectSupplierDialogVisible.value = true;
};

const openProductSelectorDialog = () => {
  console.log('Attempting to open ProductSelectorDialog'); 
  productSelectorDialogVisible.value = true;
};

const openSelectPurchaseRequisitionLineDialog = () => {
  selectPurchaseRequisitionLineDialogVisible.value = true;
};


const handleSupplierSelected = async (selectedSuppliers) => { // 参数名改为 selectedSuppliers (复数)
  if (selectedSuppliers && selectedSuppliers.length > 0) {
    const supplier = selectedSuppliers[0]; // 假设选择器返回的是数组
    formHeader.supplierId = supplier.id;
    formHeader.supplierName = supplier.name;
    
    pageLoading.value = true; 
    try {
        const res = await getSupplierDetail(supplier.id); 
        if (res.code === 200 && res.data) {
            formHeader.supplierPhone = res.data.phone || '';
            formHeader.supplierAddress = res.data.address || '';
        } else {
            ElMessage.warning(`获取供应商 ${supplier.name} 详情失败: ${res.message}`);
            formHeader.supplierPhone = supplier.phone || ''; 
            formHeader.supplierAddress = supplier.address || ''; 
        }
    } catch (error) {
        console.error("获取供应商详情异常:", error);
        ElMessage.error(`获取供应商详情异常: ${error.message}`);
        formHeader.supplierPhone = supplier.phone || ''; 
        formHeader.supplierAddress = supplier.address || ''; 
    } finally {
        pageLoading.value = false; 
    }
  }
  selectSupplierDialogVisible.value = false;
  nextTick(() => {
    headerFormRef.value?.validateField('supplierName').catch(() => {});
  });
};

const handleProductsSelected = (selectedProducts) => {
  console.log('[CreatePurchaseOrder.vue] handleProductsSelected received:', JSON.parse(JSON.stringify(selectedProducts)));
  if (!Array.isArray(selectedProducts)) {
    console.error('[CreatePurchaseOrder.vue] handleProductsSelected: selectedProducts is not an array!');
    ElMessage.error('选择商品数据格式错误。');
    productSelectorDialogVisible.value = false;
    return;
  }

  const newLinesToAdd = selectedProducts.map(product => {
    // 确保 product 对象包含必要的字段
    const quantity = Number(product.selectedQuantity) || 1;
    const price = Number(product.costPrice); // 允许采购单价为0，但最好有提示或校验
    
    console.log(`[CreatePurchaseOrder.vue] Processing product: ${product.name}, costPrice: ${product.costPrice}, selectedQuantity: ${product.selectedQuantity}`);
    
    if (isNaN(price)) {
        console.warn(`[CreatePurchaseOrder.vue] Product "${product.name}" has invalid costPrice: ${product.costPrice}. Defaulting unitPrice to 0.`);
    }

    return {
      id: null, 
      purchaseRequisitionLineId: null, 
      productId: product.id,
      productCode: product.productCode,
      productName: product.name,
      specification: product.specification,
      unit: product.unit,
      orderedQuantity: quantity, 
      unitPrice: isNaN(price) ? 0 : price, // 如果 costPrice 无效，则单价为0
      lineTotal: quantity * (isNaN(price) ? 0 : price), // 确保基于有效的数字计算
      receivedQuantity: 0,
      putawayQuantity: 0,
      currentReceiveQuantity: 0,
      lineNotes: '',
      sourceRequisitionNo: '',
    };
  });

  newLinesToAdd.forEach(newLine => {
    if (!formLines.value.some(existingLine => existingLine.productId === newLine.productId && existingLine.specification === newLine.specification)) {
      formLines.value.push(newLine);
    } else {
      ElMessage.warning(`商品 ${newLine.productName} - ${newLine.specification} 已存在于当前采购单明细。`);
    }
  });
  calculateTotalAmount();
  productSelectorDialogVisible.value = false;
};

const handlePurchaseRequisitionLinesSelected = async (selectedReqLines) => {
  console.log('[CreatePurchaseOrder.vue] handlePurchaseRequisitionLinesSelected received:', JSON.parse(JSON.stringify(selectedReqLines)));
  if (!Array.isArray(selectedReqLines) || selectedReqLines.length === 0) {
    selectPurchaseRequisitionLineDialogVisible.value = false;
    return;
  }

  const newLinesToAdd = selectedReqLines.map(reqLine => {
      // 确保 reqLine 包含期望的字段
      const estQty = Number(reqLine.estimatedQuantity) || Number(reqLine.quantity) || 0;
      const estPrice = Number(reqLine.estimatedUnitPrice) || Number(reqLine.unitPrice) || 0;
      return {
          id: null, 
          purchaseRequisitionLineId: reqLine.id, 
          productId: reqLine.productId,
          productCode: reqLine.productCode,
          productName: reqLine.productName,
          specification: reqLine.specification,
          unit: reqLine.unit,
          orderedQuantity: estQty, 
          unitPrice: estPrice,     
          lineTotal: estQty * estPrice,
          receivedQuantity: 0,
          putawayQuantity: 0,
          currentReceiveQuantity: 0,
          lineNotes: reqLine.lineNotes || reqLine.notes || '', 
          sourceRequisitionNo: reqLine.sourceRequisitionNo || reqLine.requisition_no || '', 
          // 保存建议的供应商信息，用于后续更新表头
          suggestedSupplierId: reqLine.suggested_supplier_id || reqLine.supplierId, 
          suggestedSupplierName: reqLine.suggestedSupplierName || reqLine.supplierName,
      };
  });

  newLinesToAdd.forEach(newLine => {
      if (!formLines.value.some(existingLine => existingLine.purchaseRequisitionLineId === newLine.purchaseRequisitionLineId && newLine.purchaseRequisitionLineId !== null)) {
          formLines.value.push(newLine);
      } else if (newLine.purchaseRequisitionLineId) {
          ElMessage.warning(`采购计划单明细 ${newLine.sourceRequisitionNo} - ${newLine.productName} 已存在。`);
      } else { 
           if (!formLines.value.some(existingLine => existingLine.productId === newLine.productId && existingLine.specification === newLine.specification)) {
              formLines.value.push(newLine);
          } else {
               ElMessage.warning(`商品 ${newLine.productName} - ${newLine.specification} 已存在于当前采购单明细。`);
          }
      }
  });
  calculateTotalAmount();
  selectPurchaseRequisitionLineDialogVisible.value = false;

  // 问题2的实现：如果表头供应商未定，则从第一个带建议供应商的计划单明细中获取
  if (!formHeader.supplierId && newLinesToAdd.length > 0) {
    const firstLineWithSupplier = newLinesToAdd.find(line => line.suggestedSupplierId);
    if (firstLineWithSupplier) {
      formHeader.supplierId = firstLineWithSupplier.suggestedSupplierId;
      formHeader.supplierName = firstLineWithSupplier.suggestedSupplierName || '加载中...'; // 先显示名字或加载中
      
      pageLoading.value = true;
      try {
        const res = await getSupplierDetail(firstLineWithSupplier.suggestedSupplierId);
        if (res.code === 200 && res.data) {
          formHeader.supplierName = res.data.name; // 使用API返回的官方名称
          formHeader.supplierPhone = res.data.phone || '';
          formHeader.supplierAddress = res.data.address || '';
        } else {
          ElMessage.warning(`自动填充供应商详情失败: ${res.message}`);
          if (!firstLineWithSupplier.suggestedSupplierName) formHeader.supplierName = '未知供应商';
        }
      } catch (error) {
        console.error("自动填充供应商详情异常:", error);
        ElMessage.error(`自动填充供应商详情异常: ${error.message}`);
        if (!firstLineWithSupplier.suggestedSupplierName) formHeader.supplierName = '获取详情失败';
      } finally {
        pageLoading.value = false;
        headerFormRef.value?.validateField('supplierName').catch(() => {});
      }
    }
  }
};


const calculateLineTotal = (row) => {
  row.lineTotal = (Number(row.orderedQuantity) || 0) * (Number(row.unitPrice) || 0);
  calculateTotalAmount();
};

const calculateTotalAmount = () => {
  formHeader.totalAmount = formLines.value.reduce((sum, line) => sum + (Number(line.lineTotal) || 0), 0);
  return formHeader.totalAmount;
};

const handleRemoveLine = (index) => {
  formLines.value.splice(index, 1);
  calculateTotalAmount();
};

const preparePayload = (context = 'create') => {
  const payload = {
    ...(formHeader.id && (context === 'edit' || context === 'receive_complete') && { id: formHeader.id }),
    supplier_id: formHeader.supplierId, 
    order_date: formHeader.orderDate, 
    total_amount: calculateTotalAmount(), 
    creator_id: formHeader.creatorId, 
    notes: formHeader.notes,
    status: formHeader.status, 
    
    items: formLines.value.map(line => {
      const itemPayload = {
        ...(line.id && (context === 'edit' || context === 'receive_complete') && { id: line.id }),
        purchase_requisition_line_id: line.purchaseRequisitionLineId, 
        product_id: line.productId, 
        ordered_quantity: Number(line.orderedQuantity) || 0, 
        unit_price: Number(line.unitPrice) || 0, 
        line_notes: line.lineNotes, 
      };
      if (context === 'receive_complete') {
         return {
              id: line.id, 
              received_quantity: Number(line.currentReceiveQuantity) 
         };
      }
      return itemPayload;
    })
  };

  if (context === 'create') {
    payload.status = 'PENDING_RECEIPT'; 
    if (!payload.creator_id) {
      console.warn("[CreatePurchaseOrder.vue] creatorId is missing in payload for create. Using fallback.");
      payload.creator_id = userStore.currentUser?.id || 'mock-user-id';
    }
  } else if (context === 'receive_complete') {
    payload.items = formLines.value
        .filter(line => Number(line.currentReceiveQuantity) > 0)
        .map(line => ({
            id: line.id,
            received_quantity: Number(line.currentReceiveQuantity) 
        }));
    delete payload.status; 
  }
  console.log(`[CreatePurchaseOrder.vue] Prepared Payload for ${context}:`, JSON.parse(JSON.stringify(payload)));
  return payload;
};


const handleSubmitPurchaseOrder = async () => {
  let validHeader = false;
  if (headerFormRef.value) { await headerFormRef.value.validate((valid) => { validHeader = valid; }); }
  else { validHeader = true; }
  if (!validHeader) { ElMessage.error('请检查表头信息是否完整且正确。'); return; }
  if (formLines.value.length === 0) { ElMessage.error('请至少添加一条商品明细。'); return; }
  for (const line of formLines.value) {
    if (!(Number(line.orderedQuantity) > 0)) { ElMessage.error(`商品 "${line.productName}" 的订购数量必须大于0。`); return; }
    if (!(Number(line.unitPrice) >= 0.01)) { ElMessage.error(`商品 "${line.productName}" 的采购单价必须大于或等于0.01。`); return; }
  }

  loading.value = true;
  try {
    const payload = preparePayload('create');
    const res = await createPurchaseOrder(payload); 

    if (res.code === 200 && res.data) {
      ElMessage.success('采购单提交成功！');
      router.push({ name: 'PurchaseOrderList' });
    } else { ElMessage.error(res.message || '提交采购单失败，请重试。'); }
  } catch (error) { console.error('提交采购单异常:', error); ElMessage.error(error.message || '提交采购单异常，请检查网络或联系管理员。'); }
  finally { loading.value = false; }
};

const handleUpdatePurchaseOrder = async () => {
  let validHeader = false;
  if (headerFormRef.value) { await headerFormRef.value.validate((valid) => { validHeader = valid; }); }
  else { validHeader = true; }
  if (!validHeader) { ElMessage.error('请检查表头信息是否完整且正确。'); return; }
  if (formLines.value.length === 0) { ElMessage.error('请至少添加一条商品明细。'); return; }
  for (const line of formLines.value) {
    if (!(Number(line.orderedQuantity) > 0)) { ElMessage.error(`商品 "${line.productName}" 的订购数量必须大于0。`); return; }
    if (!(Number(line.unitPrice) >= 0.01)) { ElMessage.error(`商品 "${line.productName}" 的采购单价必须大于或等于0.01。`); return; }
  }

  loading.value = true;
  try {
    const payload = preparePayload('edit');
    const res = await updatePurchaseOrder(formHeader.id, payload); 

    if (res.code === 200 && res.data) {
      ElMessage.success('采购单更新成功！');
      router.push({ name: 'PurchaseOrderList' });
    } else { ElMessage.error(res.message || '更新采购单失败，请重试。'); }
  } catch (error) { console.error('更新采购单异常:', error); ElMessage.error(error.message || '更新采购单异常，请检查网络或联系管理员。'); }
  finally { loading.value = false; }
};

const handleConfirmReceipt = async () => {
  if (formHeader.status !== 'PENDING_RECEIPT' && formHeader.status !== 'PARTIALLY_RECEIVED') {
    ElMessage.warning(`订单状态为【${getPurchaseStatusText(formHeader.status)}】，无法执行收货确认操作。`);
    return;
  }

  const linesToReceive = formLines.value.filter(line => Number(line.currentReceiveQuantity) > 0);
  if (linesToReceive.length === 0) {
    ElMessage.warning('请至少输入一项本次收货数量。');
    return;
  }

  for (const line of linesToReceive) {
    const maxCanReceive = (Number(line.orderedQuantity) || 0) - (Number(line.receivedQuantity) || 0);
    if (Number(line.currentReceiveQuantity) > maxCanReceive) {
      ElMessage.error(`商品 "${line.productName}" 的本次收货数量 (${line.currentReceiveQuantity}) 不能大于待收货数量 (${maxCanReceive})。`);
      return;
    }
     if (Number(line.currentReceiveQuantity) < 0) {
      ElMessage.error(`商品 "${line.productName}" 的本次收货数量不能为负数。`);
      return;
    }
  }

  loading.value = true;
  try {
    const payloadForReceipt = preparePayload('receive_complete'); 
    
    const res = await confirmReceipt(formHeader.id, { items: payloadForReceipt.items }); 

    if (res.code === 200 && res.data) {
      ElMessage.success('收货确认操作成功！');
      router.push({ name: 'PurchaseOrderList' }); 
    } else {
      ElMessage.error(res.message || '收货确认失败。');
      if (formHeader.id) {
        loadPurchaseOrderData(formHeader.id);
      }
    }
  } catch (error) {
    console.error('收货确认异常:', error);
    ElMessage.error(error.message || '收货确认异常。');
    if (formHeader.id) { 
        loadPurchaseOrderData(formHeader.id);
    }
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  const targetRoute = { name: 'PurchaseOrderList' };
  if (isViewMode.value || isReceivingMode.value) {
    router.push(targetRoute);
  } else { 
    if ((!isCreateMode.value && props.id) || formLines.value.length > 0 || formHeader.supplierId || formHeader.notes) {
      ElMessageBox.confirm('表单内容尚未保存，确定要取消吗？', '提示', {
        confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
      }).then(() => {
        resetForm();
        router.push(targetRoute);
      }).catch(() => {});
    } else {
      router.push(targetRoute);
    }
  }
};
</script>

<style scoped>
.create-purchase-order-page {}
.el-form-item { margin-bottom: 18px; }
.total-amount-display {
  padding-right: 10px; 
}
.el-textarea__inner {
    min-height: 32px !important; 
}
</style>