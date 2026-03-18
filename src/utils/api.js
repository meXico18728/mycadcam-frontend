/**
 * api.js — умный API клиент.
 * В онлайн режиме — обычные запросы к серверу.
 * В оффлайн режиме — читает из локального кэша, пишет в очередь синхронизации.
 */

// Получаем конфиг установки (SERVER_URL, MODE)
function getConfig() {
    try {
        // Electron: конфиг передаётся через window.__APP_CONFIG__
        if (window.__APP_CONFIG__) return window.__APP_CONFIG__;
    } catch {}
    return { serverUrl: 'http://localhost:4000', mode: 'server' };
}

const CLOUD_URL = 'https://mycadcam-backend1-production-8b1f.up.railway.app';

export const SERVER_URL = (() => {
    try {
        return window.__APP_CONFIG__?.serverUrl || CLOUD_URL;
    } catch { return CLOUD_URL; }
})();

// Статус соединения
let _isOnline = navigator.onLine;
let _statusListeners = [];

export function isOnline() { return _isOnline; }

export function onStatusChange(cb) {
    _statusListeners.push(cb);
    return () => { _statusListeners = _statusListeners.filter(l => l !== cb); };
}

function notifyListeners() {
    _statusListeners.forEach(cb => cb(_isOnline));
}

// Проверка реального соединения с сервером
async function checkServerOnline() {
    try {
        const res = await fetch(`${SERVER_URL}/api/health`, {
            signal: AbortSignal.timeout(3000)
        });
        return res.ok;
    } catch {
        return false;
    }
}

// Периодическая проверка
setInterval(async () => {
    const prev = _isOnline;
    _isOnline = await checkServerOnline();
    if (prev !== _isOnline) {
        notifyListeners();
        if (_isOnline) {
            // Сервер снова доступен — триггерим синхронизацию
            window.dispatchEvent(new CustomEvent('app:online'));
        }
    }
}, 15000);

// Первичная проверка
checkServerOnline().then(online => {
    _isOnline = online;
    notifyListeners();
});

function getToken() {
    return localStorage.getItem('token');
}

function buildHeaders(extra = {}) {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...extra
    };
}

// Ключи кэша для localStorage
const CACHE_KEYS = {
    [`${SERVER_URL}/api/patients`]: 'cache_patients',
    [`${SERVER_URL}/api/cases`]: 'cache_cases',
    [`${SERVER_URL}/api/finances`]: 'cache_transactions',
    [`${SERVER_URL}/api/restorations`]: 'cache_restorations',
};

function saveToCache(url, data) {
    const key = CACHE_KEYS[url];
    if (key) {
        try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
    }
}

function loadFromCache(url) {
    const key = CACHE_KEYS[url];
    if (!key) return null;
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

// Очередь offline операций
function enqueueOffline(method, path, body) {
    const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
    queue.push({
        id: Date.now() + Math.random(),
        method,
        url: path,
        body,
        created_at: new Date().toISOString()
    });
    localStorage.setItem('offline_queue', JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('app:queue-changed'));
}

export function getOfflineQueue() {
    return JSON.parse(localStorage.getItem('offline_queue') || '[]');
}

export function clearOfflineQueue() {
    localStorage.removeItem('offline_queue');
    window.dispatchEvent(new CustomEvent('app:queue-changed'));
}

// Синхронизация очереди с сервером
export async function syncOfflineQueue() {
    const queue = getOfflineQueue();
    if (!queue.length) return { synced: 0, failed: 0 };

    const remaining = [];
    let synced = 0;

    for (const op of queue) {
        try {
            const opts = {
                method: op.method,
                headers: buildHeaders()
            };
            if (op.body) opts.body = JSON.stringify(op.body);

            const res = await fetch(`${SERVER_URL}${op.url}`, opts);
            if (res.ok || res.status === 400 || res.status === 409) {
                synced++;
            } else {
                remaining.push(op);
            }
        } catch {
            remaining.push(op);
            break;
        }
    }

    localStorage.setItem('offline_queue', JSON.stringify(remaining));
    window.dispatchEvent(new CustomEvent('app:queue-changed'));
    return { synced, failed: remaining.length };
}

// Обновить весь кэш с сервера
export async function refreshAllCache() {
    const endpoints = [
        `${SERVER_URL}/api/patients`,
        `${SERVER_URL}/api/cases`,
        `${SERVER_URL}/api/finances`,
        `${SERVER_URL}/api/restorations`,
    ];
    for (const url of endpoints) {
        try {
            const res = await fetch(url, { headers: buildHeaders() });
            if (res.ok) {
                const data = await res.json();
                saveToCache(url, data);
            }
        } catch {}
    }
}

// Автосинхронизация при появлении сети
window.addEventListener('app:online', async () => {
    const result = await syncOfflineQueue();
    if (result.synced > 0) {
        await refreshAllCache();
        window.dispatchEvent(new CustomEvent('app:synced', { detail: result }));
    }
});

/**
 * Основная функция запроса.
 * GET — возвращает кэш если оффлайн.
 * POST/PUT/DELETE — ставит в очередь если оффлайн.
 */
export async function apiRequest(method, path, body = null, options = {}) {
    const url = `${SERVER_URL}${path}`;
    const online = await checkServerOnline();
    _isOnline = online;

    if (online) {
        // Обычный запрос
        const opts = { method, headers: buildHeaders() };
        if (body && method !== 'GET') opts.body = JSON.stringify(body);

        const res = await fetch(url, opts);
        const data = res.ok ? await res.json().catch(() => null) : null;

        // Кэшируем GET ответы
        if (method === 'GET' && res.ok && data) {
            saveToCache(url, data);
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Ошибка сервера' }));
            throw new Error(err.error || `HTTP ${res.status}`);
        }

        return data;
    } else {
        // ОФФЛАЙН режим
        if (method === 'GET') {
            const cached = loadFromCache(url);
            if (cached !== null) return cached;
            throw new Error('Нет соединения с сервером и нет кэшированных данных');
        } else {
            // Записываем в очередь
            enqueueOffline(method, path, body);
            // Возвращаем оптимистичный ответ
            return { offline: true, queued: true, tempId: Date.now() };
        }
    }
}

// Удобные методы
export const api = {
    get: (path) => apiRequest('GET', path),
    post: (path, body) => apiRequest('POST', path, body),
    put: (path, body) => apiRequest('PUT', path, body),
    delete: (path) => apiRequest('DELETE', path),
};
