/// <reference types="vite/client" />

import type { NativeApi, DesktopBridge } from "@fatma/contracts";

declare global {
  const __APP_VERSION__: string;

  interface Window {
    nativeApi?: NativeApi;
    desktopBridge?: DesktopBridge;
  }
}
