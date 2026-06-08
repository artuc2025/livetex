<template>
  <div class="login">
    <div class="login__card">
      <h1 class="login__title">Welcome</h1>
      <p class="login__subtitle">Click to sign in with a demo account</p>
      <button class="login__btn" @click="handleLogin">Log in</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

definePageMeta({ layout: false });

const authStore = useAuthStore();

async function handleLogin() {
  authStore.login();
  await navigateTo('/');
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.login__card {
  background: #fff;
  border-radius: 12px;
  padding: 48px 40px;
  text-align: center;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  min-width: 320px;
}

.login__title {
  margin: 0 0 8px;
  font-size: 24px;
  color: #1a1a2e;
}

.login__subtitle {
  margin: 0 0 32px;
  font-size: 14px;
  color: #666;
}

.login__btn {
  background: #1a1a2e;
  color: #fff;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.login__btn:hover {
  opacity: 0.85;
}
</style>
