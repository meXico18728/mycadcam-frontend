import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { formatCurrency } from '../utils/currency';
import { getServerUrl } from '../utils/config';

const STAGE_LABELS = {
    new: 'Новый',
    modeling: 'Моделирование',
    milling: 'Фрезерование',
    sintering: 'Спекание',
    fitting: 'Примерка',
    ready: 'Готово'
};

const STAGE_COLORS = {
    new: '#6b7280',
    modeling: '#3b82f6',
    milling: '#8b5cf6',
    sintering: '#f59e0b',
    fitting: '#06b6d4',
    ready: '#22c55e'
};

function DashboardCard({ icon, label, value, color, sub, onClick }) {
    return (
        <div
            className="card"
            onClick={onClick}
            style={{
                borderTop: `4px solid ${color}`,
                textAlign: 'center',
                padding: '1.5rem',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.15s',
            }}
            onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = '')}
        >
            <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{icon}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color }}>{value}</div>
            {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</div>}
        </div>
    );
}

function StatusPill({ status }) {
    return (
        <span style={{
            display: 'inline-block', padding: '0.2rem 0.6rem',
            borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
            background: STAGE_COLORS[status] + '22',
            color: STAGE_COLORS[status],
            border: `1px solid ${STAGE_COLORS[status]}55`
        }}>
            {STAGE_LABELS[status] || status}
        </span>
    );
}

function DeadlineBadge({ daysLeft, daysOverdue }) {
    if (daysOverdue > 0) return (
        <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '999px', padding: '0.15rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 }}>
            ⏰ просрочка {daysOverdue}д
        </span>
    );
    if (daysLeft !== null && daysLeft <= 1) return (
        <span style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d', borderRadius: '999px', padding: '0.15rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 }}>
            ⚠️ сегодня
        </span>
    );
    if (daysLeft !== null && daysLeft <= 3) return (
        <span style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fdba74', borderRadius: '999px', padding: '0.15rem 0.55rem', fontSize: '0.75rem', fontWeight: 600 }}>
            {daysLeft}д
        </span>
    );
    if (daysLeft !== null) return (
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{daysLeft}д</span>
    );
    return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>;
}

const TABS = [
    { id: 'dashboard', label: '📊 Дашборд' },
    { id: 'production', label: '🏭 Конвейер' },
    { id: 'deadlines', label: '⏰ Сроки' },
    { id: 'workload', label: '👷 Нагрузка' },
    { id: 'report', label: '📈 Отчёт' },
];

const CRM = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [tab, setTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({});

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };
    const S = getServerUrl();

    const fetchTab = useCallback(async (tabId) => {
        setLoading(true);
        try {
            const endpointMap = {
                dashboard: '/api/crm/dashboard',
                production: '/api/crm/production',
                deadlines: '/api/crm/deadlines',
                workload: '/api/crm/workload',
                report: '/api/crm/report',
            };
            const res = await fetch(`${S}${endpointMap[tabId]}`, { headers });
            if (res.ok) setData(prev => ({ ...prev, [tabId]: await res.json() }));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [S]);

    useEffect(() => { fetchTab(tab); }, [tab]);

    // ─── DASHBOARD TAB ───────────────────────────────────────────
    const renderDashboard = () => {
        const d = data.dashboard;
        if (!d) return null;
        const s = d.casesByStatus || {};
        const total = Object.values(s).reduce((a, b) => a + b, 0);

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* KPI Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <DashboardCard icon="📦" label="Всего активных" value={d.totalActiveCount} color="var(--primary)" />
                    <DashboardCard icon="🆕" label="Новых сегодня" value={d.newTodayCount} color="#6b7280" />
                    <DashboardCard icon="⏰" label="Просрочено" value={d.overdueCount} color="#dc2626"
                        onClick={() => setTab('deadlines')} />
                    <DashboardCard icon="📅" label="Сдать сегодня" value={d.dueTodayCount} color="#d97706"
                        onClick={() => setTab('deadlines')} />
                    <DashboardCard icon="💳" label="Общий долг" value={formatCurrency(d.totalDebtUSD)} color="#ef4444" />
                    <DashboardCard icon="💰" label="Доход за месяц" value={formatCurrency(d.monthlyFinance?.incomeUSD || 0)} color="#22c55e"
                        sub={`расход: ${formatCurrency(d.monthlyFinance?.expenseUSD || 0)}`} />
                </div>

                {/* Pipeline bar */}
                <div className="card">
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Производственный конвейер</h3>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {Object.entries(STAGE_LABELS).map(([key, label]) => {
                            const count = s[key] || 0;
                            const pct = total ? Math.round(count / total * 100) : 0;
                            return (
                                <div key={key} style={{ flex: '1 1 100px', minWidth: 100, textAlign: 'center', cursor: 'pointer' }}
                                    onClick={() => setTab('production')}>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: STAGE_COLORS[key] }}>{count}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{label}</div>
                                    <div style={{ height: 6, borderRadius: 4, background: 'var(--border)' }}>
                                        <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: STAGE_COLORS[key], transition: 'width 0.5s' }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Monthly finance summary */}
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>Финансы за текущий месяц</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Доход</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(d.monthlyFinance?.incomeUSD || 0)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Расход</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(d.monthlyFinance?.expenseUSD || 0)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Прибыль</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: ((d.monthlyFinance?.incomeUSD || 0) - (d.monthlyFinance?.expenseUSD || 0)) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {formatCurrency((d.monthlyFinance?.incomeUSD || 0) - (d.monthlyFinance?.expenseUSD || 0))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ─── PRODUCTION TAB ──────────────────────────────────────────
    const renderProduction = () => {
        const pipeline = data.production;
        if (!pipeline) return null;
        const now = new Date();

        return (
            <div>
                <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', alignItems: 'flex-start' }}>
                    {pipeline.map(col => (
                        <div key={col.stage} style={{
                            minWidth: 240, flex: '0 0 240px',
                            background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem',
                            borderTop: `4px solid ${STAGE_COLORS[col.stage]}`
                        }}>
                            <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: STAGE_COLORS[col.stage] }}>
                                {col.label} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({col.cases.length})</span>
                            </div>
                            {col.cases.map(c => {
                                const daysInStage = c.daysInStage || 0;
                                return (
                                    <div key={c.id} style={{
                                        background: 'var(--bg-card)', borderRadius: 8, padding: '0.75rem',
                                        marginBottom: '0.75rem',
                                        borderLeft: `3px solid ${c.isOverdue ? '#dc2626' : STAGE_COLORS[col.stage]}`,
                                        boxShadow: c.isOverdue ? '0 2px 8px rgba(220,38,38,0.2)' : 'var(--shadow-sm)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>#{c.id}</span>
                                            {c.isOverdue && <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>⏰ просрочен</span>}
                                        </div>
                                        <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{c.patient?.name}</div>
                                        {c.dueDate && (
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                Срок: {new Date(c.dueDate).toLocaleDateString('ru-RU')}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                            В этапе: {daysInStage}д
                                            {daysInStage >= 3 && <span style={{ color: '#f59e0b', marginLeft: '0.3rem' }}>⚠️</span>}
                                        </div>
                                        {c.tech && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>👷 {c.tech.name}</div>}
                                    </div>
                                );
                            })}
                            {col.cases.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0', fontSize: '0.85rem' }}>Пусто</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ─── DEADLINES TAB ───────────────────────────────────────────
    const renderDeadlines = () => {
        const d = data.deadlines;
        if (!d) return null;

        const CaseTable = ({ cases, title, emptyMsg, headerColor }) => (
            <div className="card">
                <h3 style={{ marginTop: 0, color: headerColor }}>{title} ({cases.length})</h3>
                {cases.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>{emptyMsg}</p>
                ) : (
                    <div className="table-container" style={{ border: 'none' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Заказчик</th>
                                    <th>Статус</th>
                                    <th>Срок сдачи</th>
                                    <th>Осталось / Просрочка</th>
                                    <th>Техник</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.map(c => (
                                    <tr key={c.id} className="table-row-hover">
                                        <td><span className="badge badge-neutral">#{c.id}</span></td>
                                        <td><div style={{ fontWeight: 500 }}>{c.patient?.name}</div></td>
                                        <td><StatusPill status={c.status} /></td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {c.dueDate ? new Date(c.dueDate).toLocaleDateString('ru-RU') : '—'}
                                        </td>
                                        <td><DeadlineBadge daysLeft={c.daysLeft} daysOverdue={c.daysOverdue} /></td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.tech?.name || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <CaseTable cases={d.overdue || []} title="⏰ Просроченные заказы" emptyMsg="Просроченных нет ✅" headerColor="#dc2626" />
                <CaseTable cases={d.upcoming || []} title="📅 Срок истекает (7 дней)" emptyMsg="Ближайших дедлайнов нет" headerColor="#d97706" />
                <CaseTable cases={d.noDueDate || []} title="📋 Без срока сдачи" emptyMsg="Все заказы имеют срок сдачи ✅" headerColor="var(--text-muted)" />
            </div>
        );
    };

    // ─── WORKLOAD TAB ────────────────────────────────────────────
    const renderWorkload = () => {
        const d = data.workload;
        if (!d) return null;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {(d.workload || []).map(({ tech, totalActive, overdueCount, cases }) => (
                        <div key={tech.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>👷 {tech.name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Активных: {totalActive}</div>
                                </div>
                                {overdueCount > 0 && (
                                    <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 700 }}>
                                        ⏰ {overdueCount} просроч.
                                    </span>
                                )}
                            </div>
                            {/* Load bar */}
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div style={{ height: 8, borderRadius: 4, background: 'var(--border)' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 4,
                                        width: `${Math.min(100, totalActive * 10)}%`,
                                        background: totalActive > 7 ? '#dc2626' : totalActive > 4 ? '#f59e0b' : '#22c55e',
                                        transition: 'width 0.4s'
                                    }} />
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {totalActive > 7 ? '🔴 Перегружен' : totalActive > 4 ? '🟡 Нормальная нагрузка' : '🟢 Свободен'}
                                </div>
                            </div>
                            {cases.slice(0, 3).map(c => (
                                <div key={c.id} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                                    #{c.id} {c.patient?.name} — <StatusPill status={c.status} />
                                </div>
                            ))}
                            {cases.length > 3 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>+{cases.length - 3} ещё</div>}
                        </div>
                    ))}
                </div>

                {(d.unassigned || []).length > 0 && (
                    <div className="card">
                        <h3 style={{ marginTop: 0, color: '#f59e0b' }}>⚠️ Неназначенные заказы ({d.unassigned.length})</h3>
                        <div className="table-container" style={{ border: 'none' }}>
                            <table>
                                <thead><tr><th>#</th><th>Заказчик</th><th>Статус</th><th>Дата создания</th></tr></thead>
                                <tbody>
                                    {d.unassigned.map(c => (
                                        <tr key={c.id} className="table-row-hover">
                                            <td><span className="badge badge-neutral">#{c.id}</span></td>
                                            <td>{c.patient?.name}</td>
                                            <td><StatusPill status={c.status} /></td>
                                            <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ─── REPORT TAB ──────────────────────────────────────────────
    const [reportFrom, setReportFrom] = useState('');
    const [reportTo, setReportTo] = useState('');

    const fetchReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (reportFrom) params.set('from', reportFrom);
            if (reportTo) params.set('to', reportTo);
            const res = await fetch(`${S}/api/crm/report?${params}`, { headers });
            if (res.ok) setData(prev => ({ ...prev, report: await res.json() }));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const renderReport = () => {
        const d = data.report;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>Выбрать период</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">С даты</label>
                            <input type="date" className="input-field" value={reportFrom} onChange={e => setReportFrom(e.target.value)} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">По дату</label>
                            <input type="date" className="input-field" value={reportTo} onChange={e => setReportTo(e.target.value)} />
                        </div>
                        <button className="btn btn-primary" onClick={fetchReport}>Сформировать отчёт</button>
                    </div>
                </div>

                {d && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                            <DashboardCard icon="📦" label="Заказов" value={d.casesTotal} color="var(--primary)" />
                            <DashboardCard icon="✅" label="Выполнено" value={d.casesCompleted} color="#22c55e" />
                            <DashboardCard icon="📋" label="Выставлено ($)" value={`$${d.totalBilledUSD}`} color="#6b7280" />
                            <DashboardCard icon="💰" label="Собрано ($)" value={`$${d.totalCollectedUSD}`} color="#22c55e" />
                            <DashboardCard icon="💸" label="Расходы ($)" value={`$${d.totalExpensesUSD}`} color="#ef4444" />
                            <DashboardCard icon="📈" label="Прибыль ($)" value={`$${d.profitUSD}`} color={d.profitUSD >= 0 ? '#22c55e' : '#ef4444'} />
                        </div>

                        <div className="card">
                            <h3 style={{ marginTop: 0 }}>Заказы за период</h3>
                            <div className="table-container" style={{ border: 'none' }}>
                                <table>
                                    <thead>
                                        <tr><th>#</th><th>Дата</th><th>Заказчик</th><th>Статус</th><th>Стоимость</th><th>Собрано</th></tr>
                                    </thead>
                                    <tbody>
                                        {(d.cases || []).map(c => {
                                            const paid = (c.transactions || []).filter(t => t.type === 'income').reduce((s, t) => s + t.amountUSD, 0);
                                            return (
                                                <tr key={c.id} className="table-row-hover">
                                                    <td><span className="badge badge-neutral">#{c.id}</span></td>
                                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</td>
                                                    <td>{c.patient?.name}</td>
                                                    <td><StatusPill status={c.status} /></td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(c.totalCost)}</td>
                                                    <td style={{ color: paid >= c.totalCost ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(paid)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderTab = () => {
        if (loading) return <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Загрузка...</div>;
        if (tab === 'dashboard') return renderDashboard();
        if (tab === 'production') return renderProduction();
        if (tab === 'deadlines') return renderDeadlines();
        if (tab === 'workload') return renderWorkload();
        if (tab === 'report') return renderReport();
        return null;
    };

    return (
        <Layout>
            {/* Header */}
            <div className="card glass-panel flex justify-between items-center">
                <div>
                    <h3 style={{ margin: 0 }}>🦷 CRM — Зуботехническая лаборатория</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Контроль производства и сроков</p>
                </div>
                <button className="btn btn-secondary" onClick={() => fetchTab(tab)}>↻ Обновить</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {TABS.filter(t => t.id !== 'report' || ['admin', 'accountant'].includes(user?.role)).map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {renderTab()}
        </Layout>
    );
};

export default CRM;
