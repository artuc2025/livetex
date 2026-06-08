<template>
  <div class="home">
    <h1 class="home__title">Welcome, {{ authStore.fullName }}</h1>
    <div class="home__info">
      <p><strong>Email:</strong> {{ authStore.email }}</p>
      <p><strong>Phone:</strong> {{ authStore.phone_number }}</p>
    </div>
    <p class="home__hint">Click the chat icon in the header to open LiveTex support chat.</p>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
</script>

<style scoped>
.home {
  max-width: 600px;
}

.home__title {
  font-size: 28px;
  color: #1a1a2e;
  margin: 0 0 24px;
}

.home__info {
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.home__info p {
  margin: 6px 0;
  font-size: 14px;
  color: #444;
}

.home__hint {
  font-size: 13px;
  color: #888;
}
</style>
