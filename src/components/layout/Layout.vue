<template>
  <div class="app-wrapper">
    <SideMenu
      :is-collapse="isCollapse"
      :routes="permissionRoutesComputed" class="sidebar-container"
      :class="{ 'is-collapse': isCollapse }"
    />

    <div class="main-container">
      <HeaderNav
        :is-collapse="isCollapse"
        @toggle-sidebar="toggleSidebar"
      />

      <div class="app-main">
        <router-view v-slot="{ Component, route }">
          <keep-alive :include="cachedViews">
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import SideMenu from './SideMenu.vue'; // 假设 SideMenu 和 HeaderNav 在同级
import HeaderNav from './HeaderNav.vue';
import { useUserStore } from '@/stores/modules/auth'; // 引入 user store

const router = useRouter();
const userStore = useUserStore(); // 获取 store 实例
const isCollapse = ref(false);

const cachedViews = ref([
  'SalesOrderManagement',
  'CreateSalesOrder',
  // ... 其他需要缓存的组件名
]);

const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value;
  localStorage.setItem('sidebarStatus', isCollapse.value ? 'collapsed' : 'expanded');
};

// 使用 permissionRoutesComputed 作为计算属性的名称，避免与可能存在的 props 或其他变量冲突
const permissionRoutesComputed = computed(() => {
  // 直接从 store 获取已经解析好的 userInfo 对象
  const currentUserInfo = userStore.currentUser; // 使用 getter
  const userRoles = currentUserInfo?.roles || []; // 从 currentUser 获取 roles
  // console.log('Layout.vue - permissionRoutes - currentUserInfo from store:', currentUserInfo);
  // console.log('Layout.vue - permissionRoutes - userRoles:', userRoles);
  return filterRoutes(router.options.routes, userRoles);
});

const filterRoutes = (routes, userRoles) => {
  const filteredRoutes = [];
  routes.forEach(route => {
    if (route.path === '/login' || route.meta?.hidden) {
      return;
    }
    const tmp = { ...route };
    if (hasPermission(userRoles, tmp)) {
      if (tmp.children) {
        tmp.children = filterRoutes(tmp.children, userRoles);
      }
      if ((tmp.children && tmp.children.length > 0) || (!tmp.children && tmp.component) || (tmp.path === '/' && tmp.redirect && (!tmp.children || tmp.children.length === 0))) {
        filteredRoutes.push(tmp);
      } else if (tmp.children && tmp.children.length === 0 && !tmp.component && tmp.redirect) {
        if (tmp.path ==='/' && tmp.redirect) {
          filteredRoutes.push(tmp);
        }
      }
    }
  });
  return filteredRoutes;
};

const hasPermission = (roles, route) => {
  if (route.meta && route.meta.roles) {
    return roles.some(role => route.meta.roles.includes(role));
  } else {
    return true;
  }
};

onMounted(() => {
  const savedState = localStorage.getItem('sidebarStatus');
  isCollapse.value = savedState === 'collapsed';
});
</script>

<style scoped>
/* 您提供的样式 */
.app-wrapper {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.sidebar-container {
  width: var(--sidebar-width, 210px);
  height: 100%;
  background-color: white;
  transition: width 0.28s;
  overflow-y: auto;
  border-right: 1px solid var(--border-color-lighter, #ebeef5);
  flex-shrink: 0;
}

.sidebar-container.is-collapse {
  width: var(--sidebar-collapsed-width, 64px);
}

.sidebar-container::-webkit-scrollbar {
  display: none;
}
.sidebar-container {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-color);
}

.app-main {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  height: calc(100vh - var(--header-height, 50px));
}
</style>