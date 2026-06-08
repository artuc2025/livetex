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
