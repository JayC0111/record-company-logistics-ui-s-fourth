<template>
    <el-dialog
      :model-value="visible"
      title="选择待入库采购明细"
      width="65%"
      :before-close="handleClose"
      top="5vh"
      append-to-body
      draggable
      :close-on-click-modal="false"
    >
      <div class="dialog-content">
        <el-form :model="searchParams" inline class="table-toolbar">
          <el-form-item label="采购单号">
            <el-input v-model="searchParams.poNumber" placeholder="请输入采购单号" clearable />
          </el-form-item>
          <el-form-item label="供应商名称">
            <el-input v-model="searchParams.supplierName" placeholder="请输入供应商名称" clearable />
          </el-form-item>
          <el-form-item label="商品信息">
            <el-input v-model="searchParams.productKeyword" placeholder="商品编码/名称" clearable />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            <el-button :icon="Refresh" @click="handleResetSearch">重置</el-button>
          </el-form-item>
        </el-form>
  
        <el-table
          ref="multipleTableRef"
          v-loading="loading"
          :data="receivableLines"
          border
          stripe
          style="width: 100%; margin-top: 20px"
          height="400px"
          @selection-change="handleSelectionChange"
          row-key="purchaseOrderLineId" 
        >
          <el-table-column type="selection" width="55" :reserve-selection="true" />
          <el-table-column property="poNumber" label="采购单号" width="180" show-overflow-tooltip />
          <el-table-column property="productCode" label="商品编码" width="150" show-overflow-tooltip />
          <el-table-column property="productName" label="商品名称" min-width="200" show-overflow-tooltip />
          <el-table-column property="specification" label="规格型号" width="120" show-overflow-tooltip />
          <el-table-column property="unit" label="单位" width="80" />
          <el-table-column property="orderedQuantity" label="订购数量" width="100" align="right" />
          <el-table-column property="receivedQuantity" label="已收货数量" width="110" align="right" />
          <el-table-column property="putawayQuantity" label="已入库数量" width="110" align="right" />
          <el-table-column label="本次可入库" width="110" align="right">
            <template #default="scope">
              {{ scope.row._maxCanPutaway }}
            </template>
          </el-table-column>
          <el-table-column label="本次入库数量" width="140" align="center" fixed="right">
            <template #default="scope">
              <el-input-number
                v-model="scope.row.currentPutawayQuantity"
                :min="0"
                :max="scope.row._maxCanPutaway"
                :precision="2" 
                :controls="false"
                size="small"
                style="width: 100px;"
                @change="handleCurrentPutawayQuantityChange(scope.row)"
              />
            </template>
          </el-table-column>
          <el-table-column property="supplierName" label="供应商" width="180" show-overflow-tooltip />
        </el-table>
  
        <app-pagination
          v-if="total > 0"
          :total="total"
          v-model:page="searchParams.page"
          v-model:limit="searchParams.size"
          @pagination="fetchReceivableLines"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
  
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleClose">取消</el-button>
          <el-button type="primary" @click="handleConfirmSelection" :disabled="selectedLines.length === 0">
            确认添加
          </el-button>
        </span>
      </template>
    </el-dialog>
  </template>
  
  <script setup>
  import { ref, reactive, watch, nextTick } from 'vue';
  import { ElMessage } from 'element-plus';
  import { Search, Refresh } from '@element-plus/icons-vue';
  import AppPagination from '@/components/common/AppPagination.vue';
  import { getReceivablePurchaseOrderLines } from '@/api/purchaseOrder.js';
  
  const props = defineProps({
    visible: {
      type: Boolean,
      default: false,
    },
    existingPoLineIds: {
      type: Array,
      default: () => []
    }
  });
  
  const emit = defineEmits(['update:visible', 'confirm']);
  
  const loading = ref(false);
  const receivableLines = ref([]);
  const total = ref(0);
  const searchParams = reactive({
    page: 1,
    size: 10,
    poNumber: '',
    supplierName: '',
    productKeyword: '',
  });
  
  const multipleTableRef = ref(null);
  const selectedLines = ref([]);
  
  watch(() => props.visible, (newVal) => {
    if (newVal) {
      fetchReceivableLines();
    } else {
      if (multipleTableRef.value) {
        multipleTableRef.value.clearSelection();
      }
      selectedLines.value = [];
    }
  });
  
  const fetchReceivableLines = async () => {
    loading.value = true;
    try {
      const apiParams = {
        ...searchParams,
        page: searchParams.page > 0 ? searchParams.page - 1 : 0,
      };
      const response = await getReceivablePurchaseOrderLines(apiParams);
      if (response.code === 200 && response.data) {
        const filteredContent = response.data.content.filter(
          line => !props.existingPoLineIds.includes(line.purchaseOrderLineId)
        );
        
        receivableLines.value = filteredContent.map(line => ({
          ...line,
          currentPutawayQuantity: line.quantityToPutaway, // API/Mock应提供quantityToPutaway作为可入库数量
                                                          // _maxCanPutaway 也是这个值
        }));
        // 计算总数时，如果API返回的总数未考虑过滤，前端需要自行调整或API支持过滤
        // 简单处理：如果API返回的总数是过滤前的，那么我们这里也显示过滤后的数量作为total，
        // 或者让分页组件基于当前列表长度工作（但这会导致分页信息不准确）。
        // 理想情况是API层面支持排除ID列表，或前端获取全部数据再过滤（不适合大数据）。
        // 此处假设API返回的总数是准确的，或者前端基于过滤后的列表长度调整分页（简化）。
        // total.value = response.data.totalElements; // 如果API未处理existingPoLineIds的过滤
        total.value = filteredContent.length; // 仅显示过滤后的数量作为total，分页将基于此
                                            // 如果需要真实分页，API应该支持排除ID
  
        // 重新计算总页数，如果total基于filteredContent.length
         if (total.value <= (searchParams.page -1) * searchParams.size && searchParams.page > 1) {
           searchParams.page = Math.max(1, Math.ceil(total.value / searchParams.size));
           // 如果调整了页码，需要重新获取数据
           // 为了避免循环调用，可以加一个标志位或仅在页码确实无效时重获取
           // fetchReceivableLines(); // 谨慎使用，可能导致循环
         }
  
  
      } else {
        ElMessage.error(response.message || '获取待入库明细失败');
        receivableLines.value = [];
        total.value = 0;
      }
    } catch (error) {
      console.error('Error fetching receivable PO lines:', error);
      ElMessage.error('获取待入库明细时发生错误');
      receivableLines.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  };
  
  const handleSearch = () => {
    searchParams.page = 1; 
    fetchReceivableLines();
  };
  
  const handleResetSearch = () => {
    searchParams.page = 1;
    searchParams.poNumber = '';
    searchParams.supplierName = '';
    searchParams.productKeyword = '';
    fetchReceivableLines();
  };
  
  const handleSelectionChange = (selection) => {
    selectedLines.value = selection;
  };
  
  const handleCurrentPutawayQuantityChange = (row) => {
    if (row.currentPutawayQuantity > row._maxCanPutaway) {
      row.currentPutawayQuantity = row._maxCanPutaway;
      ElMessage.warning('本次入库数量不能大于可入库数量');
    }
    if (row.currentPutawayQuantity < 0) {
      row.currentPutawayQuantity = 0; 
    }
    const indexInSelected = selectedLines.value.findIndex(item => item.purchaseOrderLineId === row.purchaseOrderLineId);
    if (indexInSelected > -1) {
      selectedLines.value.splice(indexInSelected, 1, { ...row }); // 使用展开的row确保更新
    }
  };
  
  const handleClose = () => {
    emit('update:visible', false);
  };
  
  const handleConfirmSelection = () => {
    if (selectedLines.value.length === 0) {
      ElMessage.warning('请至少选择一个待入库明细');
      return;
    }
  
    const linesToAdd = selectedLines.value
      .filter(line => line.currentPutawayQuantity && Number(line.currentPutawayQuantity) > 0)
      .map(line => ({
        purchaseOrderLineId: line.purchaseOrderLineId,
        purchaseOrderId: line.purchaseOrderId,
        poNumber: line.poNumber,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        specification: line.specification,
        unit: line.unit,
        quantityToPutaway: Number(line.currentPutawayQuantity) 
      }));
  
    if (linesToAdd.length === 0) {
       ElMessage.warning('请确保所选明细的本次入库数量大于0');
      return;
    }
  
    emit('confirm', linesToAdd);
    handleClose();
  };
  
  </script>
  
  <style scoped>
  .dialog-content {
    max-height: calc(80vh - 160px); 
    overflow-y: auto;
    padding: 0 10px; 
  }
  .table-toolbar {
    margin-bottom: 16px;
  }
  .table-toolbar .el-form-item {
    margin-bottom: 10px; 
  }
  .dialog-footer {
    padding-top: 10px; 
    text-align: right;
  }
  </style>