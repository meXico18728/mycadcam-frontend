import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { formatCurrency, EXCHANGE_RATE_USD_TO_UZS } from '../utils/currency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getServerUrl } from '../utils/config';

const Dashboard = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [allCases, setAllCases] = useState([]);
    const [activeCases, setActiveCases] = useState([]);
    const [financeStats, setFinanceStats] = useState(null);
    const [patientsCount, setPatientsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [chartPeriod, setChartPeriod] = useState('month');

    const token = localStorage.getItem('token');

    const stats = useMemo(() => {
        let newC = 0, inProgC = 0, totalDebt = 0, totalPaid = 0, totalCost = 0;
        allCases.forEach(c => {
            const debt = Math.max(0, (c.totalCost || 0) - (c.paidAmount || 0));
            if (c.status !== 'ready') {
                if (c.status === 'new') newC++;
                if (['modeling', 'milling', 'sintering', 'fitting'].includes(c.status)) inProgC++;
                totalDebt += debt;
            }
            totalPaid += c.paidAmount || 0;
            totalCost += c.totalCost || 0;
        });
        return { newCases: newC, inProgress: inProgC, totalDebt, totalPaid, totalCost };
    }, [allCases]);

    useEffect(() => {
        const headers = { 'Authorization': `Bearer ${token}` };
        const S = getServerUrl();
        Promise.all([
            fetch(`${S}/api/cases`, { headers }).then(r => r.ok ? r.json() : []),
            fetch(`${S}/api/finances/stats`, { headers }).then(r => r.ok ? r.json() : null),
            fetch(`${S}/api/patients`, { headers }).then(r => r.ok ? r.json() : [])
        ]).then(([cases, fStats, patients]) => {
            setAllCases(cases);
            setActiveCases(cases.filter(c => c.status !== 'ready'));
            setFinanceStats(fStats);
            setPatientsCount(patients.length);
        }).catch(console.error)
          .finally(() => setLoading(false));
    }, []);

    const handleUpdateStatus = async (caseId, newStatus) => {
        await fetch(`${getServerUrl()}/api/cases/${caseId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: newStatus })
        });
        setAllCases(prev => prev.map(c => c.id === caseId ? { ...c, status: newStatus } : c));
        setActiveCases(prev => prev.map(c => c.id === caseId ? { ...c, status: newStatus } : c));
    };

    const getStatusBadge = (status) => {
        const map = {
            new: <span className="badge badge-neutral">{t('statuses.new')}</span>,
            modeling: <span className="badge badge-warning">{t('statuses.modeling')}</span>,
            milling: <span className="badge badge-warning">{t('statuses.milling')}</span>,
            sintering: <span className="badge badge-warning">{t('statuses.sintering')}</span>,
            fitting: <span className="badge badge-info">{t('statuses.fitting')}</span>,
            ready: <span className="badge badge-success">{t('statuses.ready')}</span>,
        };
        return map[status] || <span className="badge badge-neutral">{status}</span>;
    };

    const chartData = useMemo(() => {
        if (!allCases.length) return [];
        const dataMap = {};
        const now = new Date();

        allCases.forEach(c => {
            if (!c.createdAt) return;
            const date = new Date(c.createdAt);
            let key = '';

            if (chartPeriod === 'day') {
                if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear())
                    key = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
            } else if (chartPeriod === 'month') {
                if (date.getFullYear() === now.getFullYear())
                    key = date.toLocaleDateString('ru-RU', { month: 'short' });
            } else {
                key = date.getFullYear().toString();
            }

            if (key) {
                if (!dataMap[key]) dataMap[key] = { name: key, orders: 0, usd: 0, uzs: 0 };
                dataMap[key].orders += 1;
                dataMap[key].usd += c.totalCost || 0;
                dataMap[key].uzs += (c.totalCost || 0) * EXCHANGE_RATE_USD_TO_UZS;
            }
        });

        const sorted = Object.values(dataMap);
        if (chartPeriod === 'year') sorted.sort((a, b) => parseInt(a.name) - parseInt(b.name));
        if (chartPeriod === 'day') sorted.sort((a, b) => {
            const [d1, m1] = a.name.split('.');
            const [d2, m2] = b.name.split('.');
            return new Date(2000, m1 - 1, d1) - new Date(2000, m2 - 1, d2);
        });
        return sorted;
    }, [allCases, chartPeriod]);

    return (
        <Layout>
            {/* HEADER */}
            <div className="card flex justify-between items-center" style={{ padding: '1rem 1.5rem' }}>
                <div>
                    <h3 style={{ margin: 0 }}>{t('dashboard.stats')}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('dashboard.welcome')} MyCadCam Lab</p>
                </div>
                {['admin', 'doctor'].includes(user?.role) && (
                    <button className="btn btn-primary" onClick={() => navigate('/cases')}>+ {t('cases.add')}</button>
                )}
            </div>

            {/* KPI CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="card" style={{ borderTop: '4px solid var(--primary)', textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🆕</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t('dashboard.newCases')}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{loading ? '—' : stats.newCases}</div>
                </div>

                <div className="card" style={{ borderTop: '4px solid var(--warning)', textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t('dashboard.inProgress')}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{loading ? '—' : stats.inProgress}</div>
                </div>

                <div className="card" style={{ borderTop: '4px solid var(--danger)', textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💳</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t('dashboard.totalDebt')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: stats.totalDebt > 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {loading ? '—' : formatCurrency(stats.totalDebt)}
                    </div>
                </div>

                <div className="card" style={{ borderTop: '4px solid var(--success)', textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💰</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t('dashboard.balance')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: (financeStats?.balanceUSD || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {loading ? '—' : formatCurrency(financeStats?.balanceUSD || 0)}
                    </div>
                </div>

                <div className="card" style={{ borderTop: '4px solid #8b5cf6', textAlign: 'center', padding: '1.5rem', cursor: 'pointer' }} onClick={() => navigate('/patients')}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t('patients.title')}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{loading ? '—' : patientsCount}</div>
                </div>

                <div className="card" style={{ borderTop: '4px solid var(--accent)', textAlign: 'center', padding: '1.5rem', cursor: 'pointer' }} onClick={() => navigate('/archive')}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{t('archive.title')}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{loading ? '—' : allCases.filter(c => c.status === 'ready').length}</div>
                </div>
            </div>

            {/* CHART */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0 }}>{t('dashboard.analytics')}</h3>
                    <div className="flex gap-2">
                        {['day', 'month', 'year'].map(p => (
                            <button key={p} className={`btn ${chartPeriod === p ? 'btn-primary' : 'btn-outline'}`}
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                onClick={() => setChartPeriod(p)}>
                                {t(`dashboard.by${p.charAt(0).toUpperCase() + p.slice(1)}`)}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" />
                            <YAxis yAxisId="left" stroke="var(--text-muted)" tickFormatter={v => Math.round(v)} />
                            <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" tickFormatter={v => `$${v}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                formatter={(value, name) => {
                                    if (name === 'usd') return [`$${value.toLocaleString()}`, t('dashboard.revenueUSD')];
                                    if (name === 'uzs') return [`${value.toLocaleString()} UZS`, t('dashboard.revenueUZS')];
                                    return [value, t('dashboard.ordersCount')];
                                }}
                            />
                            <Legend formatter={name => {
                                if (name === 'orders') return t('dashboard.ordersCount');
                                if (name === 'usd') return t('dashboard.revenueUSD');
                                if (name === 'uzs') return t('dashboard.revenueUZS');
                                return name;
                            }} />
                            <Bar yAxisId="left" dataKey="orders" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="usd" fill="var(--success)" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="uzs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {chartData.length === 0 && !loading && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0' }}>{t('dashboard.noData')}</p>
                )}
            </div>

            {/* RECENT CASES TABLE */}
            <div className="card">
                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>{t('dashboard.recentCases')}</h3>
                    {activeCases.length > 5 && (
                        <button className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => navigate('/cases')}>
                            {t('dashboard.viewAll')}
                        </button>
                    )}
                </div>

                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>{t('dashboard.loading')}</p>
                ) : activeCases.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>{t('dashboard.empty')}</p>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{t('cases.patient')}</th>
                                    <th>{t('cases.date')}</th>
                                    <th>{t('cases.workType')}</th>
                                    <th>{t('cases.status')}</th>
                                    <th>{t('cases.cost')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeCases.slice(0, 5).map(c => {
                                    const formula = JSON.parse(c.toothFormula || '{}');
                                    return (
                                    <tr key={c.id} className="table-row-hover" style={{ cursor: 'pointer' }} onClick={() => navigate('/cases')}>
                                        <td><span className="badge badge-neutral" style={{ fontSize: '0.8rem' }}>#{c.id}</span></td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{c.patient?.name || `ID ${c.patientId}`}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.patient?.phone}</div>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</td>
                                        <td>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500 }}>{formula.type || '-'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('cases.teeth')}: {formula.teeth?.join(', ')}</div>
                                        </td>
                                        <td>{getStatusBadge(c.status)}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{formatCurrency(c.totalCost)}</div>
                                            {(c.totalCost - (c.paidAmount || 0)) > 0
                                                ? <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{t('cases.debt')}: {formatCurrency(c.totalCost - (c.paidAmount || 0))}</div>
                                                : <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>✓ {t('cases.paid')}</div>
                                            }
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Dashboard;
