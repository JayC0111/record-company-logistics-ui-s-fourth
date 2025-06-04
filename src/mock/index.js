// src/mock/index.js
import salesOrdersMock from './salesOrders';
import productsMock from './products'; // products.js 应该导出其数据和mock服务对象
import customersMock from './customers';
import usersMock from './users'; // 引入完整的 usersMock 对象
import suppliersMock from './suppliers';
import outboundOrdersMock from './outboundOrders';
import shipmentOrdersMock from './shipmentOrders';
import purchaseRequisitionsMock from './purchaseRequisitions';
import purchaseOrdersMock from './purchaseOrders'; // 导入 purchaseOrdersMock
import inboundOrdersMock from './inboundOrders';

// 统一导出所有Mock服务
// 确保每个 mock 文件都默认导出一个包含其所有 mock 方法的对象
export default {
  // 认证 & 用户管理 (从 usersMock 中解构或直接用 usersMock 的方法)
  login: usersMock.login, // [cite: 1]
  getCurrentUser: usersMock.getCurrentUser, // [cite: 1]
  getUserList: usersMock.getUserList, // [cite: 1]
  createUser: usersMock.createUser, // [cite: 1]
  updateUser: usersMock.updateUser, // [cite: 1]
  deleteUser: usersMock.deleteUser, // [cite: 1]
  getRolesList: usersMock.getRolesList, // 新增，用于获取角色列表 [cite: 1]
  assignRolesToUser: usersMock.assignRolesToUser, // 新增，用于分配角色 [cite: 1]

  // 其他模块的 Mock 服务
  ...salesOrdersMock, // [cite: 1]
  ...productsMock, // [cite: 1]
  ...customersMock, // [cite: 1]
  ...suppliersMock, // [cite: 1]
  ...outboundOrdersMock, // [cite: 1]
  ...shipmentOrdersMock, // [cite: 1]
  ...purchaseRequisitionsMock, // [cite: 1]
  ...purchaseOrdersMock, // 展开 purchaseOrdersMock 以包含其所有方法 [cite: 1]
  // getReceivablePurchaseOrderLines 将通过上面的 ...purchaseOrdersMock 自动包含，无需单独列出
  // 如果 purchaseOrdersMock.js 中 getReceivablePurchaseOrderLines 不是默认导出对象的一部分，则需要单独添加：
  // getReceivablePurchaseOrderLines: purchaseOrdersMock.getReceivablePurchaseOrderLines, 
  ...inboundOrdersMock, // [cite: 1]
};

// 辅助函数：随机ID生成
export function generateId(prefix = '') { // [cite: 1]
  const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); // [cite: 1]
  return prefix ? `${prefix}-${randomPart}` : randomPart; // [cite: 1]
}

// 辅助函数：分页处理
export function paginateData(data, page = 0, size = 10) { // [cite: 1]
  const pageNumber = Number(page) || 0; // [cite: 1]
  const pageSize = Number(size) || 10; // [cite: 1]
  
  const startIndex = pageNumber * pageSize; // [cite: 1]
  const endIndex = startIndex + pageSize; // [cite: 1]
  const paginatedData = data.slice(startIndex, endIndex); // [cite: 1]

  return { // [cite: 1]
    content: paginatedData, // [cite: 1]
    totalElements: data.length, // [cite: 1]
    totalPages: Math.ceil(data.length / pageSize), // [cite: 1]
    size: pageSize, // [cite: 1]
    number: pageNumber, // [cite: 1]
    numberOfElements: paginatedData.length, // [cite: 1]
    first: pageNumber === 0, // [cite: 1]
    last: endIndex >= data.length // [cite: 1]
  };
}

// 辅助函数：过滤数据
export function filterData(data, filters) { // [cite: 1]
  if (!filters || Object.keys(filters).length === 0) { // [cite: 1]
    return data;  // [cite: 1]
  }
  return data.filter(item => { // [cite: 1]
    for (const key in filters) { // [cite: 1]
      const filterValue = String(filters[key]).trim().toLowerCase(); // 转小写以便不区分大小写比较 [cite: 1]
      if (filterValue !== '' && item.hasOwnProperty(key) && item[key] !== null && item[key] !== undefined) { // 确保属性存在且有值 [cite: 1]
        const itemValue = String(item[key]).toLowerCase(); // 转小写 [cite: 1]
        if (!itemValue.includes(filterValue)) { // [cite: 1]
          return false; // [cite: 1]
        }
      }
    }
    return true; // [cite: 1]
  });
}