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
    async logout() {
      const { reinit } = useLiveTexChat();
      await reinit();
      this.fullName = '';
      this.email = '';
      this.phone_number = '';
      this.isLoggedIn = false;
      await navigateTo('/login');
    },
  },
});
