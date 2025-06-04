<template>
  <el-dialog
    title="选择供应商"
    :model-value="visible"
    width="750px" 
    :append-to-body="true"
    :close-on-click-modal="false"
    @update:modelValue="$emit('update:visible', $event)"
    @close="handleClose"
    top="10vh" 
  >
    <div class="selector-dialog-content">
      <el-form :model="searchForm" inline class="table-toolbar dialog-search-form" style="margin-bottom: 15px;" @submit.prevent="handleSearch">
        <el-form-item label="供应商名称">
          <el-input v-model="searchForm.name" placeholder="请输入供应商名称" clearable style="width: 200px;" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="searchForm.contact_person" placeholder="请输入联系人" clearable style="width: 160px;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="resetSearchAndFetch">重置</el-button> 
        </el-form-item>
      </el-form>

      <el-table
        ref="supplierTableRef"
        :data="supplierList"
        v-loading="loading"
        border
        highlight-current-row
        @row-dblclick="handleRowDblClick"
        @current-change="handleCurrentRowChange" 
        height="350px"
      >
        <el-table-column label="" width="55" align="center"> 
          <template #default="scope">
            <el-radio :label="scope.row.id" v-model="selectedSupplierId">&nbsp;</el-radio>
          </template>
        </el-table-column>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="供应商名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="contact_person" label="联系人" width="120" show-overflow-tooltip />
        <el-table-column prop="phone" label="联系电话" width="150" />
        <template #empty>
            <el-empty description="暂无供应商数据" />
        </template>
      </el-table>

      <div class="pagination-container modal-pagination" style="margin-top: 15px;">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 30]" 
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentPageChange"
          background
          size="small" 
        />
      </div>
    </div>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleConfirmSelection" :disabled="!selectedSupplier">确定</el-button> 
    </template>
  </el-dialog>
</template>

<script setup>
console.log('[SupplierSelectorDialog.vue] SCRIPT SETUP STARTED');

import { ref, reactive, watch } from 'vue';
import { Search, Refresh } from '@element-plus/icons-vue'; // Changed RefreshLeft to Refresh
import { getSupplierList as getSupplierListAPI } from '@/api/supplier.js'; // Renamed for clarity
import { ElMessage } from 'element-plus';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  // initialSelectedId: String, // Kept for potential future use
});

const emit = defineEmits(['update:visible', 'select']); // Changed 'selected' to 'select'

const loading = ref(false);
const supplierList = ref([]);
const selectedSupplierId = ref(null);
const selectedSupplier = ref(null); // Renamed from currentSelectedSupplier

const searchForm = reactive({
  name: '',
  contact_person: ''
});

const pagination = reactive({
  currentPage: 1,
  pageSize: 10, // Default to 10 as in original SupplierDialog
  total: 0
});

const supplierTableRef = ref(null); // For potential future use e.g. clear selection

const fetchData = async () => {
  console.log('[SupplierSelectorDialog.vue] fetchData: Function CALLED');
  loading.value = true;
  try {
    const apiParams = {
      name: searchForm.name || undefined,
      contact_person: searchForm.contact_person || undefined,
      page: pagination.currentPage - 1, // API is 0-indexed
      size: pagination.pageSize,
      is_active: true // Explicitly request active suppliers
    };
    // Remove undefined/empty keys, similar to CustomerSelectorDialog
    Object.keys(apiParams).forEach(key => {
      if (apiParams[key] === undefined || apiParams[key] === '') {
        delete apiParams[key];
      }
    });

    console.log('[SupplierSelectorDialog.vue] fetchData: API params to be sent:', JSON.parse(JSON.stringify(apiParams)));
    
    const res = await getSupplierListAPI(apiParams);

    console.log('[SupplierSelectorDialog.vue] fetchData: API response received:', JSON.parse(JSON.stringify(res)));

    if (res && res.code === 200 && res.data) {
      supplierList.value = res.data.content || [];
      pagination.total = res.data.totalElements || 0;
      console.log('[SupplierSelectorDialog.vue] fetchData: Data loaded. Count:', supplierList.value.length, 'Total:', pagination.total);
      if (supplierList.value.length === 0) {
         if (pagination.total > 0) {
             console.warn('[SupplierSelectorDialog.vue] Total elements > 0 but content is empty. Check API or pagination logic in mock.');
             ElMessage.info('当前页无数据，请检查分页。');
         } else if (searchForm.name || searchForm.contact_person) {
             ElMessage.info('按当前条件未查询到供应商数据。');
         } else {
             ElMessage.info('暂无可用供应商数据。');
         }
      }
    } else {
      ElMessage.error(res.message || '获取供应商列表失败 (Code not 200 or no data)');
      supplierList.value = [];
      pagination.total = 0;
      console.error('[SupplierSelectorDialog.vue] fetchData: Failed or bad response. Response:', res);
    }
  } catch (error) {
    console.error('[SupplierSelectorDialog.vue] fetchData: API call FAILED:', error);
    ElMessage.error(`获取供应商列表异常: ${error.message || '未知错误'}`);
    supplierList.value = [];
    pagination.total = 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  console.log('[SupplierSelectorDialog.vue] handleSearch: Called. Current searchForm:', JSON.parse(JSON.stringify(searchForm)));
  pagination.currentPage = 1;
  fetchData();
};

const resetSearchAndFetch = () => { // Renamed from resetSearch for clarity
  console.log('[SupplierSelectorDialog.vue] resetSearchAndFetch: Called.');
  searchForm.name = '';
  searchForm.contact_person = '';
  // pagination.currentPage = 1; // handleSearch will set this
  handleSearch();
};

watch(() => props.visible, (newVal) => {
  console.log('[SupplierSelectorDialog.vue] WATCH props.visible: NewVal=', newVal);
  if (newVal) {
    console.log('[SupplierSelectorDialog.vue] WATCH props.visible: Dialog opening. Resetting selections and fetching data.');
    selectedSupplierId.value = null;
    selectedSupplier.value = null;
    if (supplierTableRef.value && supplierTableRef.value.setCurrentRow) { // Ensure ref is available
        supplierTableRef.value.setCurrentRow(null);
    }
    // if (props.initialSelectedId) { // Logic for pre-selection if needed later
    //   selectedSupplierId.value = props.initialSelectedId;
    // }
    resetSearchAndFetch(); // This will trigger fetchData
  } else {
    console.log('[SupplierSelectorDialog.vue] WATCH props.visible: Dialog closing.');
  }
}, { immediate: true }); // Added immediate:true for consistency, though effect might be minimal if visible starts false


const handleSizeChange = (size) => {
  console.log('[SupplierSelectorDialog.vue] handleSizeChange: New size:', size);
  pagination.pageSize = size;
  pagination.currentPage = 1; // Reset to first page on size change
  fetchData();
};

const handleCurrentPageChange = (page) => {
  console.log('[SupplierSelectorDialog.vue] handleCurrentPageChange: New page:', page);
  pagination.currentPage = page; // pagination.currentPage is already 1-indexed from el-pagination
  fetchData();
};

// Called when el-radio changes OR when a row is clicked (if setCurrentRow is used)
const handleCurrentRowChange = (currentRow) => {
    if (currentRow) {
        console.log('[SupplierSelectorDialog.vue] handleCurrentRowChange: Current row changed:', currentRow.name);
        selectedSupplierId.value = currentRow.id; // Keep radio in sync if row click selects
        selectedSupplier.value = currentRow;
    } else {
        // This case might occur if setCurrentRow(null) is called
        // selectedSupplierId.value = null;
        // selectedSupplier.value = null;
    }
};

const handleRowDblClick = (row) => {
  if (row) {
    console.log('[SupplierSelectorDialog.vue] handleRowDblClick: Row double-clicked:', row.name);
    selectedSupplierId.value = row.id; // Ensure radio is also updated
    selectedSupplier.value = row;
    handleConfirmSelection();
  }
};

const handleConfirmSelection = () => {
  if (selectedSupplier.value) { // Check the object
    console.log('[SupplierSelectorDialog.vue] handleConfirmSelection: Supplier selected:', selectedSupplier.value.name);
    emit('select', { ...selectedSupplier.value }); // Emit a copy
    handleClose();
  } else {
    ElMessage.warning('请选择一个供应商');
  }
};

const handleClose = () => {
  console.log('[SupplierSelectorDialog.vue] handleClose: Closing dialog.');
  emit('update:visible', false);
};

</script>

<style scoped>
.selector-dialog-content {
  /* padding-bottom: 10px; */
}
.dialog-search-form.el-form--inline { /* Copied from CustomerSelectorDialog */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  /* justify-content: center; remove this if you want items to align left */
  gap: 10px 15px; /* Adjust gap as needed */
}
.dialog-search-form .el-form-item {
  margin-right: 0 !important; /* Override default el-form-item margin */
  margin-bottom: 0 !important; /* Override default el-form-item margin */
}
.pagination-container.modal-pagination { /* Copied from CustomerSelectorDialog */
  margin-top: 15px;
  padding: 0; /* remove padding if it's handled by parent */
  display: flex;
  justify-content: flex-end;
}
.el-table .el-radio { /* Ensure radio alignment */
    vertical-align: middle;
}
</style>