// src/mock/users.js
import { generateId, paginateData, filterData } from './index'; // 假设这些辅助函数在 index.js 中

// 模拟用户数据库
const mockUsersData = {
  'user-001': {
    id: 'user-001',
    userId: 'user-001',
    username: 'salesUser',
    fullName: '销售员小明',
    roles: ['ROLE_SALES'],
  },
  'user-002': {
    id: 'user-002',
    userId: 'user-002',
    username: 'adminUser',
    fullName: '管理员小红',
    roles: ['ROLE_ADMIN', 'ROLE_SALES_MANAGER'],
  },
  'user-003': {
    id: 'user-003',
    userId: 'user-003',
    username: 'warehouseUser',
    fullName: '仓库管理员小李',
    roles: ['ROLE_WAREHOUSE'],
  },
  'user-004': {
    id: 'user-004',
    userId: 'user-004',
    username: 'purchaseUser',
    fullName: '采购员小张',
    roles: ['ROLE_PURCHASER'],
  },
  'user-005': {
    id: 'user-005',
    userId: 'user-005',
    username: 'superadmin',
    fullName: '超级管理员',
    roles: ['ROLE_ADMIN', 'ROLE_SALES', 'ROLE_SALES_MANAGER', 'ROLE_WAREHOUSE', 'ROLE_PURCHASER', 'ROLE_PURCHASING_MANAGER'],
  }
};

// 用于存储当前模拟登录的用户状态
let currentMockUser = null; // 初始化为 null

const usersMock = {
  login(credentials) {
    console.log('[Mock /users.js] login attempt with:', credentials);
    let loggedInUser = null;

    if (credentials.username === 'sales' && credentials.password === '123456') {
      loggedInUser = mockUsersData['user-001'];
    } else if (credentials.username === 'admin' && credentials.password === '123456') {
      loggedInUser = mockUsersData['user-002'];
    } else if (credentials.username === 'warehouse' && credentials.password === '123456') {
      loggedInUser = mockUsersData['user-003'];
    } else if (credentials.username === 'purchase' && credentials.password === '123456') {
      loggedInUser = mockUsersData['user-004'];
    } else if (credentials.username === 'superadmin' && credentials.password === '123456') {
      loggedInUser = mockUsersData['user-005'];
    } else if (credentials.username && credentials.password) {
      // 默认：如果提供了用户名和密码，但没有匹配到特定用户，则使用第一个用户（salesUser）
      // 或者您可以设计一个更通用的“任意用户登录”逻辑
      console.warn(`[Mock /users.js] No specific user match for ${credentials.username}, defaulting to first user or none.`);
      // loggedInUser = Object.values(mockUsersData)[0]; // 取第一个作为默认
    }

    if (loggedInUser) {
      currentMockUser = { ...loggedInUser }; // 更新当前模拟用户
      const mockToken = `mock-token-for-${loggedInUser.username}-${Date.now()}`;
      // 在真实的模拟场景中，我们不会在这里操作 localStorage，而是让 auth store 处理
      // localStorage.setItem('token', mockToken); // 通常由 store 的 action 完成
      // localStorage.setItem('userInfo', JSON.stringify(currentMockUser)); // 通常由 store 的 action 完成
      console.log('[Mock /users.js] Login successful, user to be set:', currentMockUser);
      return Promise.resolve({
        code: 200,
        message: '登录成功 (Mock)',
        data: {
          token: mockToken
          // 注意：登录接口通常只返回token，用户信息通过 /auth/info 获取
        }
      });
    } else {
      console.warn('[Mock /users.js] Login failed: Invalid credentials provided.');
      currentMockUser = null; // 确保登录失败时清除
      return Promise.resolve({
        code: 401, // Unauthorized
        message: '用户名或密码错误 (Mock)',
        data: null
      });
    }
  },

  getCurrentUser() {
    // 这个函数应该基于 currentMockUser (即登录后设置的用户)
    // 并且应该检查 localStorage 中是否有 token (由 auth store 设置)
    const token = localStorage.getItem('token');
    console.log('[Mock /users.js] getCurrentUser called. Token from localStorage:', token);
    console.log('[Mock /users.js] Current mock user state:', currentMockUser);

    if (token && currentMockUser && currentMockUser.id) {
      return Promise.resolve({
        code: 200,
        message: '获取用户信息成功 (Mock)',
        data: { ...currentMockUser } // 返回当前模拟用户信息的副本
      });
    } else {
      // 如果没有 token 或 currentMockUser 未设置（例如直接访问了需要登录的页面）
      // 模拟未授权或 session 过期的情况
      console.warn('[Mock /users.js] getCurrentUser: No valid token or currentMockUser not set. Simulating unauthorized.');
      return Promise.resolve({
        code: 401,
        message: '无法获取用户信息，Token无效或用户未登录 (Mock)',
        data: null
      });
    }
  },

  // 模拟获取用户列表 (用于系统管理等)
  getUserList(params) {
    console.log('[Mock /users.js] getUserList called with params:', params);
    let usersArray = Object.values(mockUsersData);

    // 简单的过滤示例 (您可以根据需要扩展)
    if (params && params.username) {
      usersArray = usersArray.filter(user => user.username.includes(params.username));
    }
    if (params && params.fullName) {
      usersArray = usersArray.filter(user => user.fullName.includes(params.fullName));
    }

    // 返回分页数据结构，与您的 paginateData 辅助函数兼容
    return Promise.resolve({
      code: 200,
      message: '获取用户列表成功 (Mock)',
      data: paginateData(usersArray, params?.page, params?.size)
    });
  },

  // 其他用户管理相关的 Mock API (根据需要实现)
  createUser(userData) {
    console.log('[Mock /users.js] createUser called with data:', userData);
    const newId = generateId('user');
    const newUser = {
      id: newId,
      userId: newId,
      ...userData,
      roles: userData.roles || ['ROLE_USER'], // 默认角色
    };
    mockUsersData[newId] = newUser;
    currentMockUser = newUser; // 可选：新创建用户后设为当前用户（如果适用）
    return Promise.resolve({ code: 200, message: '用户创建成功 (Mock)', data: { ...newUser } });
  },

  updateUser(userId, userData) {
    console.log('[Mock /users.js] updateUser called for ID:', userId, 'with data:', userData);
    if (mockUsersData[userId]) {
      mockUsersData[userId] = { ...mockUsersData[userId], ...userData };
      if (currentMockUser && currentMockUser.id === userId) {
        currentMockUser = { ...mockUsersData[userId] }; // 如果更新的是当前用户，也更新 currentMockUser
      }
      return Promise.resolve({ code: 200, message: '用户更新成功 (Mock)', data: { ...mockUsersData[userId] } });
    }
    return Promise.resolve({ code: 404, message: '用户不存在 (Mock)', data: null });
  },

  deleteUser(userId) {
    console.log('[Mock /users.js] deleteUser called for ID:', userId);
    if (mockUsersData[userId]) {
      delete mockUsersData[userId];
      if (currentMockUser && currentMockUser.id === userId) {
        currentMockUser = null; // 如果删除的是当前用户，则清空
      }
      return Promise.resolve({ code: 200, message: '用户删除成功 (Mock)', data: null });
    }
    return Promise.resolve({ code: 404, message: '用户不存在 (Mock)', data: null });
  },

  // 模拟获取所有角色列表 (用于用户管理中分配角色)
  getRolesList() {
    // 这里可以定义一些固定的角色
    const allRoles = [
      { id: 'ROLE_ADMIN', name: '系统管理员', description: '拥有所有权限' },
      { id: 'ROLE_SALES_MANAGER', name: '销售经理', description: '管理销售团队和订单审核' },
      { id: 'ROLE_SALES', name: '销售员', description: '创建和管理销售订单' },
      { id: 'ROLE_PURCHASING_MANAGER', name: '采购经理', description: '管理采购计划和订单审批' },
      { id: 'ROLE_PURCHASER', name: '采购员', description: '创建和管理采购相关单据' },
      { id: 'ROLE_WAREHOUSE', name: '仓库管理员', description: '管理库存、出入库操作' },
      { id: 'ROLE_USER', name: '普通用户', description: '基本查看权限' },
    ];
    return Promise.resolve({
        code: 200,
        message: '获取角色列表成功 (Mock)',
        data: {
            content: allRoles, // 假设返回 content 数组
            totalElements: allRoles.length
        }
    });
  },
  assignRolesToUser(userId, roleIds) {
    console.log(`[Mock /users.js] assignRolesToUser: userId=${userId}, roleIds=`, roleIds);
    if (mockUsersData[userId]) {
        mockUsersData[userId].roles = roleIds || [];
         if (currentMockUser && currentMockUser.id === userId) {
            currentMockUser.roles = roleIds || [];
        }
        return Promise.resolve({ code: 200, message: '角色分配成功 (Mock)', data: { ...mockUsersData[userId] } });
    }
    return Promise.resolve({ code: 404, message: '用户不存在 (Mock)', data: null });
  }
};

export default usersMock;