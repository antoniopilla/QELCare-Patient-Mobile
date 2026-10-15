/// <reference types="vite/client" />
declare const process: { env: Record<string, string | undefined> };
interface Window {
  Capacitor?: { isNativePlatform?: () => boolean };
}
