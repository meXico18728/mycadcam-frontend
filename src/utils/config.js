// Облачный URL сервера (Railway). Заменить после деплоя.
const CLOUD_URL = 'https://mycadcam-backend1-production-8b1f.up.railway.app';

export function getServerUrl() {
    try {
        if (typeof window !== 'undefined' && window.__APP_CONFIG__?.serverUrl) {
            return window.__APP_CONFIG__.serverUrl;
        }
    } catch {}
    return CLOUD_URL;
}

export function getAppMode() {
    try {
        if (typeof window !== 'undefined' && window.__APP_CONFIG__?.mode) {
            return window.__APP_CONFIG__.mode;
        }
    } catch {}
    return 'server';
}

export const SERVER_URL = (() => {
    try {
        return window.__APP_CONFIG__?.serverUrl || CLOUD_URL;
    } catch {
        return CLOUD_URL;
    }
})();
