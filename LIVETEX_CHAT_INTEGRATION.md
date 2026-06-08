LiveTex Chat Integration — Technical Integration Guide
Self-contained spec to integrate the LiveTex support-chat widget (classic client.js, Widgets API 3.0) into a Nuxt 3 application from scratch. Reproduces the integration done on the iBanking UI. Hand this whole file to an implementing agent.
--------------------------------------------------------------------------------
1. What this integration does
Loads the LiveTex classic client.js widget via a client-only Nuxt plugin.
Hides the widget's built-in floating label — the chat is opened from our own header button.
On open, passes the logged-in user's identity (name / email / phone) to the operator as conversation attributes (prechat fields).
On logout, calls reinit() to clear visitor state (full reset happens on the logout page reload).
Ships a typed composable useLiveTexChat() as the only public API surface.
Why this exact shape (critical context)
The LiveTex account here serves a build of client.js that does NOT invoke the documentedwindow.LiveTex.onLiveTexReady callback. So:
We cannot rely on onLiveTexReady. Instead we poll window.LiveTex until the API methods are attached (the global object exists early but its methods appear only after load finishes).
reinit() clears localStorage visitor data but does not visually reset an open conversation. A full page reload is required for fresh server state — logout already does a full reload, which completes the reset.
If your LiveTex build does fire onLiveTexReady, you may simplify the readiness logic, but the polling approach works in both cases and is the safe default.
--------------------------------------------------------------------------------
2. Prerequisites / assumptions about the target project
Requirement
Notes
Nuxt 3
Plugins (*.client.ts), defineNuxtPlugin, useRuntimeConfig, auto-imports.
Pinia
An auth store exposing username, email, phone_number, and a logout() action.
vue-i18n (useI18n)
Used to localize the visitor name. Optional — drop if you have no locale.
An SVG-as-component module
Project uses nuxt-svgo → <svgo-icon-name />. Any icon method works.
A header component
Anywhere persistent + authenticated to host the open-chat button.
A LiveTex account
You need a loader URL and a contact point id (see §3).
If the target lacks i18n or the exact auth fields, see §9 (Adapting) — the composable itself has zero project dependencies.
--------------------------------------------------------------------------------
3. Account values you must obtain from LiveTex ЛК (admin panel)
From the LiveTex install snippet in the LiveTex personal cabinet:
Loader src — e.g. https://cs15.livetex.ru/js/client.js (the subdomain cs15 is account-specific; copy it verbatim from your snippet).
Contact point id (liveTexID in the snippet) — e.g. 183834.
These two values are the only account-specific inputs. Everything else is generic.
--------------------------------------------------------------------------------
4. Files to create (verbatim)
4.1 types/livetex.d.ts
/** Widgets API 3.0 surface exposed by the classic client.js widget. */
export interface LiveTexGlobal {
  /** Opens the currently active widget window (bot / operator chat / offline). No params. */
  showActiveWindow?: () => void;
  /** Sets prechat fields. `visible` keys are shown to the operator; `hidden` are not. Call before opening. */
  setConversationAttributes?: (visible: Record<string, string>, hidden: Record<string, string>) => void;
  /** Hides the standard widget label. */
  hideLabel?: () => void;
  /** Reinitializes the widget (resets visitor/conversation state). */
  reinit?: () => void;
}

/** Our input shape for setVisitor — mapped to visible conversation attributes. */
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
4.2 composables/useLiveTexChat.ts
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

  /** Must run before open() so the operator sees the visitor's identity (per setConversationAttributes docs). */
  async function setVisitor(visitor: LiveTexVisitor): Promise<void> {
    const lt = await ensureReady();
    lt?.setConversationAttributes?.(toVisibleAttributes(visitor), {});
  }

  // Clears visitor data in localStorage but does not visually reset the widget (the open
  // conversation persists). A full page reload is required for fresh server state — on logout
  // the auth store already redirects (full reload), which completes the reset.
  async function reinit(): Promise<void> {
    const lt = await ensureReady();
    lt?.reinit?.();
  }

  return { open, setVisitor, reinit };
}
Attribute key names (Имя, Email, Телефон) are the labels the operator sees. Rename to your operator-facing language if needed — they are arbitrary strings, not API constants.
4.3 plugins/livetex.client.ts
export default defineNuxtPlugin({
  name: 'livetex-client',
  setup() {
    const config = useRuntimeConfig();
    const loaderSrc = 'https://cs15.livetex.ru/js/client.js' as string | undefined;
    const contactPointId = '183834';

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
⚠️ Hardcoded vs env — important. In the source project loaderSrc and contactPointId are hardcoded in the plugin (the config from useRuntimeConfig() is read but not used), even though the env/runtimeConfig plumbing (§5) also exists. This was a deliberate "hardcode for consistency" commit. Recommended for the new project: wire it to runtimeConfig instead — replace the two lines with:
and set the env vars (§5). Keep the !loaderSrc || !contactPointId guard so missing config disables the chat gracefully. The hardcoded form is only kept here to mirror the original exactly.
4.4 assets/icons/support-chat.svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
Uses stroke="currentColor" so it inherits theme color. With nuxt-svgo this becomes <svgo-support-chat />. If your project uses a different icon system, register/import the SVG however you normally do and swap the tag in §6.1.
--------------------------------------------------------------------------------
5. Configuration changes
5.1 nuxt.config.ts — add to runtimeConfig.public
runtimeConfig: {
  public: {
    // ...existing keys...
    livetex: {
      loaderSrc: process.env.NUXT_PUBLIC_LIVETEX_LOADER_SRC,
      contactPointId: process.env.NUXT_PUBLIC_LIVETEX_CONTACT_POINT_ID,
    },
  },
},
5.2 .env / .env.example
# LiveTex chat widget (classic client.js, from LiveTex ЛК install snippet)
# Loader script URL, e.g. https://cs15.livetex.ru/js/client.js
NUXT_PUBLIC_LIVETEX_LOADER_SRC=https://cs15.livetex.ru/js/client.js
# Contact point id (liveTexID in the install snippet), e.g. 183833
NUXT_PUBLIC_LIVETEX_CONTACT_POINT_ID=183834
Replace the values with the target account's loader src + contact point id from §3.
--------------------------------------------------------------------------------
6. Wiring into the app
6.1 Header button — open chat with visitor identity
In the authenticated header component:
Template — add a clickable icon:
<div class="header__icon header__icon--clickable" test-id="header-support-chat-btn" @click="openChat">
  <svgo-support-chat />
</div>
Script (<script setup lang="ts">) — push identity into the widget and open on click:
import { watch } from 'vue';
import { getUsernameByLocale } from '~/helpers/getUsernameByLocale';
import { useAuthStore } from '~/stores/auth';

const i18n = useI18n();
const authStore = useAuthStore();
const { open: openChat, setVisitor } = useLiveTexChat();

watch(
  () => authStore.username,
  username => {
    if (!username) return;
    setVisitor({
      name: getUsernameByLocale(username, i18n.locale.value),
      email: authStore.email,
      phone: authStore.phone_number,
    });
  },
  { immediate: true },
);
setVisitor is called reactively as soon as the username is known (immediate: true), so identity is set before the user clicks. The composable internally waits for widget readiness, so calling early is safe.
openChat (alias of open) is the click handler.
getUsernameByLocale(username, locale) resolves a localized display name. In the source project username is a Record<locale, string> map. If your auth store holds a plain string, pass it directly and delete the helper.
6.2 Auth store — reset on logout
In the auth store's logout() action, before the redirect/reload:
const logout = () => {
  const { reinit } = useLiveTexChat();
  reinit();

  // ...existing logout logic (disconnect signalR, clear cookies, redirect, etc.)...
};
reinit() clears localStorage visitor data; the existing logout redirect (a full page reload) finishes the visual reset.
--------------------------------------------------------------------------------
7. Tests — tests/composables/useLiveTexChat.spec.ts (Vitest)
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLiveTexChat } from '~/composables/useLiveTexChat';
import type { LiveTexGlobal } from '~/types/livetex';

function mockLiveTex(): LiveTexGlobal {
  return {
    showActiveWindow: vi.fn(),
    setConversationAttributes: vi.fn(),
    hideLabel: vi.fn(),
    reinit: vi.fn(),
  };
}

afterEach(() => {
  delete (window as Window).LiveTex;
  vi.restoreAllMocks();
});

describe('useLiveTexChat', () => {
  it('open() calls showActiveWindow', async () => {
    window.LiveTex = mockLiveTex();
    await useLiveTexChat().open();
    expect(window.LiveTex.showActiveWindow).toHaveBeenCalledTimes(1);
  });

  it('setVisitor() maps name/email/phone to visible conversation attributes', async () => {
    window.LiveTex = mockLiveTex();
    await useLiveTexChat().setVisitor({ name: 'Արամ', email: 'a@b.am', phone: '+37410000000' });
    expect(window.LiveTex.setConversationAttributes).toHaveBeenCalledWith(
      { Имя: 'Արամ', Email: 'a@b.am', Телефон: '+37410000000' },
      {},
    );
  });

  it('setVisitor() omits missing fields', async () => {
    window.LiveTex = mockLiveTex();
    await useLiveTexChat().setVisitor({ name: 'Արամ' });
    expect(window.LiveTex.setConversationAttributes).toHaveBeenCalledWith({ Имя: 'Արամ' }, {});
  });

  it('reinit() calls LiveTex.reinit', async () => {
    window.LiveTex = mockLiveTex();
    await useLiveTexChat().reinit();
    expect(window.LiveTex.reinit).toHaveBeenCalledTimes(1);
  });

  it('methods are no-ops when LiveTex never becomes ready', async () => {
    const chat = useLiveTexChat({ timeoutMs: 30, pollMs: 10 });
    await expect(chat.open()).resolves.toBeUndefined();
    await expect(chat.setVisitor({ name: 'x' })).resolves.toBeUndefined();
  });

  it('is not ready until showActiveWindow method is attached', async () => {
    // Object exists but client.js has not yet attached the API methods.
    window.LiveTex = {};
    const chat = useLiveTexChat({ timeoutMs: 30, pollMs: 10 });
    await expect(chat.open()).resolves.toBeUndefined();
  });
});
The fast timeoutMs: 30, pollMs: 10 overrides keep the not-ready tests from hanging 10s.
--------------------------------------------------------------------------------
8. Integration order (checklist for the implementing agent)
Create types/livetex.d.ts.
Create composables/useLiveTexChat.ts.
Create plugins/livetex.client.ts (prefer the runtimeConfig variant from the §4.3 note).
Add the icon assets/icons/support-chat.svg (or wire your icon system).
Add runtimeConfig.public.livetex in nuxt.config.ts (§5.1).
Add the two env vars to .env + .env.example with the real account values (§5.2).
Wire the header button + watch (§6.1).
Add reinit() to the auth store logout() (§6.2).
Add the Vitest spec (§7).
Verify (§10).
--------------------------------------------------------------------------------
9. Adapting to a project without i18n / different auth shape
No i18n: drop useI18n and getUsernameByLocale; pass name: authStore.fullName (string).
Different auth fields: map whatever your store exposes into { name, email, phone }. All three are optional — setVisitor omits any missing field.
No auth at all (anonymous chat): skip §6.1's watch/setVisitor; just call open() on click. The widget still works without visitor attributes.
Different header / icon system: the only hard requirement is an element with @click="open()".
The composable (useLiveTexChat) has no project dependencies — it only touches window.LiveTex. Everything project-specific lives in the header wiring and the env values.
--------------------------------------------------------------------------------
10. Verification
npx vitest run tests/composables/useLiveTexChat.spec.ts → all green.
npx nuxi typecheck (or project's type-check) → no new errors.
Manual: log in → header chat icon visible → click → widget opens, no default floating label → operator sees the visitor's name/email/phone → log out → log back in → conversation state reset.
Network tab: confirm client.js loads once (the #livetex-loader guard prevents double-inject).
--------------------------------------------------------------------------------
11. Known gotchas (do not "fix" these — they are intentional)
Gotcha
Why it's like this
Polling instead of onLiveTexReady
This client.js build never fires onLiveTexReady. Polling window.LiveTex.showActiveWindow/hideLabel is the reliable readiness signal.
reinit() doesn't visually reset an open chat
LiveTex limitation. Full reset needs a page reload — logout's redirect provides it.
window.liveTex / liveTexID / liveTex_object globals set before script load
The classic loader reads these on load (mirrors the official install snippet). Required.
config read but unused in the plugin
Original hardcodes loader/id. New project should switch to config.public.livetex.* (see §4.3 note).
setVisitor fires before any click (immediate: true)
Identity must be set before open(). Composable waits for readiness internally, so early calls are safe.
Attribute labels are Russian (Имя/Email/Телефон)
They're operator-facing display strings, not API keys — rename freely.
--------------------------------------------------------------------------------
Source of truth: chat-integration branch of Front-iBankingUI. LiveTex Widgets API 3.0, classic client.js loader.