# LiveTex + Nuxt 3 Minimal Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a minimal Nuxt 3 app with a Pinia auth store, two pages (login / home), and a fully wired LiveTex classic `client.js` chat integration driven by a custom composable.

**Architecture:** Client-only Nuxt plugin injects the LiveTex script and hides the default label. A typed composable (`useLiveTexChat`) is the only public API — it polls for widget readiness before acting. The default layout header hosts the chat button and reactively sets visitor identity from the Pinia auth store.

**Tech Stack:** Nuxt 3, Pinia (`@pinia/nuxt`), nuxt-svgo, TypeScript, LiveTex Widgets API 3.0 (classic `client.js`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app.vue` | Modify | Wire `<NuxtLayout>` + `<NuxtPage>` |
| `nuxt.config.ts` | Modify | Add modules, runtimeConfig |
| `.env` | Create | Live account values |
| `.env.example` | Create | Placeholder values for repo |
| `types/livetex.d.ts` | Create | `LiveTexGlobal`, `LiveTexVisitor`, `Window` augmentation |
| `composables/useLiveTexChat.ts` | Create | `open`, `setVisitor`, `reinit` — only public API |
| `plugins/livetex.client.ts` | Create | Inject script, poll + hide default label |
| `assets/icons/support-chat.svg` | Create | Chat button icon |
| `stores/auth.ts` | Create | Mock user state, `login()`, `logout()` with `reinit()` |
| `middleware/auth.global.ts` | Create | Redirect unauthenticated → `/login`; logged-in → `/` |
| `layouts/default.vue` | Create | Header: title, chat icon btn, logout btn; visitor watcher |
| `pages/login.vue` | Create | Single "Log in" button, no layout |
| `pages/index.vue` | Create | Authenticated home: user info display |

---

## Task 1: Scaffold Nuxt 3 project

**Files:**
- Create: project root (nuxi scaffold)

- [ ] **Step 1: Run nuxi init in the current directory**

```powershell
npx nuxi@latest init . --package-manager npm
```

> If prompted "Directory is not empty, continue?" — enter `y`.
> When asked for package manager — select `npm`.
> When asked to initialize git — select `No` (we'll git init separately if needed).

- [ ] **Step 2: Install dependencies**

```powershell
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Verify dev server starts**

```powershell
npm run dev
```

Expected: Output includes `Nuxt ... ready` and `localhost:3000`. Stop with `Ctrl+C` once confirmed.

- [ ] **Step 4: Install Pinia and nuxt-svgo**

```powershell
npm install @pinia/nuxt nuxt-svgo
```

Expected: Both packages appear in `package.json` dependencies.

- [ ] **Step 5: Commit scaffold**

```powershell
git add -A
git commit -m "chore: scaffold nuxt 3 project"
```

---

## Task 2: Configure nuxt.config.ts

**Files:**
- Modify: `nuxt.config.ts`

- [ ] **Step 1: Replace nuxt.config.ts with full config**

Open `nuxt.config.ts` and replace its entire content with:

```ts
export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: '2024-11-01',
  modules: ['@pinia/nuxt', 'nuxt-svgo'],
  runtimeConfig: {
    public: {
      livetex: {
        loaderSrc: process.env.NUXT_PUBLIC_LIVETEX_LOADER_SRC,
        contactPointId: process.env.NUXT_PUBLIC_LIVETEX_CONTACT_POINT_ID,
      },
    },
  },
})
```

- [ ] **Step 2: Commit**

```powershell
git add nuxt.config.ts
git commit -m "chore: add pinia, nuxt-svgo modules and livetex runtimeConfig"
```

---

## Task 3: Set up environment variables

**Files:**
- Create: `.env`
- Create: `.env.example`

- [ ] **Step 1: Create .env with real account values**

Create `.env` at project root:

```
# LiveTex chat widget (classic client.js)
NUXT_PUBLIC_LIVETEX_LOADER_SRC=https://cs15.livetex.ru/js/client.js
NUXT_PUBLIC_LIVETEX_CONTACT_POINT_ID=183834
```

- [ ] **Step 2: Create .env.example with placeholder values**

Create `.env.example` at project root:

```
# LiveTex chat widget (classic client.js, from LiveTex ЛК install snippet)
# Loader script URL — e.g. https://cs15.livetex.ru/js/client.js
NUXT_PUBLIC_LIVETEX_LOADER_SRC=

# Contact point id (liveTexID in the install snippet) — e.g. 183834
NUXT_PUBLIC_LIVETEX_CONTACT_POINT_ID=
```

- [ ] **Step 3: Ensure .env is gitignored**

Check that `.gitignore` contains `.env` (nuxi scaffold adds this by default). If not, add it:

```
.env
```

- [ ] **Step 4: Commit**

```powershell
git add .env.example .gitignore
git commit -m "chore: add livetex env vars and .env.example"
```

> Do NOT `git add .env` — it contains real credentials.

---

## Task 4: Create TypeScript types

**Files:**
- Create: `types/livetex.d.ts`

- [ ] **Step 1: Create the types file**

Create `types/livetex.d.ts`:

```ts
/** Widgets API 3.0 surface exposed by the classic client.js widget. */
export interface LiveTexGlobal {
  /** Opens the currently active widget window (bot / operator chat / offline). */
  showActiveWindow?: () => void;
  /** Sets prechat fields. `visible` keys are shown to the operator; `hidden` are not. */
  setConversationAttributes?: (visible: Record<string, string>, hidden: Record<string, string>) => void;
  /** Hides the standard widget label. */
  hideLabel?: () => void;
  /** Reinitializes the widget (resets visitor/conversation state). */
  reinit?: () => void;
}

/** Input shape for setVisitor — mapped to visible conversation attributes. */
export interface LiveTexVisitor {
  name?: string;
  email?: string;
  phone?: string;
}

declare global {
  interface Window {
    LiveTex?: LiveTexGlobal;
    liveTex?: boolean;
    liveTexID?: number;
    liveTex_object?: boolean;
  }
}
```

- [ ] **Step 2: Commit**

```powershell
git add types/livetex.d.ts
git commit -m "feat: add LiveTex TypeScript type definitions"
```

---

## Task 5: Create the LiveTex composable

**Files:**
- Create: `composables/useLiveTexChat.ts`

- [ ] **Step 1: Create the composable**

Create `composables/useLiveTexChat.ts`:

```ts
import type { LiveTexGlobal, LiveTexVisitor } from '~/types/livetex';

interface UseLiveTexChatOptions {
  timeoutMs?: number;
  pollMs?: number;
}

/** The classic client.js predefines `window.LiveTex` with only `onLiveTexReady`; methods are attached on load. */
function isReady(lt: LiveTexGlobal | undefined): lt is LiveTexGlobal {
  return !!lt && typeof lt.showActiveWindow === 'function';
}

export function useLiveTexChat(options: UseLiveTexChatOptions = {}) {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const pollMs = options.pollMs ?? 200;

  function ensureReady(): Promise<LiveTexGlobal | null> {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (isReady(window.LiveTex)) return Promise.resolve(window.LiveTex);
    return new Promise(resolve => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (isReady(window.LiveTex)) {
          clearInterval(timer);
          resolve(window.LiveTex);
        } else if (Date.now() - start >= timeoutMs) {
          clearInterval(timer);
          console.warn('[livetex] widget not ready in time — chat unavailable');
          resolve(null);
        }
      }, pollMs);
    });
  }

  function toVisibleAttributes(visitor: LiveTexVisitor): Record<string, string> {
    const visible: Record<string, string> = {};
    if (visitor.name) visible['Имя'] = visitor.name;
    if (visitor.email) visible['Email'] = visitor.email;
    if (visitor.phone) visible['Телефон'] = visitor.phone;
    return visible;
  }

  async function open(): Promise<void> {
    const lt = await ensureReady();
    lt?.showActiveWindow?.();
  }

  /** Must run before open() so the operator sees the visitor's identity. */
  async function setVisitor(visitor: LiveTexVisitor): Promise<void> {
    const lt = await ensureReady();
    lt?.setConversationAttributes?.(toVisibleAttributes(visitor), {});
  }

  // Clears visitor data in localStorage but does not visually reset the widget.
  // A full page reload is required for fresh server state — logout's redirect provides it.
  async function reinit(): Promise<void> {
    const lt = await ensureReady();
    lt?.reinit?.();
  }

  return { open, setVisitor, reinit };
}
```

- [ ] **Step 2: Commit**

```powershell
git add composables/useLiveTexChat.ts
git commit -m "feat: add useLiveTexChat composable"
```

---

## Task 6: Create the LiveTex plugin

**Files:**
- Create: `plugins/livetex.client.ts`

- [ ] **Step 1: Create the plugin**

Create `plugins/livetex.client.ts`:

```ts
export default defineNuxtPlugin({
  name: 'livetex-client',
  setup() {
    const config = useRuntimeConfig();
    const loaderSrc = config.public.livetex.loaderSrc as string | undefined;
    const contactPointId = config.public.livetex.contactPointId as string | undefined;

    if (import.meta.dev) console.log('[livetex] plugin setup', { loaderSrc, contactPointId });

    if (!loaderSrc || !contactPointId) {
      console.warn('[livetex] loaderSrc / contactPointId is not set — chat disabled');
      return;
    }

    if (document.getElementById('livetex-loader')) return;

    // Globals the classic client.js reads on load (mirrors the LiveTex install snippet).
    window.liveTex = true;
    window.liveTexID = Number(contactPointId);
    window.liveTex_object = true;

    const script = document.createElement('script');
    script.id = 'livetex-loader';
    script.async = true;
    script.src = loaderSrc;
    // This widget build does not invoke onLiveTexReady, so poll for the API and hide the default
    // label once available — the chat is driven from our own header button.
    script.onload = () => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (typeof window.LiveTex?.hideLabel === 'function') {
          clearInterval(timer);
          window.LiveTex.hideLabel();
          if (import.meta.dev) console.log('[livetex] ready — hideLabel called');
        } else if (Date.now() - start >= 10_000) {
          clearInterval(timer);
        }
      }, 200);
    };
    script.onerror = e => console.error('[livetex] client.js failed to load', e);
    document.head.appendChild(script);
  },
});
```

- [ ] **Step 2: Commit**

```powershell
git add plugins/livetex.client.ts
git commit -m "feat: add livetex client plugin"
```

---

## Task 7: Add the support chat SVG icon

**Files:**
- Create: `assets/icons/support-chat.svg`

- [ ] **Step 1: Create the assets directory and SVG**

Create `assets/icons/support-chat.svg`:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

- [ ] **Step 2: Commit**

```powershell
git add assets/icons/support-chat.svg
git commit -m "feat: add support-chat SVG icon"
```

---

## Task 8: Create the Pinia auth store

**Files:**
- Create: `stores/auth.ts`

- [ ] **Step 1: Create the store**

Create `stores/auth.ts`:

```ts
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
```

- [ ] **Step 2: Commit**

```powershell
git add stores/auth.ts
git commit -m "feat: add Pinia auth store with mock login/logout"
```

---

## Task 9: Create the route middleware

**Files:**
- Create: `middleware/auth.global.ts`

> The `.global` suffix makes Nuxt run this middleware on every navigation automatically — no `definePageMeta` needed in individual pages.

- [ ] **Step 1: Create the middleware**

Create `middleware/auth.global.ts`:

```ts
import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore();

  if (to.path === '/login') {
    if (authStore.isLoggedIn) return navigateTo('/');
    return;
  }

  if (!authStore.isLoggedIn) return navigateTo('/login');
});
```

- [ ] **Step 2: Commit**

```powershell
git add middleware/auth.global.ts
git commit -m "feat: add global auth route middleware"
```

---

## Task 10: Update app.vue

**Files:**
- Modify: `app.vue`

- [ ] **Step 1: Replace app.vue content**

Open `app.vue` (created by nuxi init) and replace its entire content with:

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

- [ ] **Step 2: Commit**

```powershell
git add app.vue
git commit -m "chore: wire NuxtLayout and NuxtPage in app.vue"
```

---

## Task 11: Create the default layout

**Files:**
- Create: `layouts/default.vue`

- [ ] **Step 1: Create the layout**

Create `layouts/default.vue`:

```vue
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
```

- [ ] **Step 2: Commit**

```powershell
git add layouts/default.vue
git commit -m "feat: add default layout with header and LiveTex chat button"
```

---

## Task 12: Create pages

**Files:**
- Create: `pages/login.vue`
- Create: `pages/index.vue`

- [ ] **Step 1: Create pages directory if it doesn't exist**

```powershell
if (-not (Test-Path "pages")) { New-Item -ItemType Directory "pages" }
```

- [ ] **Step 2: Create the login page**

Create `pages/login.vue`:

```vue
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
```

- [ ] **Step 3: Create the home page**

Create `pages/index.vue`:

```vue
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
```

- [ ] **Step 4: Commit**

```powershell
git add pages/login.vue pages/index.vue
git commit -m "feat: add login and home pages"
```

---

## Task 13: Final verification

- [ ] **Step 1: Start the dev server**

```powershell
npm run dev
```

Expected output includes: `Nuxt ... ready` and URL `http://localhost:3000`

- [ ] **Step 2: Test unauthenticated redirect**

Open `http://localhost:3000` in browser.

Expected: Browser redirects to `http://localhost:3000/login` and shows the "Welcome / Log in" card.

- [ ] **Step 3: Test login flow**

Click "Log in".

Expected: Redirects to `http://localhost:3000/`, shows `Welcome, Иван Петров`, header visible with chat icon and logout button.

- [ ] **Step 4: Verify client.js loads once (no duplicate)**

Open DevTools → Network tab → filter by `client.js`.

Expected: Exactly one request to `https://cs15.livetex.ru/js/client.js`.

- [ ] **Step 5: Verify default LiveTex label is hidden**

Expected: No floating LiveTex chat bubble visible in the corner of the page.

- [ ] **Step 6: Test chat opens with visitor identity**

Click the chat icon in the header.

Expected: LiveTex widget opens. If operator-side is accessible, verify the operator sees `Имя: Иван Петров`, `Email: ivan@example.com`, `Телефон: +79001234567`.

- [ ] **Step 7: Test logout and reinit**

Click "Logout".

Expected: Full page reload → redirected to `/login`. DevTools → Application → LocalStorage: LiveTex visitor keys cleared.

- [ ] **Step 8: Test fresh session after re-login**

Click "Log in" again, then open chat.

Expected: Fresh conversation (no previous history from the previous session).

- [ ] **Step 9: Final commit**

```powershell
git add -A
git commit -m "chore: complete livetex nuxt integration"
```
