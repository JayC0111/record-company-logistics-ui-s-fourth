// src/stores/modules/auth.js
import { defineStore } from 'pinia';
import { login as loginApi, getUserInfo as getUserInfoApi, logout as logoutApi } from '@/api/auth';
import router from '@/router';

export const useUserStore = defineStore('user', {
  state: () => {
    let storedUserInfo = localStorage.getItem('userInfo');
    let parsedUserInfo = {}; // 默认空对象

    if (storedUserInfo && storedUserInfo !== 'undefined' && storedUserInfo !== 'null') {
      try {
        const tempParsed = JSON.parse(storedUserInfo);
        // 确保解析出来的是一个对象并且不是null
        if (typeof tempParsed === 'object' && tempParsed !== null) {
          parsedUserInfo = tempParsed;
        } else {
          // 如果解析出来不是对象，或者解析出null（例如localStorage存的是字符串'null'）
          console.warn("Parsed userInfo from localStorage is not a valid object, or is null. Clearing.");
          localStorage.removeItem('userInfo');
        }
      } catch (e) {
        console.error("Failed to parse userInfo from localStorage on init, removing invalid item:", e);
        localStorage.removeItem('userInfo'); // 解析失败则移除无效数据
      }
    } else if (storedUserInfo === 'undefined' || storedUserInfo === 'null') {
      // 如果 localStorage 中明确存的是 "undefined" 或 "null" 字符串，也移除
      console.warn(`localStorage contained '${storedUserInfo}' for userInfo. Clearing.`);
      localStorage.removeItem('userInfo');
    }

    return {
      token: localStorage.getItem('token') || null,
      userInfo: parsedUserInfo, // userInfo 保证是一个对象
    };
  },
  getters: {
    isLoggedIn: (state) => !!state.token && !!state.userInfo && !!state.userInfo.id, // 检查userInfo中是否有id确保是有效用户对象
    currentUser: (state) => state.userInfo,
    userRoles: (state) => state.userInfo?.roles || [],
  },
  actions: {
    async login(credentials) {
      try {
        const response = await loginApi(credentials.username, credentials.password);
        if (response.code === 200 && response.data && response.data.token) {
          this.token = response.data.token;
          localStorage.setItem('token', this.token);
          await this.fetchUserInfo(); // 获取用户信息

          // 检查 fetchUserInfo 是否成功填充了 userInfo
          if (this.userInfo && this.userInfo.id) {
            return true; // 表示登录和用户信息获取均成功
          } else {
            // Token 获取了，但用户信息获取失败，这是一种异常情况
            // fetchUserInfo 内部失败时会尝试清除状态，这里再次确保
            this.token = null;
            this.userInfo = {}; // 确保userInfo是对象
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            throw new Error('登录成功，但获取用户信息时出错。');
          }
        } else {
          throw new Error(response.message || '登录凭证无效或登录请求失败');
        }
      } catch (error) {
        // 确保出错时清除状态
        this.token = null;
        this.userInfo = {}; // 确保userInfo是对象
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        console.error('Login action overall failed:', error);
        throw error; // 将错误继续抛出，以便登录页面可以捕获并显示
      }
    },
    async fetchUserInfo() {
      if (!this.token) {
        console.warn('fetchUserInfo called without a token. Aborting.');
        this.userInfo = {}; // 确保 userInfo 是对象
        localStorage.removeItem('userInfo'); // 清除可能存在的旧信息
        return; // 没有token，不执行获取
      }
      try {
        const response = await getUserInfoApi();
        // 确保 response.data 是一个非null的对象
        if (response.code === 200 && response.data && typeof response.data === 'object' && Object.keys(response.data).length > 0) {
          this.userInfo = response.data;
          console.log('Storing userInfo to localStorage:', this.userInfo);
          localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
        } else {
          console.error('fetchUserInfo: API call successful but response.data is invalid or empty.', response);
          // 即使API调用成功，但如果data不符合预期，也视为获取失败
          // 清除token和userInfo，因为当前token可能对应一个无效的用户状态
          this.token = null;
          this.userInfo = {}; // 确保userInfo是对象
          localStorage.removeItem('token');
          localStorage.removeItem('userInfo');
          throw new Error(response.message || '获取到的用户信息格式不正确或为空');
        }
      } catch (error) {
        console.error('Fetch user info failed with error:', error);
        // 获取用户信息失败通常意味着token无效或后端服务问题
        // 清除所有登录状态
        this.token = null;
        this.userInfo = {}; // 确保userInfo是对象
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        // 登出接口是可选的，即使失败也不应阻塞前端状态清除
        logoutApi().catch(logoutError => {
          console.error('Backend logout call during fetchUserInfo error failed:', logoutError);
        });
        // 不在这里强制跳转，让调用者（如路由守卫或登录流程）决定
        // throw error; // 可以选择是否向上抛出错误
      }
    },
    logout() {
      console.log('Executing logout action. Current route:', router.currentRoute.value.fullPath);
      const redirectTarget = router.currentRoute.value.name === 'Login' ? undefined : router.currentRoute.value.fullPath;

      this.token = null;
      this.userInfo = {}; // 确保userInfo是对象
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');

      logoutApi().catch(error => {
        console.error('Backend logout failed:', error);
      });

      const query = {};
      if (redirectTarget) {
        query.redirect = redirectTarget;
      }
      router.push({ path: '/login', query });
    },
    setUserInfo(userInfoData) {
      if (userInfoData && typeof userInfoData === 'object') {
        this.userInfo = userInfoData;
        localStorage.setItem('userInfo', JSON.stringify(this.userInfo));
      } else {
        console.warn('setUserInfo: provided data is not a valid object, clearing userInfo.');
        this.clearUserInfo();
      }
    },
    clearUserInfo() {
      this.userInfo = {}; // 确保userInfo是对象
      localStorage.removeItem('userInfo');
    }
  },
});