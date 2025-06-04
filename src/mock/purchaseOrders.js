// src/mock/purchaseOrders.js
import { generateId, paginateData, filterData } from './index';
import { products as allProductsData } from './products';
import { mockSuppliers } from './suppliers';
import { purchaseRequisitions } from './purchaseRequisitions'; // 假设需要关联计划单信息

export let purchaseOrders = [
    {
        id: 'po-mock-001',
        po_number: 'PO-20241030-001',
        status: 'FULLY_RECEIVED', // 确保有已收货状态的订单
        supplier_id: 'sup-001',
        supplierName: '索尼音乐供应商', // [cite: 5]
        order_date: '2024-05-28', // [cite: 9]
        total_amount: 14000.00, // [cite: 9]
        creator_id: 'user-purchaser-01', // [cite: 9]
        creatorName: '采购员小王', // [cite: 9]
        notes: '第一批采购，请注意质量检验。', // [cite: 9]
        items: [
            {
                id: 'poli-mock-001-1', // PO Line ID [cite: 9]
                purchase_order_id: 'po-mock-001', // [cite: 9]
                po_number: 'PO-20241030-001', // 添加po_number到行，方便弹窗显示
                product_id: 'p-001', // [cite: 9]
                productCode: 'PRD-1001', // For consistency if needed [cite: 9]
                productName: '周杰伦《叶惠美》专辑', // [cite: 9]
                specification: 'CD', // [cite: 9]
                unit: '张', // [cite: 9]
                ordered_quantity: 200, // [cite: 9]
                unit_price: 35.00, // [cite: 9]
                lineTotal: 7000.00, // calculated [cite: 9]
                received_quantity: 200, // 已全部收货 [cite: 9]
                putaway_quantity: 150,  // 但未全部入库 [cite: 9]
                purchase_requisition_line_id: 'prl-generated-id-1', // 假设的计划单行ID
            },
            {
                id: 'poli-mock-001-2', // [cite: 9]
                purchase_order_id: 'po-mock-001', // [cite: 9]
                po_number: 'PO-20241030-001',
                product_id: 'p-002', // [cite: 9]
                productCode: 'PRD-1002', // [cite: 9]
                productName: '林俊杰《曹操》专辑', // [cite: 9]
                specification: 'CD', // [cite: 9]
                unit: '张', // [cite: 9]
                ordered_quantity: 200, // [cite: 9]
                unit_price: 35.00, // [cite: 9]
                lineTotal: 7000.00, // [cite: 9]
                received_quantity: 180, // 部分收货 [cite: 9]
                putaway_quantity: 0,    // 完全未入库 [cite: 9]
                purchase_requisition_line_id: 'prl-generated-id-2',
            }
        ]
    },
    {
        id: 'po-mock-002',
        po_number: 'PO-20241101-001',
        status: 'PARTIALLY_RECEIVED',
        supplier_id: 'sup-002',
        supplierName: '华纳唱片直供中心', // [cite: 5]
        order_date: '2024-05-29',
        total_amount: 5000.00, // 3000 + 2000
        creator_id: 'user-purchaser-02',
        creatorName: '采购员小李',
        notes: '紧急补货。',
        items: [
            {
                id: 'poli-mock-002-1',
                purchase_order_id: 'po-mock-002',
                po_number: 'PO-20241101-001',
                product_id: 'p-003', // [cite: 10]
                productCode: 'PRD-1003', // [cite: 10]
                productName: '薛之谦《绅士》专辑', // [cite: 10]
                specification: 'CD+DVD', // [cite: 10]
                unit: '套', // [cite: 10]
                ordered_quantity: 50,
                unit_price: 60.00,
                lineTotal: 3000.00,
                received_quantity: 30, // 已收货30
                putaway_quantity: 30,  // 已入库30 (此行不应出现在待入库列表)
                purchase_requisition_line_id: 'prl-generated-id-3',
            },
            {
                id: 'poli-mock-002-2',
                purchase_order_id: 'po-mock-002',
                po_number: 'PO-20241101-001',
                product_id: 'p-004', // [cite: 10]
                productCode: 'PRD-1004', // [cite: 10]
                productName: '五月天《自传》专辑', // [cite: 10]
                specification: '黑胶唱片', // [cite: 10]
                unit: '张', // [cite: 10]
                ordered_quantity: 20,
                unit_price: 100.00,
                lineTotal: 2000.00,
                received_quantity: 20, // 已收货20
                putaway_quantity: 0,  // 未入库
                purchase_requisition_line_id: 'prl-generated-id-4',
            }
        ]
    },
     {
        id: 'po-mock-003',
        po_number: 'PO-20241102-001',
        status: 'PENDING_RECEIPT', // 此订单不应出现在待入库列表
        supplier_id: 'sup-003',
        supplierName: '环球音乐代理商（广州）', // [cite: 5]
        order_date: '2024-05-30',
        total_amount: 1000.00,
        creator_id: 'user-purchaser-01',
        creatorName: '采购员小王',
        notes: '',
        items: [
            {
                id: 'poli-mock-003-1',
                purchase_order_id: 'po-mock-003',
                po_number: 'PO-20241102-001',
                product_id: 'p-005', // [cite: 10]
                productCode: 'PRD-1005', // [cite: 10]
                productName: '华语经典流行合集', // [cite: 10]
                specification: 'U盘装', // [cite: 10]
                unit: '个', // [cite: 10]
                ordered_quantity: 10,
                unit_price: 100.00,
                lineTotal: 1000.00,
                received_quantity: 0,
                putaway_quantity: 0,
                purchase_requisition_line_id: 'prl-generated-id-5',
            }
        ]
    }
];

const purchaseOrdersMock = {
    getPurchaseOrderList(params) {
        console.log('[Mock /purchaseOrders.js] getPurchaseOrderList called with params:', params);
        let result = JSON.parse(JSON.stringify(purchaseOrders));
        const filters = {};
        if (params) {
            if (params.po_number) filters.po_number = params.po_number;
            if (params.supplierName) filters.supplierName = params.supplierName;
            if (params.status) filters.status = params.status;
             if (params.order_date_start && params.order_date_end) { // 假设前端会传入这些参数名
                result = result.filter(order => {
                    if (!order.order_date) return false;
                    const orderDate = new Date(order.order_date);
                    const startDate = new Date(params.order_date_start);
                    const endDate = new Date(params.order_date_end);
                    return orderDate >= startDate && orderDate <= endDate;
                });
            }
        }
        result = filterData(result, filters);
        result.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
        return Promise.resolve({
            code: 200,
            message: '获取采购单列表成功 (Mock)',
            data: paginateData(result, params?.page, params?.size)
        });
    },

    getPurchaseOrderDetail(id) {
        console.log('[Mock /purchaseOrders.js] getPurchaseOrderDetail for ID:', id);
        const order = purchaseOrders.find(po => po.id === id);
        if (order) {
            const orderData = JSON.parse(JSON.stringify(order));
            orderData.items = orderData.items.map(item => ({
                ...item,
                lineTotal: (Number(item.ordered_quantity) || 0) * (Number(item.unit_price) || 0)
            }));
            orderData.total_amount = orderData.items.reduce((sum, item) => sum + item.lineTotal, 0);
            return Promise.resolve({ code: 200, message: '获取采购单详情成功 (Mock)', data: orderData });
        }
        return Promise.resolve({ code: 404, message: '采购单不存在 (Mock)', data: null });
    },

    createPurchaseOrder(data) {
        console.log('[Mock /purchaseOrders.js] createPurchaseOrder called with data:', JSON.parse(JSON.stringify(data)));
        const now = new Date();
        const newId = generateId('po');
        const newPoNumber = `PO-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${String(purchaseOrders.length + 1).padStart(3, '0')}`;

        const supplier = mockSuppliers.find(s => s.id === data.supplier_id); // [cite: 5]

        let totalAmount = 0;
        const itemsWithDetails = (data.items || []).map(item => {
            const product = allProductsData.find(p => p.id === item.product_id); // [cite: 10]
            const lineTotal = (Number(item.ordered_quantity) || 0) * (Number(item.unit_price) || 0);
            totalAmount += lineTotal;
            
            // 更新采购计划单明细的已转采购数量
            if (item.purchase_requisition_line_id) { // [cite: 9]
                for (const req of purchaseRequisitions) { // [cite: 8]
                    const reqLine = req.items.find(rl => rl.id === item.purchase_requisition_line_id);
                    if (reqLine) {
                        reqLine.converted_to_po_qty = (Number(reqLine.converted_to_po_qty) || 0) + (Number(item.ordered_quantity) || 0); // [cite: 8]
                        // 检查采购计划单状态是否需要更新
                        const allConverted = req.items.every(rl => (Number(rl.converted_to_po_qty) || 0) >= (Number(rl.estimated_quantity) || 0));
                        if (allConverted) {
                            req.status = 'CONVERTED'; // 假设有“已完全转换”的状态
                        } else if (req.items.some(rl => (Number(rl.converted_to_po_qty) || 0) > 0)) {
                            req.status = 'PARTIALLY_CONVERTED'; // 假设有“部分转换”的状态
                        }
                        break; 
                    }
                }
            }

            return {
                id: generateId('poli'), // Purchase Order Line ID [cite: 9]
                purchase_order_id: newId, // [cite: 9]
                po_number: newPoNumber, // 添加到行项目
                product_id: item.product_id, // [cite: 9]
                productCode: product?.productCode || 'N/A', // [cite: 9, 10]
                productName: product?.name || '未知商品', // [cite: 9, 10]
                specification: product?.specification || '', // [cite: 9, 10]
                unit: product?.unit || '个', // [cite: 9, 10]
                ordered_quantity: Number(item.ordered_quantity) || 0, // [cite: 9]
                unit_price: Number(item.unit_price) || 0, // [cite: 9]
                lineTotal: lineTotal, // [cite: 9]
                received_quantity: 0, // [cite: 9]
                putaway_quantity: 0, // [cite: 9]
                purchase_requisition_line_id: item.purchase_requisition_line_id || null, // [cite: 9]
            };
        });

        const newOrder = {
            id: newId, // [cite: 9]
            po_number: newPoNumber, // [cite: 9]
            status: data.status || 'PENDING_RECEIPT', // 默认为待收货，或从 DRAFT 开始再确认 [cite: 9]
            supplier_id: data.supplier_id, // [cite: 9]
            supplierName: supplier?.name || '未知供应商', // [cite: 5, 9]
            supplierPhone: supplier?.phone || '', // [cite: 5, 9]
            supplierAddress: supplier?.address || '', // [cite: 5, 9]
            order_date: data.order_date || now.toISOString().slice(0,10), // [cite: 9]
            total_amount: totalAmount, // [cite: 9]
            creator_id: data.creator_id, // [cite: 9]
            creatorName: data.creatorName || 'Mock采购员', // [cite: 9]
            notes: data.notes || '', // [cite: 9]
            items: itemsWithDetails, // [cite: 9]
        };

        purchaseOrders.unshift(newOrder);
        console.log('[Mock /purchaseOrders.js] New Purchase Order created:', JSON.parse(JSON.stringify(newOrder)));
        return Promise.resolve({ code: 200, message: '采购单创建成功 (Mock)', data: { ...newOrder } });
    },

    updatePurchaseOrder(id, data) {
        console.log('[Mock /purchaseOrders.js] updatePurchaseOrder called for ID:', id, 'with data:', JSON.parse(JSON.stringify(data)));
        const orderIndex = purchaseOrders.findIndex(po => po.id === id);
        if (orderIndex === -1) {
            return Promise.resolve({ code: 404, message: '采购单不存在 (Mock)', data: null });
        }
        
        const originalOrder = purchaseOrders[orderIndex];
        // 示例：如果订单状态不是草稿或待供应商确认，则只允许修改备注或通过特定动作更新状态
        if (originalOrder.status !== 'DRAFT' && originalOrder.status !== 'PENDING_SUPPLIER_CONFIRMATION') { // 假设有这些状态
            if (data.notes !== undefined) originalOrder.notes = data.notes;
            
            // 处理收货（状态变更和行项目收货数量更新）
            if (data.status === 'FULLY_RECEIVED' || data.status === 'PARTIALLY_RECEIVED') {
                if (data.items && Array.isArray(data.items)) {
                    data.items.forEach(updatedItem => {
                        const itemToUpdate = originalOrder.items.find(i => i.id === updatedItem.id);
                        if (itemToUpdate) {
                            // 确认收货时，前端应传递 received_quantity
                            if (updatedItem.received_quantity !== undefined) {
                                itemToUpdate.received_quantity = Number(updatedItem.received_quantity) || 0;
                            }
                        }
                    });
                }
                originalOrder.status = data.status; // 更新头状态
            } else if (data.status !== undefined && data.status !== originalOrder.status) {
                // 其他状态更新（如果允许）
                originalOrder.status = data.status;
            }
            
            originalOrder.updateTime = new Date().toISOString();
            purchaseOrders[orderIndex] = originalOrder;
            return Promise.resolve({ code: 200, message: `采购单状态更新为 ${originalOrder.status} (Mock)`, data: { ...originalOrder } });
        }


        // 如果是草稿或待确认状态，允许更多字段的修改
        const supplier = mockSuppliers.find(s => s.id === data.supplier_id); // [cite: 5]
        let totalAmount = 0;
        const itemsWithDetails = (data.items || []).map(item => {
            const product = allProductsData.find(p => p.id === item.product_id); // [cite: 10]
            const lineTotal = (Number(item.ordered_quantity) || 0) * (Number(item.unit_price) || 0);
            totalAmount += lineTotal;
            return {
                id: item.id || generateId('poli'), // [cite: 9]
                purchase_order_id: id, // [cite: 9]
                po_number: originalOrder.po_number, 
                product_id: item.product_id, // [cite: 9]
                productCode: product?.productCode || 'N/A', // [cite: 9, 10]
                productName: product?.name || '未知商品', // [cite: 9, 10]
                specification: product?.specification || '', // [cite: 9, 10]
                unit: product?.unit || '个', // [cite: 9, 10]
                ordered_quantity: Number(item.ordered_quantity) || 0, // [cite: 9]
                unit_price: Number(item.unit_price) || 0, // [cite: 9]
                lineTotal: lineTotal, // [cite: 9]
                received_quantity: Number(item.received_quantity) || 0, // 保留已收货数量，如果编辑时允许修改则用传入值 [cite: 9]
                putaway_quantity: Number(item.putaway_quantity) || 0,   // 保留已入库数量 [cite: 9]
                purchase_requisition_line_id: item.purchase_requisition_line_id || null, // [cite: 9]
            };
        });

        const updatedOrder = {
            ...originalOrder, // [cite: 9]
            ...data, 
            supplier_id: data.supplier_id, // [cite: 9]
            supplierName: supplier?.name || originalOrder.supplierName, // [cite: 5, 9]
            supplierPhone: supplier?.phone || originalOrder.supplierPhone, // [cite: 5, 9]
            supplierAddress: supplier?.address || originalOrder.supplierAddress, // [cite: 5, 9]
            total_amount: totalAmount, // [cite: 9]
            items: itemsWithDetails, // [cite: 9]
            updateTime: new Date().toISOString(),
        };

        purchaseOrders[orderIndex] = updatedOrder;
        console.log('[Mock /purchaseOrders.js] Purchase Order updated:', JSON.parse(JSON.stringify(updatedOrder)));
        return Promise.resolve({ code: 200, message: '采购单更新成功 (Mock)', data: { ...updatedOrder } });
    },
    
    deletePurchaseOrder(id) {
        console.log('[Mock /purchaseOrders.js] deletePurchaseOrder called for ID:', id);
        const index = purchaseOrders.findIndex(p => p.id === id);
        if (index !== -1) {
            if (purchaseOrders[index].status !== 'DRAFT') { 
                 return Promise.resolve({ code: 400, message: `状态为 ${purchaseOrders[index].status} 的采购单无法删除 (Mock)`, data: null });
            }
            const orderToDelete = purchaseOrders[index];
            (orderToDelete.items || []).forEach(item => {
                if (item.purchase_requisition_line_id) { // [cite: 9]
                    for (const req of purchaseRequisitions) { // [cite: 8]
                        const reqLine = req.items.find(rl => rl.id === item.purchase_requisition_line_id);
                        if (reqLine) {
                            reqLine.converted_to_po_qty = Math.max(0, (Number(reqLine.converted_to_po_qty) || 0) - (Number(item.ordered_quantity) || 0)); // [cite: 8]
                            const anyConverted = req.items.some(rl => (Number(rl.converted_to_po_qty) || 0) > 0);
                            if (!anyConverted && req.status === 'PARTIALLY_CONVERTED') {
                                req.status = 'APPROVED';
                            } else if (anyConverted && req.status === 'CONVERTED') {
                                req.status = 'PARTIALLY_CONVERTED';
                            }
                            break;
                        }
                    }
                }
            });

            purchaseOrders.splice(index, 1);
            return Promise.resolve({ code: 200, message: '采购单删除成功 (Mock)', data: null });
        }
        return Promise.resolve({ code: 404, message: '采购单不存在 (Mock)', data: null });
    },

    // 新增的 Mock 函数
    getReceivablePurchaseOrderLines(params) {
        console.log('[Mock /purchaseOrders.js] getReceivablePurchaseOrderLines called with params:', params);
        let receivableLines = [];
        purchaseOrders.forEach(order => {
            if (order.status === 'PARTIALLY_RECEIVED' || order.status === 'FULLY_RECEIVED') { // [cite: 9]
                (order.items || []).forEach(line => {
                    const received = Number(line.received_quantity) || 0; // [cite: 9]
                    const putaway = Number(line.putaway_quantity) || 0; // [cite: 9]
                    const canPutaway = received - putaway;
                    if (canPutaway > 0) {
                        receivableLines.push({
                            purchaseOrderLineId: line.id, // [cite: 9]
                            purchaseOrderId: order.id, // [cite: 9]
                            poNumber: order.po_number, // 采购单号 [cite: 9]
                            supplierId: order.supplier_id, // [cite: 9]
                            supplierName: order.supplierName, // [cite: 9]
                            productId: line.product_id, // [cite: 9]
                            productCode: line.productCode, // [cite: 9]
                            productName: line.productName, // [cite: 9]
                            specification: line.specification, // [cite: 9]
                            unit: line.unit, // [cite: 9]
                            orderedQuantity: Number(line.ordered_quantity) || 0, // [cite: 9]
                            receivedQuantity: received, // [cite: 9]
                            putawayQuantity: putaway, // [cite: 9]
                            quantityToPutaway: canPutaway, // 本次可入库数量
                            _maxCanPutaway: canPutaway // 用于校验，与quantityToPutaway一致
                        });
                    }
                });
            }
        });

        const filters = {};
        if (params) {
            if (params.poNumber) filters.poNumber = params.poNumber;
            if (params.supplierName) filters.supplierName = params.supplierName;
            if (params.productKeyword) {
                receivableLines = receivableLines.filter(line =>
                    (line.productCode && line.productCode.toLowerCase().includes(params.productKeyword.toLowerCase())) ||
                    (line.productName && line.productName.toLowerCase().includes(params.productKeyword.toLowerCase()))
                );
            }
        }
        
        const filteredResult = filterData(receivableLines, filters);
        
        return Promise.resolve({
            code: 200,
            message: '获取待入库采购明细成功 (Mock)',
            data: paginateData(filteredResult, params?.page, params?.size)
        });
    },
    // 模拟确认收货，仅更新状态和行项目收货数量，不处理库存
    confirmReceipt(id, receivingData) {
        console.log('[Mock /purchaseOrders.js] confirmReceipt for PO ID:', id, 'with data:', receivingData);
        const orderIndex = purchaseOrders.findIndex(po => po.id === id);
        if (orderIndex === -1) {
            return Promise.resolve({ code: 404, message: '采购单不存在 (Mock)', data: null });
        }
        const order = purchaseOrders[orderIndex];
        if (order.status !== 'PENDING_RECEIPT' && order.status !== 'PARTIALLY_RECEIVED') {
            return Promise.resolve({ code: 400, message: `采购单状态为 ${order.status}，无法进行收货操作 (Mock)`, data: null });
        }

        let allLinesFullyReceived = true;
        let anyLineReceived = false;

        (receivingData.items || []).forEach(receivedItem => {
            const lineToUpdate = order.items.find(line => line.id === receivedItem.id);
            if (lineToUpdate) {
                // 假设 receivedItem.current_received_quantity 是本次收货数量
                const currentReceivedQty = Number(receivedItem.current_received_quantity) || 0;
                if (currentReceivedQty < 0) {
                     // ElMessage.error("收货数量不能为负"); // 在实际组件中处理
                     // return Promise.resolve({ code: 400, message: '收货数量不能为负 (Mock)'}); // 简化mock
                }
                // 累加本次收货数量到已收货数量
                lineToUpdate.received_quantity = (Number(lineToUpdate.received_quantity) || 0) + currentReceivedQty;
                 if (lineToUpdate.received_quantity > (Number(lineToUpdate.ordered_quantity) || 0) ) {
                    //  ElMessage.error("累计收货数量不能大于订购数量");
                    // return Promise.resolve({ code: 400, message: '累计收货数量不能大于订购数量 (Mock)'});
                    lineToUpdate.received_quantity = Number(lineToUpdate.ordered_quantity); // 修正为不超过订购量
                 }
            }
        });
        
        order.items.forEach(line => {
            if ((Number(line.received_quantity) || 0) < (Number(line.ordered_quantity) || 0)) {
                allLinesFullyReceived = false;
            }
            if ((Number(line.received_quantity) || 0) > 0) {
                anyLineReceived = true;
            }
        });

        if (allLinesFullyReceived) {
            order.status = 'FULLY_RECEIVED';
        } else if (anyLineReceived) {
            order.status = 'PARTIALLY_RECEIVED';
        }
        // 如果没有任何收货，状态可能维持不变或根据业务逻辑调整

        order.notes = receivingData.receipt_notes ? (order.notes ? order.notes + '\n' : '') + `收货备注: ${receivingData.receipt_notes}` : order.notes;
        order.last_receipt_date = new Date().toISOString().slice(0,10); // 假设记录最后收货日期

        purchaseOrders[orderIndex] = order;
        return Promise.resolve({ code: 200, message: '确认收货成功 (Mock)', data: { ...order } });
    }
};

export default purchaseOrdersMock;