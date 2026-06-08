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
