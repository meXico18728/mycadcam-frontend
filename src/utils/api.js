/**
 * api.js — Android-ready API client
 * - Uses Capacitor Network plugin for reliable online detection
 * - Falls back to navigator.onLine in browser
 * - Offline queue + cache via localStorage
 */

const CLOUD_URL = 'https://mycadcam-backend1-production-8b1f.up.railway.app';

export const SERVER_URL = (() => {
    try { return window.__APP_CONFIG__?.serverUrl || CLOUD_URL; }
    catch { return CLOUD_URL; }
})();

// Network status
let _isOnline = navigator.onLine;
let _statusListeners = [];

export function isOnline() { return _isOnline; }
export function onStatusChange(cb) {
    _statusListeners.push(cb);
    return () => { _statusListeners = _statusListeners.filter(l => l !== cb); };
}
function notifyListeners() { _statusListeners.forEach(cb => cb(_isOnline)); }

// Initialize Capacitor Network plugin (best signal on Android)
(async () => {
    try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        _isOnline = status.connected;
        notifyListeners();

        Network.addListener('networkStatusChange', (status) => {
            const prev = _isOnline;
            _isOnline = status.connected;
            if (prev !== _isOnline) {
                notifyListeners();
                if (_isOnline) window.dispatchEvent(new CustomEvent('app:online'));
            }
        });
    } catch {
        // Browser fallback
        window.addEventListener('online', () => { _isOnline = true; notifyListeners(); window.dispatchEvent(new CustomEvent('app:online')); });
        window.addEventListener('offline', () => { _isOnline = false; notifyListeners(); });

        // Ping server every 15s
        setInterval(async () => {
            try {
                const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
                const was = _isOnline;
                _isOnline = res.ok;
                if (was !== _isOnline) { notifyListeners(); if (_isOnline) window.dispatchEvent(new CustomEvent('app:online')); }
            } catch { if (_isOnline) { _isOnline = false; notifyListeners(); } }
        }, 15000);
    }
})();

// Token helpers
function getToken() { return localStorage.getItem('token'); }
function buildHeaders(extra = {}) {
    const token = getToken();
    return { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...extra };
}

// Cache
const CACHE_KEYS = {
    [`${SERVER_URL}/api/patients`]: 'cache_patients',
    [`${SERVER_URL}/api/cases`]: 'cache_cases',
    [`${SERVER_URL}/api/finances`]: 'cache_transactions',
    [`${SERVER_URL}/api/restorations`]: 'cache_restorations',
};

function saveToCache(url, data) {
    const key = CACHE_KEYS[url];
    if (key) try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}
function loadFromCache(url) {
    const key = CACHE_KEYS[url];
    if (!key) return null;
    try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; }
}

// Offline queue
function enqueueOffline(method, path, body) {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    queue.push({ id: Date.now() + Math.random(), method, url: path, body, created_at: new Date().toISOString() });
    localStorage.setItem('offline_queue', JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('app:queue-changed'));
}
export function getOfflineQueue() { return JSON.parse(localStorage.getItem('offline_queue') || '[]'); }
export function clearOfflineQueue() { localStorage.removeItem('offline_queue'); window.dispatchEvent(new CustomEvent('app:queue-changed')); }

export async function syncOfflineQueue() {
    const queue = getOfflineQueue();
    if (!queue.length) return { synced: 0, failed: 0 };
    const remaining = [];
    let synced = 0;
    for (const op of queue) {
        try {
            const opts = { method: op.method, headers: buildHeaders() };
            if (op.body) opts.body = JSON.stringify(op.body);
            const res = await fetch(`${SERVER_URL}${op.url}`, opts);
            if (res.ok || res.status === 400 || res.status === 409) synced++;
            else remaining.push(op);
        } catch { remaining.push(op); break; }
    }
    localStorage.setItem('offline_queue', JSON.stringify(remaining));
    window.dispatchEvent(new CustomEvent('app:queue-changed'));
    return { synced, failed: remaining.length };
}

export async function refreshAllCache() {
    const endpoints = [`${SERVER_URL}/api/patients`, `${SERVER_URL}/api/cases`, `${SERVER_URL}/api/finances`, `${SERVER_URL}/api/restorations`];
    for (const url of endpoints) {
        try {
            const res = await fetch(url, { headers: buildHeaders() });
            if (res.ok) saveToCache(url, await res.json());
        } catch {}
    }
}

window.addEventListener('app:online', async () => {
    const result = await syncOfflineQueue();
    if (result.synced > 0) { await refreshAllCache(); window.dispatchEvent(new CustomEvent('app:synced', { detail: result })); }
});

export async function apiRequest(method, path, body = null) {
    const url = `${SERVER_URL}${path}`;
    if (_isOnline) {
        const opts = { method, headers: buildHeaders() };
        if (body && method !== 'GET') opts.body = JSON.stringify(body);
        const res = await fetch(url, opts);
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (method === 'GET' && res.ok && data) saveToCache(url, data);
        if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Ошибка сервера' })); throw new Error(err.error || `HTTP ${res.status}`); }
        return data;
    } else {
        if (method === 'GET') {
            const cached = loadFromCache(url);
            if (cached !== null) return cached;
            throw new Error('Нет соединения и нет кэшированных данных');
        } else {
            enqueueOffline(method, path, body);
            return { offline: true, queued: true, tempId: Date.now() };
        }
    }
}

export const api = {
    get: (path) => apiRequest('GET', path),
    post: (path, body) => apiRequest('POST', path, body),
    put: (path, body) => apiRequest('PUT', path, body),
    delete: (path) => apiRequest('DELETE', path),
};
