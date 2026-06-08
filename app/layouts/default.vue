<template>
  <div class="app">
    <header class="header">
      <span class="header__title">LiveTex Demo</span>
      <div class="header__actions">
        <button class="header__chat-btn" title="Support chat" @click="openChat">
          <SvgoSupportChat />
        </button>
        <button class="header__logout-btn" @click="authStore.logout()">Logout</button>
      </div>
    </header>
    <main class="main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
const { open: openChat, setVisitor } = useLiveTexChat();

watch(
  () => authStore.fullName,
  name => {
    if (!name) return;
    setVisitor({ name, email: authStore.email, phone: authStore.phone_number });
  },
  { immediate: true },
);
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #1a1a2e;
  color: #fff;
}

.header__title {
  font-weight: 600;
  font-size: 16px;
}

.header__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header__chat-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 6px;
  border-radius: 6px;
  transition: background 0.15s;
}

.header__chat-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.header__logout-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  transition: background 0.15s;
}

.header__logout-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.main {
  flex: 1;
  padding: 40px 24px;
}
</style>
