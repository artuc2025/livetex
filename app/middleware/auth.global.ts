import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore();

  if (to.path === '/login') {
    if (authStore.isLoggedIn) return navigateTo('/');
    return;
  }

  if (!authStore.isLoggedIn) return navigateTo('/login');
});
