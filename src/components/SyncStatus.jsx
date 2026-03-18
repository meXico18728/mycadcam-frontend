import React, { useState, useEffect } from 'react';
import { isOnline, onStatusChange, getOfflineQueue, syncOfflineQueue, refreshAllCache } from '../utils/api';

const SyncStatus = () => {
    const [online, setOnline] = useState(isOnline());
    const [pending, setPending] = useState(getOfflineQueue().length);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);

    useEffect(() => {
        const unsub = onStatusChange(setOnline);

        const updatePending = () => setPending(getOfflineQueue().length);
        window.addEventListener('app:queue-changed', updatePending);

        const onSynced = (e) => {
            setLastSync(new Date());
            setPending(getOfflineQueue().length);
        };
        window.addEventListener('app:synced', onSynced);

        return () => {
            unsub();
            window.removeEventListener('app:queue-changed', updatePending);
            window.removeEventListener('app:synced', onSynced);
        };
    }, []);

    const handleManualSync = async () => {
        if (!online || syncing) return;
        setSyncing(true);
        try {
            await syncOfflineQueue();
            await refreshAllCache();
            setLastSync(new Date());
            setPending(getOfflineQueue().length);
            window.dispatchEvent(new CustomEvent('app:data-refreshed'));
        } finally {
            setSyncing(false);
        }
    };

    if (online && pending === 0) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--success)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--success)', display: 'inline-block' }} />
                Онлайн
                {lastSync && <span style={{ color: 'var(--text-muted)' }}>· {lastSync.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
        );
    }

    if (!online) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--danger)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--danger)', display: 'inline-block' }} />
                Оффлайн
                {pending > 0 && (
                    <span style={{ backgroundColor: 'var(--danger)', color: 'white', borderRadius: '10px', padding: '0 6px', fontSize: '0.7rem' }}>
                        {pending} в очереди
                    </span>
                )}
            </div>
        );
    }

    // Онлайн но есть несинхронизированные данные
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--warning)', display: 'inline-block' }} />
            <span style={{ color: 'var(--warning)' }}>
                {pending} не синхронизировано
            </span>
            <button
                onClick={handleManualSync}
                disabled={syncing}
                style={{
                    background: 'none', border: '1px solid var(--warning)', borderRadius: '4px',
                    color: 'var(--warning)', padding: '0.1rem 0.5rem', fontSize: '0.7rem',
                    cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1
                }}
            >
                {syncing ? '⟳ Синхронизация...' : '⟳ Синхронизировать'}
            </button>
        </div>
    );
};

export default SyncStatus;
