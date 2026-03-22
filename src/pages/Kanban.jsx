import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { getServerUrl } from '../utils/config';

// Палитра цветов для категорий работ
const CATEGORY_PALETTE = [
    { bg: '#e8f4fd', border: '#3b9edd', text: '#1a6fa8' },
    { bg: '#f0fdf4', border: '#22c55e', text: '#15803d' },
    { bg: '#fdf4ff', border: '#a855f7', text: '#7e22ce' },
    { bg: '#fff7ed', border: '#f97316', text: '#c2410c' },
    { bg: '#fefce8', border: '#eab308', text: '#854d0e' },
    { bg: '#fdf2f8', border: '#ec4899', text: '#9d174d' },
    { bg: '#f0fdfa', border: '#14b8a6', text: '#0f766e' },
    { bg: '#f5f3ff', border: '#8b5cf6', text: '#5b21b6' },
    { bg: '#fff1f2', border: '#f43f5e', text: '#be123c' },
    { bg: '#f0f9ff', border: '#0ea5e9', text: '#0369a1' },
];

function getCategoryColor(typeName) {
    if (!typeName) return { bg: 'var(--bg-card)', border: 'var(--accent-primary)', text: 'var(--accent-primary)' };
    let hash = 0;
    for (let i = 0; i < typeName.length; i++) hash = typeName.charCodeAt(i) + ((hash << 5) - hash);
    return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

const STATUS_COLUMNS = [
    { id: 'new', titleKey: 'kanban.colNew' },
    { id: 'modeling', titleKey: 'kanban.colModeling' },
    { id: 'milling', titleKey: 'kanban.colMilling' },
    { id: 'sintering', titleKey: 'kanban.colSintering' },
    { id: 'fitting', titleKey: 'kanban.colFitting' },
    { id: 'ready', titleKey: 'kanban.colReady' }
];

const DELAY_DAYS = 3; // считать задержкой если статус не менялся N дней

function daysSince(dateStr) {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

const DATE_FILTERS = [
    { key: 'all', labelKey: 'kanban.filterAll' },
    { key: 'today', labelKey: 'kanban.filterToday' },
    { key: 'week', labelKey: 'kanban.filterWeek' },
    { key: 'month', labelKey: 'kanban.filterMonth' },
];

function matchesDateFilter(c, filter) {
    if (filter === 'all') return true;
    const created = new Date(c.createdAt);
    const now = new Date();
    if (filter === 'today') {
        return created.toDateString() === now.toDateString();
    }
    if (filter === 'week') {
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        return created >= weekAgo;
    }
    if (filter === 'month') {
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        return created >= monthAgo;
    }
    return true;
}

const Kanban = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [cases, setCases] = useState([]);
    const [dateFilter, setDateFilter] = useState('all');
    const [delayedIds, setDelayedIds] = useState(new Set());
    const [dismissedAlert, setDismissedAlert] = useState(false);
    const [draggedId, setDraggedId] = useState(null);
    const [dragOverCol, setDragOverCol] = useState(null);

    const fetchCases = useCallback(async () => {
        try {
            const res = await fetch(`${getServerUrl()}/api/cases`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) setCases(await res.json());
        } catch (err) { console.error(err); }
    }, []);

    const fetchDelayed = useCallback(async () => {
        try {
            const res = await fetch(`${getServerUrl()}/api/cases/delayed/list?days=${DELAY_DAYS}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDelayedIds(new Set(data.map(c => c.id)));
                if (data.length > 0) setDismissedAlert(false);
            }
        } catch (err) { console.error(err); }
    }, []);

    useEffect(() => {
        fetchCases();
        fetchDelayed();
        // Обновляем каждые 5 минут
        const interval = setInterval(() => { fetchCases(); fetchDelayed(); }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [user, fetchCases, fetchDelayed]);

    const updateCaseStatus = async (caseId, newStatus) => {
        try {
            const res = await fetch(`${getServerUrl()}/api/cases/${caseId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setCases(prev => prev.map(c => c.id === caseId ? { ...c, status: newStatus, statusChangedAt: new Date().toISOString() } : c));
                // Убираем из задержанных если статус сменился
                setDelayedIds(prev => { const s = new Set(prev); s.delete(caseId); return s; });
            }
        } catch (err) { console.error(err); }
    };

    const handleDragStart = (e, caseId) => {
        setDraggedId(caseId);
        e.dataTransfer.effectAllowed = 'move';
        // Прозрачный ghost чтобы не мешал
        const ghost = document.createElement('div');
        ghost.style.position = 'absolute';
        ghost.style.top = '-9999px';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => document.body.removeChild(ghost), 0);
    };
    const handleDragOver = (e, colId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colId);
    };
    const handleDragLeave = () => setDragOverCol(null);
    const handleDrop = (e, statusId) => {
        e.preventDefault();
        if (draggedId !== null && draggedId !== undefined) {
            updateCaseStatus(draggedId, statusId);
        }
        setDraggedId(null);
        setDragOverCol(null);
    };
    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverCol(null);
    };

    const filteredCases = cases.filter(c => matchesDateFilter(c, dateFilter));
    const delayedInView = filteredCases.filter(c => delayedIds.has(c.id) && c.status !== 'ready');

    // Собираем уникальные категории для легенды
    const categories = [...new Map(
        cases.map(c => { const t = JSON.parse(c.toothFormula || '{}').type; return [t, t]; })
             .filter(([k]) => k)
    ).keys()].sort();

    return (
        <Layout>
            {/* Уведомление о задержках */}
            {!dismissedAlert && delayedInView.length > 0 && (
                <div style={{
                    background: 'linear-gradient(135deg, #ff6b35, #f7c59f)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1.2rem',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 12px rgba(255,107,53,0.3)',
                    color: '#fff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                        <div>
                            <strong>{t('kanban.delayAlert', { count: delayedInView.length })}</strong>
                            <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.15rem' }}>
                                {delayedInView.slice(0, 3).map(c => {
                                    const days = daysSince(c.statusChangedAt || c.createdAt);
                                    return (
                                        <span key={c.id} style={{ marginRight: '1rem' }}>
                                            #{c.id} {c.patient?.name} — {t('kanban.delayDays', { days })}
                                        </span>
                                    );
                                })}
                                {delayedInView.length > 3 && <span>+{delayedInView.length - 3} {t('kanban.more')}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setDismissedAlert(true)}
                        style={{ background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        ✕
                    </button>
                </div>
            )}

            <div className="card glass-panel" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h3 style={{ margin: 0 }}>{t('kanban.title')}</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{t('kanban.subtitle')}</p>
                </div>
                {/* Фильтр по дате */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {DATE_FILTERS.map(f => (
                        <button key={f.key} onClick={() => setDateFilter(f.key)}
                            style={{
                                padding: '0.35rem 0.9rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                background: dateFilter === f.key ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                color: dateFilter === f.key ? '#fff' : 'var(--text-primary)',
                                fontWeight: dateFilter === f.key ? 600 : 400,
                                transition: 'all 0.15s'
                            }}>
                            {t(f.labelKey)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Легенда категорий */}
            {categories.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                    {categories.map(cat => {
                        const color = getCategoryColor(cat);
                        return (
                            <span key={cat} style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                padding: '0.25rem 0.7rem', borderRadius: '999px',
                                background: color.bg, border: `1px solid ${color.border}`,
                                color: color.text, fontSize: '0.8rem', fontWeight: 500
                            }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.border, display: 'inline-block' }} />
                                {cat}
                            </span>
                        );
                    })}
                </div>
            )}

            <div className="flex gap-4" style={{ overflowX: 'auto', paddingBottom: '1rem', minHeight: '600px', alignItems: 'flex-start' }}>
                {STATUS_COLUMNS.map(column => (
                    <div key={column.id}
                        className="flex-col gap-4"
                        style={{
                            width: '280px', minWidth: '280px',
                            backgroundColor: dragOverCol === column.id ? 'var(--bg-hover, #e8f0fe)' : 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)', padding: '1rem',
                            boxShadow: 'var(--shadow-sm)',
                            border: dragOverCol === column.id ? '2px dashed var(--accent-primary)' : '2px solid transparent',
                            transition: 'background 0.15s, border 0.15s'
                        }}
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        <h4 style={{ marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--border)' }}>
                            {t(column.titleKey)} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '0.9rem' }}>({filteredCases.filter(c => c.status === column.id).length})</span>
                        </h4>

                        <div className="flex flex-col gap-3">
                            {filteredCases.filter(c => c.status === column.id).map(c => {
                                const formula = JSON.parse(c.toothFormula || '{}');
                                const isDelayed = delayedIds.has(c.id) && c.status !== 'ready';
                                const days = daysSince(c.statusChangedAt || c.createdAt);
                                const catColor = getCategoryColor(formula.type);
                                return (
                                    <div key={c.id}
                                        draggable={['admin', 'tech'].includes(user?.role)}
                                        onDragStart={(e) => handleDragStart(e, c.id)}
                                        onDragEnd={handleDragEnd}
                                        className="card"
                                        style={{
                                            padding: '1rem',
                                            cursor: ['admin', 'tech'].includes(user?.role) ? 'grab' : 'default',
                                            borderLeft: `4px solid ${isDelayed ? '#ff6b35' : catColor.border}`,
                                            background: draggedId === c.id ? 'var(--bg-secondary)' : (isDelayed ? 'var(--bg-card)' : catColor.bg),
                                            opacity: draggedId === c.id ? 0.45 : 1,
                                            boxShadow: isDelayed ? '0 2px 10px rgba(255,107,53,0.25)' : `0 2px 8px ${catColor.border}22`,
                                            position: 'relative',
                                            transition: 'opacity 0.15s'
                                        }}
                                    >
                                        {isDelayed && (
                                            <div style={{
                                                position: 'absolute', top: '0.5rem', right: '0.5rem',
                                                background: '#ff6b35', color: '#fff',
                                                borderRadius: '999px', fontSize: '0.7rem',
                                                padding: '0.1rem 0.5rem', fontWeight: 600
                                            }}>
                                                ⏱ {t('kanban.delayDays', { days })}
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start" style={{ marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 'bold' }}>#{c.id}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        <div style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>{c.patient?.name}</div>
                                        <div style={{ marginBottom: '0.25rem' }}>
                                            <span style={{
                                                display: 'inline-block', fontSize: '0.78rem', fontWeight: 600,
                                                padding: '0.15rem 0.55rem', borderRadius: '999px',
                                                background: catColor.border, color: '#fff'
                                            }}>{formula.type || '—'}</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('cases.teeth')}: {formula.teeth?.join(', ')}</div>

                                        {['admin', 'tech'].includes(user?.role) && (
                                            <div className="flex justify-end mt-2">
                                                <select value={c.status} onChange={(e) => updateCaseStatus(c.id, e.target.value)}
                                                    className="input-field" style={{ padding: '0.2rem', fontSize: '0.8rem', height: 'auto' }}>
                                                    {STATUS_COLUMNS.map(col => <option key={col.id} value={col.id}>{t(col.titleKey)}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </Layout>
    );
};

export default Kanban;
