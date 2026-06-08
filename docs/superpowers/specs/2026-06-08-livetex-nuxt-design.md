# LiveTex + Nuxt 3 Minimal Demo — Design Spec

**Date:** 2026-06-08
**Source spec:** `LIVETEX_CHAT_INTEGRATION.md`

---

## Goal

Scaffold a minimal Nuxt 3 application that demonstrates the LiveTex classic `client.js` chat widget integration. The app has just enough structure to exercise the full integration flow: login → widget loads → visitor identity set → chat opens → logout → widget state reset.

## Scope decisions

| Decision | Choice | Reason |
|---|---|---|
| App scope | Minimal demo | Two pages, no real backend |
| i18n | Skipped | Plain `fullName: string` in auth store |
| Auth form | Hardcoded mock user | Single "Log in" button — no credentials |
| Vitest tests | Skipped | Keep scaffold lean |
| Plugin config | `runtimeConfig.public.livetex.*` | Spec's recommended variant (not hardcoded) |

---

## File structure

```
livetex/
├── assets/icons/support-chat.svg
├── composables/useLiveTexChat.ts
├── layouts/default.vue
├── middleware/auth.ts
├── pages/
│   ├── index.vue
│   └── login.vue
├── plugins/livetex.client.ts
├── stores/auth.ts
├── types/livetex.d.ts
├── .env
├── .env.example
└── nuxt.config.ts
```

---

## Architecture

### Route structure

- `/login` — guest only. Single "Log in" button. Redirects to `/` if already authenticated.
- `/` — authenticated only. "Welcome, [name]" + logout button. Redirects to `/login` if not authenticated.

Route enforcement: `middleware/auth.ts` — global middleware that checks `authStore.isLoggedIn`.

### Layout

`layouts/default.vue` wraps all pages. The header contains:
- App title (left)
- Support chat icon button (`<svgo-support-chat />`) — right side, `@click="openChat"`
- Logout button — right side, `@click="authStore.logout()"`

The header is always rendered; the middleware ensures unauthenticated users never see it (they are on `/login` which uses no layout, or are redirected before reaching the layout).

### Auth store (`stores/auth.ts`)

```
state:
  isLoggedIn: boolean = false
  fullName: string = ''
  email: string = ''
  phone_number: string = ''

login():
  sets hardcoded mock: { fullName: 'Иван Петров', email: 'ivan@example.com', phone_number: '+79001234567' }
  isLoggedIn = true

logout():
  useLiveTexChat().reinit()     // clears LiveTex localStorage visitor data
  resets state to defaults
  window.location.href = '/login'  // full page reload — completes widget visual reset
```

### LiveTex plugin (`plugins/livetex.client.ts`)

Client-only plugin. On setup:

1. Reads `config.public.livetex.loaderSrc` and `config.public.livetex.contactPointId`.
2. Guards against missing config (logs warning, returns early).
3. Guards against double-inject (`#livetex-loader` already in DOM).
4. Sets `window.liveTex`, `window.liveTexID`, `window.liveTex_object` globals.
5. Creates and appends `<script id="livetex-loader" async>`.
6. On `script.onload`: polls `window.LiveTex.hideLabel` every 200ms (10s timeout), calls it once available.

### LiveTex composable (`composables/useLiveTexChat.ts`)

Verbatim from spec §4.2. Exposes `{ open, setVisitor, reinit }`. Internally polls `window.LiveTex.showActiveWindow` for readiness before acting. No project dependencies — touches only `window.LiveTex`.

### Header wiring (`layouts/default.vue`)

```ts
const { open: openChat, setVisitor } = useLiveTexChat()

watch(
  () => authStore.fullName,
  name => {
    if (!name) return
    setVisitor({ name, email: authStore.email, phone: authStore.phone_number })
  },
  { immediate: true }
)
```

`setVisitor` fires as soon as the store has a name (immediate). The composable waits for widget readiness internally, so calling early is safe.

### Configuration (`nuxt.config.ts`)

```ts
runtimeConfig: {
  public: {
    livetex: {
      loaderSrc: process.env.NUXT_PUBLIC_LIVETEX_LOADER_SRC,
      contactPointId: process.env.NUXT_PUBLIC_LIVETEX_CONTACT_POINT_ID,
    },
  },
},
modules: ['@pinia/nuxt', 'nuxt-svgo'],
```

### Environment variables (`.env`)

```
NUXT_PUBLIC_LIVETEX_LOADER_SRC=https://cs15.livetex.ru/js/client.js
NUXT_PUBLIC_LIVETEX_CONTACT_POINT_ID=183834
```

---

## Data flow

```
1. User clicks "Log in"
   → authStore.login() → isLoggedIn = true
   → navigateTo('/')

2. default.vue mounts, watch fires immediately
   → setVisitor({ name: 'Иван Петров', email, phone })
   → composable polls until LiveTex ready, then calls setConversationAttributes()

3. User clicks chat icon
   → openChat() → LiveTex.showActiveWindow()

4. User clicks logout
   → authStore.logout()
   → reinit() clears LiveTex localStorage
   → window.location.href = '/login' (full reload resets widget visually)
```

---

## Error handling

- Missing env vars → plugin logs warning and exits early; chat icon is present but `open()` resolves as no-op (composable handles gracefully).
- Widget not ready within 10s → composable logs `[livetex] widget not ready in time` and resolves null; all calls are no-ops.
- `client.js` load failure → `script.onerror` logs to console; no user-visible crash.

---

## Verification checklist (manual)

1. `npm run dev` → app loads at `localhost:3000`
2. Unauthenticated visit to `/` → redirects to `/login`
3. Click "Log in" → redirects to `/`, header visible with chat icon
4. Network tab → `client.js` loads once (no duplicate)
5. Default floating LiveTex label is hidden
6. Click chat icon → widget opens
7. Operator console shows visitor name / email / phone
8. Click logout → redirect to `/login`, page fully reloads
9. Log in again → fresh conversation (reinit worked)
