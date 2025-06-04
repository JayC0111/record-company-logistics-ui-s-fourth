<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <img src="@/assets/images/logo-text.png" alt="唱片公司物流系统" class="logo">
        <h3 class="title">唱片公司物流信息管理系统</h3>
      </div>

      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" class="login-form" @submit.prevent>
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名 (e.g., sales / admin)"
            :prefix-icon="User"
            size="large"
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码 (e.g., 123456)"
            :prefix-icon="Lock"
            show-password
            size="large"
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="loginForm.rememberMe">记住我</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button
            :loading="loading"
            type="primary"
            size="large"
            class="login-button"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
// 引入 Pinia store
import { useUserStore } from '@/stores/modules/auth';

// 路由实例
const router = useRouter();
const route = useRoute();

// Pinia store 实例
const userStore = useUserStore();

// 表单引用
const loginFormRef = ref(null);

// 加载状态
const loading = ref(false);

// 表单数据
const loginForm = reactive({
  username: '',
  password: '',
  rememberMe: false
});

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    // 密码长度校验可以根据实际需求保留或移除
    // { min: 6, message: '密码长度不能少于6个字符', trigger: 'blur' }
  ]
};

// 处理登录
const handleLogin = () => {
  if (!loginFormRef.value) return;
  loginFormRef.value.validate(async (valid) => {
    if (!valid) {
      return;
    }

    loading.value = true;
    try {
      // 调用 Pinia store 中的 login action
      const loginSuccess = await userStore.login({
        username: loginForm.username,
        password: loginForm.password
      });

      if (loginSuccess) {
        // 记住密码逻辑
        if (loginForm.rememberMe) {
          localStorage.setItem('rememberedUsername', loginForm.username);
        } else {
          localStorage.removeItem('rememberedUsername');
        }

        ElMessage.success('登录成功');

        // 跳转到首页或重定向页面
        const redirect = route.query.redirect || '/'; // 默认跳转到首页
        router.replace(redirect); // 使用 replace 避免回退到登录页
      }
      // 如果 loginSuccess 为 false 或 store action 抛出错误，会在 catch 中处理
    } catch (error) {
      // 错误信息通常由 request.js 的拦截器或 auth.js store 中的 action 的 ElMessage 提示
      // 这里可以只做 console.error，或者如果 store action 没有 ElMessage，则在此处添加
      console.error('登录失败 (LoginView.vue):', error.message || error);
      // ElMessage.error(error.message || '登录时发生错误，请重试');
    } finally {
      loading.value = false;
    }
  });
};

// 组件挂载时，检查是否有记住的用户名
onMounted(() => {
  const rememberedUsername = localStorage.getItem('rememberedUsername');
  if (rememberedUsername) {
    loginForm.username = rememberedUsername;
    loginForm.rememberMe = true;
  }
});
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #1a237e, #283593); /* 深蓝渐变背景 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 400px;
  padding: 30px; /* 内边距 */
  background-color: white;
  border-radius: 8px; /* 圆角 */
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); /* 更柔和的阴影 */
}

.login-header {
  text-align: center;
  margin-bottom: 30px; /* 头部和表单之间的间距 */
}

.logo {
  height: 40px; /* 或者根据您的logo调整 */
  margin-bottom: 10px;
}

.title {
  font-size: 20px;
  color: #333; /* 深灰色文字 */
  margin: 10px 0;
}

.login-form {
  margin-top: 20px; /* 表单和头部的间距 */
}

.login-button {
  width: 100%;
}

/* 可以为 el-input 添加一些样式调整，如果需要的话 */
.el-form-item {
  margin-bottom: 22px; /* 调整表单项间距 */
}
</style>