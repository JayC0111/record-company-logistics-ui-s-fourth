// src/mock/inboundOrders.js
import { generateId, paginateData, filterData } from './index';
import usersMock from './users'; // 用于获取创建人信息
import { purchaseOrders as allPurchaseOrdersData } from './purchaseOrders'; // 用于更新采购单已入库数量
import { products as allProductsData } from './products'; // 用于更新商品在手库存

export let mockInboundOrders = [ // 使用 let
    {
        id: generateId('ib'),
        putaway_order_no: 'PUT-20241030-001', // [cite: 1]
        status: 'PENDING', // 待处理 [cite: 1]
        creation_time: '2024-06-01 10:00:00', // [cite: 1]
        creator_id: 'user-wh-01', // [cite: 1]
        creatorName: '仓库管理员张三', // 冗余，方便显示
        related_purchase_order_nos: 'PO-20241030-001', // 示例
        notes: '第一批货物已到，等待上架。', // [cite: 1]
        items: [ // 入库单明细
            {
                id: generateId('ibi'), // inbound_putaway_order_line_id
                putaway_order_id: 'ib-mock-id-for-PUT-20241030-001', // 此id应为父级id, 假设父级ID
                purchase_order_line_id: 'poli-mock-001-1', // 关联的采购单明细行ID
                product_id: 'p-001', //
                productCode: 'PRD-1001', //
                productName: '周杰伦《叶惠美》专辑', //
                specification: 'CD', //
                unit: '张', //
                quantity_to_putaway: 50, // 本次入库数量
            }
        ]
    },
    {
        id: generateId('ib'),
        putaway_order_no: 'PUT-20241029-001',
        status: 'COMPLETED', // 已完成 [cite: 1]
        creation_time: '2024-05-30 14:30:00',
        creator_id: 'user-wh-02',
        creatorName: '仓库管理员李四',
        related_purchase_order_nos: 'PO-20240518-001', // 假设关联的采购单号
        notes: '全部上架完毕。',
        items: [
             {
                id: generateId('ibi'),
                putaway_order_id: 'ib-mock-id-for-PUT-20241029-001',
                purchase_order_line_id: 'poli-mock-another-example', // 假设关联的采购单明细行ID
                product_id: 'p-002',
                productCode: 'PRD-1002',
                productName: '林俊杰《曹操》专辑',
                specification: 'CD',
                unit: '张',
                quantity_to_putaway: 100,
            }
        ]
    },
    {
        id: generateId('ib'),
        putaway_order_no: 'PUT-20241028-001',
        status: 'PENDING',
        creation_time: '2024-05-28 09:15:00',
        creator_id: 'user-wh-01',
        creatorName: '仓库管理员张三',
        related_purchase_order_nos: 'PO-20240515-003',
        notes: '',
        items: []
    },
    {
        id: generateId('ib'),
        putaway_order_no: 'PUT-20241027-002',
        status: 'CANCELLED', // 假设有已取消状态
        creation_time: '2024-05-27 11:00:00',
        creator_id: 'user-wh-02',
        creatorName: '仓库管理员李四',
        related_purchase_order_nos: 'PO-20240512-001',
        notes: '供应商通知部分商品无法到货，此入库单取消。',
        items: []
    }
];

// 初始化时修正 putaway_order_id
mockInboundOrders.forEach(order => {
    if(order.items && order.items.length > 0) {
        order.items.forEach(item => {
            item.putaway_order_id = order.id;
        });
    }
});


const inboundOrdersMock = {
    getInboundOrderList(params) {
        console.log('[Mock /inboundOrders.js] getInboundOrderList called with params:', params);
        let result = JSON.parse(JSON.stringify(mockInboundOrders));

        if (params.startDate && params.endDate) {
            result = result.filter(item => {
                if (!item.creation_time) return false;
                const itemDate = new Date(item.creation_time.split(' ')[0]);
                return itemDate >= new Date(params.startDate) && itemDate <= new Date(params.endDate);
            });
        }
        
        const filters = {};
        if (params.putaway_order_no) filters.putaway_order_no = params.putaway_order_no; // [cite: 1]
        if (params.creatorName) filters.creatorName = params.creatorName;
        if (params.status) filters.status = params.status; // [cite: 1]
        if (params.related_purchase_order_nos) filters.related_purchase_order_nos = params.related_purchase_order_nos;


        result = filterData(result, filters);
        
        result.sort((a, b) => new Date(b.creation_time) - new Date(a.creation_time)); // [cite: 1]

        return Promise.resolve({
            code: 200,
            message: '获取成功',
            data: paginateData(result, params?.page, params?.size)
        });
    },
    
    getInboundOrderDetail(id) {
        console.log('[Mock /inboundOrders.js] getInboundOrderDetail called for ID:', id);
        const order = mockInboundOrders.find(ib => ib.id === id);
        if (order) {
            const orderDetail = JSON.parse(JSON.stringify(order));
            return Promise.resolve({ code: 200, message: '获取入库单详情成功 (Mock)', data: orderDetail });
        }
        return Promise.resolve({ code: 404, message: '入库单不存在 (Mock)', data: null });
    },

    createInboundOrder(data) {
        console.log('[Mock /inboundOrders.js] createInboundOrder called with data:', JSON.parse(JSON.stringify(data)));
        const now = new Date();
        const newId = generateId('ib');
        const newPutawayOrderNo = `PUT-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${String(mockInboundOrders.length + 1).padStart(3, '0')}`; // [cite: 16]

        const currentUserInfo = usersMock.getCurrentUser().data; // 尝试获取当前登录用户的信息
        const creator = { //
            id: currentUserInfo?.id || 'user-mock-warehouse', //
            fullName: currentUserInfo?.fullName || 'Mock 仓库管理员' //
        };
        
        const relatedPoNosSet = new Set();

        const newItems = (data.items || []).map(item => {
            const poLineId = item.purchaseOrderLineId || item.purchase_order_line_id;
            let poLineData = null;
            let poHeaderData = null;

            for (const po of allPurchaseOrdersData) {
                const foundLine = po.items.find(l => l.id === poLineId);
                if (foundLine) {
                    poLineData = foundLine;
                    poHeaderData = po;
                    if (po.po_number) relatedPoNosSet.add(po.po_number);
                    break;
                }
            }
            
            const product = allProductsData.find(p => p.id === (item.productId || poLineData?.product_id));

            return {
                id: generateId('ibi'), // inbound_putaway_order_line_id [cite: 16]
                putaway_order_id: newId, // [cite: 16]
                purchase_order_line_id: poLineId, // [cite: 15]
                purchase_order_no: poHeaderData?.po_number || 'N/A',
                product_id: product?.id || item.productId || '', // [cite: 15]
                productCode: product?.productCode || item.productCode || 'N/A',
                productName: product?.name || item.productName || '未知商品',
                specification: product?.specification || item.specification || '',
                unit: product?.unit || item.unit || '个',
                quantity_to_putaway: Number(item.quantityToPutaway) || Number(item.quantity_to_putaway) || 0, // [cite: 15]
            };
        });

        const newInboundOrder = {
            id: newId, // [cite: 16]
            putaway_order_no: newPutawayOrderNo, // [cite: 16]
            status: data.status || 'PENDING', // [cite: 16]
            creation_time: data.creation_time || now.toISOString().replace('T', ' ').substring(0, 19), // [cite: 16]
            creator_id: data.creator_id || creator.id, // [cite: 16]
            creatorName: data.creatorName || creator.fullName, //
            related_purchase_order_nos: Array.from(relatedPoNosSet).join(', ') || data.related_purchase_order_nos || '',
            notes: data.notes || '', // [cite: 16]
            items: newItems
        };

        mockInboundOrders.unshift(newInboundOrder);
        console.log('[Mock /inboundOrders.js] New Inbound Order created:', JSON.parse(JSON.stringify(newInboundOrder)));
        return Promise.resolve({ code: 200, message: '入库单创建成功 (Mock)', data: { ...newInboundOrder } });
    },

    updateInboundOrder(id, data) {
        console.log('[Mock /inboundOrders.js] updateInboundOrder called for ID:', id, 'with data:', data);
        const index = mockInboundOrders.findIndex(o => o.id === id);
        if (index !== -1) {
            const originalOrder = mockInboundOrders[index];
            let updated = false;

            if (data.status && data.status === 'COMPLETED' && originalOrder.status === 'PENDING') { // [cite: 16]
                originalOrder.status = 'COMPLETED'; // [cite: 16]
                originalOrder.completion_time = new Date().toISOString().replace('T', ' ').substring(0, 19);
                originalOrder.notes = (originalOrder.notes || '') + `\n${new Date().toLocaleString()} 完成入库。`;
                
                (originalOrder.items || []).forEach(itemLine => {
                    const qtyPutaway = Number(itemLine.quantity_to_putaway) || 0;
                    if (qtyPutaway <= 0) return;

                    const productIndex = allProductsData.findIndex(p => p.id === itemLine.product_id);
                    if (productIndex !== -1) {
                        const oldOnHand = Number(allProductsData[productIndex].onHandQuantity) || 0;
                        allProductsData[productIndex].onHandQuantity = oldOnHand + qtyPutaway; // [cite: 17]
                        console.log(`[Mock Inbound COMPLETED] Product ${allProductsData[productIndex].name} (ID: ${itemLine.product_id}) onHandQuantity updated from ${oldOnHand} to ${allProductsData[productIndex].onHandQuantity}`);
                        // ZERO.pdf P10 - inventory_log 记录应在此处生成 [cite: 18]
                    } else {
                        console.warn(`[Mock Inbound COMPLETED] Product with ID ${itemLine.product_id} not found for stock update.`);
                    }

                    if (itemLine.purchase_order_line_id) { // [cite: 17]
                        let poUpdated = false;
                        for (const po of allPurchaseOrdersData) {
                            const poLine = po.items.find(l => l.id === itemLine.purchase_order_line_id);
                            if (poLine) {
                                const oldPutaway = Number(poLine.putaway_quantity) || 0;
                                poLine.putaway_quantity = oldPutaway + qtyPutaway; // [cite: 17]
                                console.log(`[Mock Inbound COMPLETED] PurchaseOrderLine ${poLine.id} (PO: ${po.po_number}) putaway_quantity updated from ${oldPutaway} to ${poLine.putaway_quantity}`);
                                
                                const allLinesFullyPutaway = po.items.every(l => (Number(l.putaway_quantity) || 0) >= (Number(l.ordered_quantity) || 0));
                                if (allLinesFullyPutaway && po.status !== 'FULLY_PUTAWAY' && po.status !== 'COMPLETED') { // [cite: 18]
                                    po.status = 'FULLY_PUTAWAY'; // 或 'COMPLETED' [cite: 18]
                                    console.log(`[Mock Inbound COMPLETED] PurchaseOrder ${po.po_number} status updated to FULLY_PUTAWAY.`);
                                }
                                poUpdated = true;
                                break;
                            }
                        }
                        if (!poUpdated) {
                             console.warn(`[Mock Inbound COMPLETED] PurchaseOrderLine with ID ${itemLine.purchase_order_line_id} not found for putaway_quantity update.`);
                        }
                    }
                });
                updated = true;
            } else if (data.status && data.status === 'CANCELLED' && originalOrder.status === 'PENDING') {
                 originalOrder.status = 'CANCELLED'; // [cite: 16]
                 originalOrder.notes = (originalOrder.notes || '') + `\n${new Date().toLocaleString()} 取消入库。`;
                 updated = true;
            }
            
            if (data.notes !== undefined && data.notes !== originalOrder.notes) {
                originalOrder.notes = data.notes;
                updated = true;
            }

            if (updated) {
                 mockInboundOrders[index] = {...originalOrder, updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)};
            }

            return Promise.resolve({ code: 200, message: '入库单更新成功 (Mock)', data: { ...mockInboundOrders[index] } });
        }
        return Promise.resolve({ code: 404, message: '入库单不存在 (Mock)', data: null });
    },
    cancelInboundOrder(id) {
        console.log('[Mock /inboundOrders.js] cancelInboundOrder called for ID:', id);
        return inboundOrdersMock.updateInboundOrder(id, { status: 'CANCELLED' });
    }
};

export default inboundOrdersMock;