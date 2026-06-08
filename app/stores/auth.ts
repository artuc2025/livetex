import { defineStore } from 'pinia';
import { useLiveTexChat } from '~/composables/useLiveTexChat';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: false,
    fullName: '',
    email: '',
    phone_number: '',
  }),
  actions: {
    login() {
      this.fullName = 'Иван Петров';
      this.email = 'ivan@example.com';
      this.phone_number = '+79001234567';
      this.isLoggedIn = true;
    },
    logout() {
      const { reinit } = useLiveTexChat();
      reinit();
      this.fullName = '';
      this.email = '';
      this.phone_number = '';
      this.isLoggedIn = false;
      window.location.href = '/login';
    },
  },
});
