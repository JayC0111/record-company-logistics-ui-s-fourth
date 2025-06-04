<template>
    <el-dialog
      :model-value="internalVisible" 
      title="选择已批准的采购计划明细"
      width="80%" 
      top="5vh"
      :append-to-body="true"
      :close-on-click-modal="false"
      destroy-on-close 
      @update:modelValue="handleUpdateVisible" 
      @close="handleDialogClose" 
      >
      <div class="select-approved-pr-lines-dialog-content" v-loading="loading">
        <div class="dialog-search-container"> 
          <el-form :model="searchParams" inline label-width="80px" class="dialog-search-form" @submit.prevent="handleSearch">
            <el-form-item label="计划单号">
              <el-input v-model="searchParams.requisition_no" placeholder="输入计划单号" clearable style="width: 180px;" />
            </el-form-item>
            <el-form-item label="商品信息">
              <el-input v-model="searchParams.productKeyword" placeholder="商品编码/名称" clearable style="width: 180px;" />
            </el-form-item>
            <el-form-item label="申请人">
              <el-input v-model="searchParams.requesterName" placeholder="输入申请人名称" clearable style="width: 150px;" />
            </el-form-item>
            <el-form-item class="search-buttons">
              <el-button type="primary" :icon="SearchIcon" @click="handleSearch" :loading="loading">筛选</el-button>
              <el-button :icon="RefreshIcon" @click="resetSearchAndFetch">重置</el-button>
            </el-form-item>
          </el-form>
        </div>
  
        <el-table
          ref="prLinesTableRef"
          :data="paginatedTableData"
          border
          style="width: 100%; margin-top: 15px;"
          max-height="400px" 
          @selection-change="handleSelectionChange"
          :row-key="getRowKey" 
          reserve-selection 
        >
          <el-table-column type="selection" width="50" align="center" :selectable="isRowSelectable" fixed="left" />
          <el-table-column prop="requisition_no" label="计划单号" width="180" show-overflow-tooltip fixed="left" />
          <el-table-column prop="productCode" label="商品编码" width="140" />
          <el-table-column prop="productName" label="商品名称" min-width="200" show-overflow-tooltip />
          <el-table-column prop="specification" label="规格" width="120" />
          <el-table-column prop="unit" label="单位" width="70" />
          <el-table-column prop="original_estimated_quantity" label="计划数量" width="100" align="right" />
          <el-table-column prop="quantity_remaining_to_convert" label="可转数量" width="100" align="right">
              <template #default="{ row }">
                  <span :style="{ color: row.quantity_remaining_to_convert <= 0 ? 'red' : 'inherit' }">
                      {{ row.quantity_remaining_to_convert }}
                  </span>
              </template>
          </el-table-column>
          <el-table-column prop="estimated_unit_price" label="预估单价" width="100" align="right">
            <template #default="{ row }">{{ formatCurrency(row.estimated_unit_price) }}</template>
          </el-table-column>
          <el-table-column prop="suggestedSupplierName" label="建议供应商" width="150" show-overflow-tooltip />
          <el-table-column prop="requesterName" label="申请人" width="100" />
          <el-table-column prop="request_date" label="申请日期" width="110" />
          <template #empty>
            <el-empty description="暂无符合条件的已批准采购计划明细" />
          </template>
        </el-table>
  
        <div class="dialog-pagination-container"> 
          <el-pagination
            v-if="filteredAndProcessedLines.length > 0"
            v-model:current-page="clientPagination.currentPage"
            v-model:page-size="clientPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="filteredAndProcessedLines.length" 
            background
            size="small"
          />
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="handleConfirm" :loading="loading" :disabled="selectedLines.length === 0">确定添加</el-button>
        </span>
      </template>
    </el-dialog>
  </template>
  
  <script setup>
  console.log('[SelectApprovedPRLinesDialog.vue] SCRIPT SETUP STARTED - 这个组件的JS开始处理了！');
  
  import { ref, reactive, computed, watch, nextTick } from 'vue'; 
  import { ElMessage } from 'element-plus';
  import { Search as SearchIcon, Refresh as RefreshIcon } from '@element-plus/icons-vue';
  import { getPurchaseRequisitionList as getPRListAPI } from '@/api/purchaseRequisition';
  
  const props = defineProps({
    visible: { type: Boolean, default: false },
    currentPoLines: { type: Array, default: () => [] }
  });
  
  const emit = defineEmits(['update:visible', 'confirm']);
  
  const internalVisible = ref(props.visible); 
  
  const loading = ref(false);
  const allFetchedPRs = ref([]); 
  const processedAndFlattenedLines = ref([]); 
  const filteredAndProcessedLines = ref([]);
  const selectedLines = ref([]);
  
  const searchParams = reactive({
    requisition_no: '',
    productKeyword: '',
    requesterName: '',
  });
  
  const clientPagination = reactive({
    currentPage: 1,
    pageSize: 10,
  });
  
  const prLinesTableRef = ref(null);
  
  function initializeDialogData() {
    console.log('[SelectApprovedPRLinesDialog.vue] initializeDialogData: Called.');
    searchParams.requisition_no = '';
    searchParams.productKeyword = '';
    searchParams.requesterName = '';
    clientPagination.currentPage = 1;
    clientPagination.pageSize = 10; 
    selectedLines.value = [];
    if (prLinesTableRef.value) {
        prLinesTableRef.value.clearSelection();
    }
    fetchAndProcessApprovedPRs(); 
  }
  
  
  async function fetchAndProcessApprovedPRs() {
    loading.value = true;
    allFetchedPRs.value = []; 
    processedAndFlattenedLines.value = [];
    console.log('[SelectApprovedPRLinesDialog.vue] fetchAndProcessApprovedPRs: Called');
    try {
      const apiParams = {
        status: 'APPROVED',
        page: 0, 
        size: 1000, 
      };
      console.log('[SelectApprovedPRLinesDialog.vue] Fetching PRs with API params:', JSON.parse(JSON.stringify(apiParams)));
      const res = await getPRListAPI(apiParams);
      console.log('[SelectApprovedPRLinesDialog.vue] API response for PRs:', JSON.parse(JSON.stringify(res)));
  
      if (res.code === 200 && res.data && res.data.content) {
        allFetchedPRs.value = res.data.content;
        const tempLines = [];
        allFetchedPRs.value.forEach(pr => {
          if (pr.items && pr.items.length > 0) {
            pr.items.forEach(line => {
              const estimatedQty = Number(line.estimated_quantity) || 0;
              const convertedQty = Number(line.converted_to_po_qty) || 0;
              const remainingQty = estimatedQty - convertedQty;
              
              tempLines.push({
                ...line,
                requisition_no: pr.requisition_no, // 从主表获取计划单号
                requesterName: pr.requesterName, // 从主表获取申请人
                request_date: pr.request_date, // 从主表获取申请日期
                // 确保有 productCode, productName, specification, unit, estimated_unit_price, suggested_supplier_id, suggestedSupplierName, line_notes
                // 这些应该在 line 对象中，如果不在，需要调整mock数据或API返回
                productCode: line.productCode || '',
                productName: line.productName || '',
                specification: line.specification || '',
                unit: line.unit || '',
                estimated_unit_price: Number(line.estimated_unit_price) || 0,
                suggested_supplier_id: line.suggested_supplier_id || null,
                suggestedSupplierName: line.suggestedSupplierName || '',
                line_notes: line.line_notes || '',
                _uniqueKey: `${pr.id || 'pr_unknown'}-${line.id || 'line_unknown'}`,
                quantity_remaining_to_convert: remainingQty,
                original_estimated_quantity: estimatedQty,
              });
            });
          }
        });
        processedAndFlattenedLines.value = tempLines;
        console.log('[SelectApprovedPRLinesDialog.vue] Total processed and flattened lines before filtering:', processedAndFlattenedLines.value.length);
        applyClientFiltersAndSort(); 
      } else {
        ElMessage.error(res.message || '获取已批准采购计划列表失败');
        console.error('[SelectApprovedPRLinesDialog.vue] Failed to fetch PRs or bad response data. Response:', res);
        processedAndFlattenedLines.value = []; 
        applyClientFiltersAndSort(); 
      }
    } catch (error) {
      console.error('[SelectApprovedPRLinesDialog.vue] Error fetching/processing PRs:', error);
      ElMessage.error(`获取采购计划数据异常: ${error.message || '未知错误'}`);
      processedAndFlattenedLines.value = []; 
      applyClientFiltersAndSort(); 
    } finally {
      loading.value = false;
    }
  }
  
  function applyClientFiltersAndSort() {
      console.log('[SelectApprovedPRLinesDialog.vue] applyClientFiltersAndSort: Called. Search params:', JSON.parse(JSON.stringify(searchParams)));
      let lines = [...processedAndFlattenedLines.value];
  
      if (searchParams.requisition_no) {
          lines = lines.filter(line => line.requisition_no && line.requisition_no.toLowerCase().includes(searchParams.requisition_no.toLowerCase()));
      }
      if (searchParams.productKeyword) {
          const keyword = searchParams.productKeyword.toLowerCase();
          lines = lines.filter(line =>
          (line.productCode && line.productCode.toLowerCase().includes(keyword)) ||
          (line.productName && line.productName.toLowerCase().includes(keyword))
          );
      }
      if (searchParams.requesterName) {
          lines = lines.filter(line => line.requesterName && line.requesterName.toLowerCase().includes(searchParams.requesterName.toLowerCase()));
      }
      
      // 示例排序：可以根据需要调整，例如按计划单号和行号排序
      lines.sort((a, b) => {
        if (a.requisition_no < b.requisition_no) return -1;
        if (a.requisition_no > b.requisition_no) return 1;
        // 如果需要再按行ID等排序，可以添加更多比较条件
        return 0;
      });
  
      filteredAndProcessedLines.value = lines;
      clientPagination.currentPage = 1; 
      console.log('[SelectApprovedPRLinesDialog.vue] Filtered lines count:', filteredAndProcessedLines.value.length);
      
      if (filteredAndProcessedLines.value.length === 0 && processedAndFlattenedLines.value.length > 0 && (searchParams.requisition_no || searchParams.productKeyword || searchParams.requesterName) ) {
          ElMessage.info('按当前筛选条件未找到可用的采购计划明细。');
      } else if (filteredAndProcessedLines.value.length === 0 && processedAndFlattenedLines.value.length === 0 && allFetchedPRs.value.length > 0) {
          console.log('[SelectApprovedPRLinesDialog] Fetched PRs but extracted no valid lines.');
      }
      nextTick(() => {
          if (prLinesTableRef.value) { prLinesTableRef.value.clearSelection(); }
          selectedLines.value = [];
      });
  }
  
  
  const paginatedTableData = computed(() => {
      const start = (clientPagination.currentPage - 1) * clientPagination.pageSize;
      const end = start + clientPagination.pageSize;
      const dataToPaginate = filteredAndProcessedLines.value;
      const slicedData = dataToPaginate.slice(start, end);
      return slicedData;
  });
    
  function handleSearch() {
    clientPagination.currentPage = 1; 
    applyClientFiltersAndSort();
  }
  
  function resetSearchAndFetch() {
    searchParams.requisition_no = '';
    searchParams.productKeyword = '';
    searchParams.requesterName = '';
    handleSearch(); // 这会重新应用筛选（现在是空筛选）并重置分页
  }
  
  function handleSelectionChange(selection) {
    selectedLines.value = selection;
  }
  
  function getRowKey(row) {
      return row._uniqueKey || `${row.requisition_no}-${row.id || Math.random()}`; 
  }
  
  function isRowSelectable(row) {
    // 检查此计划单明细是否已存在于当前采购订单的明细中
    const isAlreadyInPO = props.currentPoLines.some(poLine => poLine.purchaseRequisitionLineId === row.id); // 假设父组件传递的行有 purchaseRequisitionLineId
    const hasRemainingQty = row.quantity_remaining_to_convert > 0;
    return !isAlreadyInPO && hasRemainingQty;
  }
  
  function handleConfirm() {
      if (selectedLines.value.length === 0) {
          ElMessage.warning('请至少选择一个采购计划明细');
          return;
      }
      // 确保返回给父组件的数据结构是父组件期望的
      const linesToEmit = JSON.parse(JSON.stringify(selectedLines.value)).map(line => ({
          id: line.id, // 计划单明细行ID
          requisition_no: line.requisition_no, // 计划单号
          sourceRequisitionNo: line.requisition_no, // 父组件期望的字段名
          productId: line.product_id, // 商品ID
          productCode: line.productCode,
          productName: line.productName,
          specification: line.specification,
          unit: line.unit,
          estimatedQuantity: line.quantity_remaining_to_convert, // 本次可转换的数量
          quantity: line.quantity_remaining_to_convert, // 父组件可能期望的字段名
          estimatedUnitPrice: line.estimated_unit_price, // 预估单价
          unitPrice: line.estimated_unit_price, // 父组件可能期望的字段名
          suggested_supplier_id: line.suggested_supplier_id,
          suggestedSupplierName: line.suggestedSupplierName,
          line_notes: line.line_notes, // 行备注
          notes: line.line_notes, // 父组件可能期望的字段名
          // 确保所有父组件 CreatePurchaseOrder.vue 中 handlePurchaseRequisitionLinesSelected 函数里用到的字段都被正确传递
      }));
      emit('confirm', linesToEmit);
      // 此处通过 emit 更新父组件的 visible 状态来关闭对话框
      emit('update:visible', false); // 正确关闭对话框的方式
  }
  
  const handleUpdateVisible = (value) => { 
      if (internalVisible.value !== value) { 
          emit('update:visible', value);
      }
  };
  
  function handleDialogClose() { 
    console.log('[SelectApprovedPRLinesDialog.vue] handleDialogClose: Emitting update:visible false');
    internalVisible.value = false; 
    emit('update:visible', false);
  }
    
  watch(() => props.visible, (newVal) => {
    console.log(`[SelectApprovedPRLinesDialog.vue] WATCH props.visible: Changed to ${newVal}`);
    internalVisible.value = newVal; 
    if (newVal) {
      console.log('[SelectApprovedPRLinesDialog.vue] WATCH props.visible: Dialog is opening, calling initializeDialogData().');
      initializeDialogData();
    }
  }, { immediate: true }); 
  
  watch(internalVisible, (newVal) => { 
      if (newVal !== props.visible) {
          emit('update:visible', newVal);
      }
  });
    
  function formatCurrency(value) {
    if (value === null || value === undefined || isNaN(Number(value))) return '';
    return Number(value).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  </script>
  
  <style scoped>
  .dialog-search-container {
    margin-bottom: 15px;
  }
  .dialog-search-form { 
    display: flex;
    flex-wrap: wrap;
    gap: 10px 15px; 
    align-items: center; 
  }
  .dialog-search-form .el-form-item {
    margin-bottom: 0 !important; 
    margin-right: 0 !important; 
  }
  .dialog-pagination-container { 
    padding: 15px 0 0 0;
    display: flex;
    justify-content: flex-end;
  }
  </style>