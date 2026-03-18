import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/currency';
import Layout from '../components/Layout';
import { useTranslation } from 'react-i18next';
import { exportSingleSheet } from '../utils/excel';
import { getServerUrl } from '../utils/config';

const Finances = () => {
    const { t } = useTranslation();
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ type: 'income', amountUSD: '', amountUZS: '', description: '', patientId: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterPatientId, setFilterPatientId] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const fetchFinances = async () => {
        try {
            const [statsRes, transRes, patientsRes] = await Promise.all([
                fetch(`${getServerUrl()}/api/finances/stats`, { headers }),
                fetch(`${getServerUrl()}/api/finances`, { headers }),
                fetch(`${getServerUrl()}/api/patients`, { headers })
            ]);
            if (statsRes.ok) setStats(await statsRes.json());
            if (transRes.ok) setTransactions(await transRes.json());
            if (patientsRes.ok) setPatients(await patientsRes.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchFinances(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch(`${getServerUrl()}/api/finances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(formData)
        });
        if (res.ok) {
            setIsModalOpen(false);
            setFormData({ type: 'income', amountUSD: '', amountUZS: '', description: '', patientId: '' });
            fetchFinances();
        }
    };

    const filteredTransactions = transactions.filter(tr => {
        if (filterType !== 'all' && tr.type !== filterType) return false;
        if (filterPatientId && tr.patientId !== parseInt(filterPatientId)) return false;
        if (dateFrom && new Date(tr.date) < new Date(dateFrom)) return false;
        if (dateTo && new Date(tr.date) > new Date(dateTo + 'T23:59:59')) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (!(tr.description || '').toLowerCase().includes(term) &&
                !(tr.patient?.name || '').toLowerCase().includes(term) &&
                !(tr.caseId ? `#${tr.caseId}`.includes(term) : false)) return false;
        }
        return true;
    });

    const hasFilters = searchTerm || filterType !== 'all' || filterPatientId || dateFrom || dateTo;

    const exportToExcel = () => {
        const data = filteredTransactions.map(tr => ({
            'ID транзакции': tr.id,
            'Дата': new Date(tr.date).toLocaleDateString('ru-RU'),
            'Тип': tr.type === 'income' ? 'Доход' : 'Расход',
            'ID заказчика': tr.patient?.id || '-',
            'Заказчик': tr.patient?.name || '-',
            'Телефон': tr.patient?.phone || '-',
            'ID заказа': tr.caseId || '-',
            'Вид работ (заказ)': tr.case ? (JSON.parse(tr.case.toothFormula || '{}').type || '-') : '-',
            'Зубы (заказ)': tr.case ? (JSON.parse(tr.case.toothFormula || '{}').teeth || []).join(', ') : '-',
            'Описание': tr.description || '-',
            'Сумма USD': tr.type === 'income' ? tr.amountUSD : -tr.amountUSD,
            'Сумма UZS': tr.amountUZS > 0 ? (tr.type === 'income' ? tr.amountUZS : -tr.amountUZS) : 0,
        }));
        const subtitle = hasFilters
            ? `Фильтрованный отчёт: ${filteredTransactions.length} из ${transactions.length} записей`
            : `Все транзакции: ${transactions.length} записей`;
        exportSingleSheet(
            `Финансы_MyCadCam_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`,
            'Транзакции',
            'Финансовый отчёт',
            subtitle,
            data
        );
    };

    if (loading) return <Layout><div style={{ padding: '2rem', color: 'var(--text-muted)' }}>{t('finances.loading')}</div></Layout>;

    return (
        <Layout>
            <div className="card glass-panel flex justify-between items-center">
                <div>
                    <h3>{t('finances.title')}</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>{t('finances.subtitle')}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>{t('finances.addOp')}</button>
            </div>

            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <div className="card">
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>{t('finances.balance')}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stats.balanceUSD >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(stats.balanceUSD)}</div>
                        <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{formatCurrency(stats.balanceUZS, 'UZS')}</div>
                    </div>
                    <div className="card">
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>{t('finances.income')}</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(stats.totalIncomeUSD)}</div>
                    </div>
                    <div className="card">
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>{t('finances.expense')}</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(stats.totalExpenseUSD)}</div>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{t('finances.history')}</h3>
                        <div className="flex gap-4 items-center">
                            {hasFilters && (
                                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                                    onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterPatientId(''); setDateFrom(''); setDateTo(''); }}>
                                    {t('finances.resetFilters')}
                                </button>
                            )}
                            <button className="btn btn-secondary" style={{ padding: '0.3rem 1rem', fontSize: '0.85rem' }} onClick={exportToExcel}>{t('finances.exportExcel')}</button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '0.75rem', alignItems: 'end' }}>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">{t('common.search')}</label>
                            <input type="text" className="input-field" placeholder={t('finances.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">{t('finances.filterType')}</label>
                            <select className="input-field" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="all">{t('finances.allOps')}</option>
                                <option value="income">{t('finances.onlyIncome')}</option>
                                <option value="expense">{t('finances.onlyExpense')}</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">{t('finances.filterClient')}</label>
                            <select className="input-field" value={filterPatientId} onChange={e => setFilterPatientId(e.target.value)}>
                                <option value="">{t('finances.allClients')}</option>
                                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">{t('finances.dateFrom')}</label>
                            <input type="date" className="input-field" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        </div>
                        <div className="input-group" style={{ marginBottom: 0 }}>
                            <label className="input-label">{t('finances.dateTo')}</label>
                            <input type="date" className="input-field" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                    </div>
                    {hasFilters && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {t('finances.shown')}: <strong>{filteredTransactions.length}</strong> {t('finances.of')} <strong>{transactions.length}</strong>
                        </div>
                    )}
                </div>
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>{t('finances.date')}</th>
                                <th>{t('finances.type')}</th>
                                <th>{t('finances.description')}</th>
                                <th>{t('finances.clientOrder')}</th>
                                <th>{t('finances.amountUSD')}</th>
                                <th>{t('finances.amountUZS')}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.map(tr => (
                                <tr key={tr.id} className="table-row-hover">
                                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(tr.date).toLocaleDateString('ru-RU')}</td>
                                    <td>
                                        <span className={`badge ${tr.type === 'income' ? 'badge-success' : 'badge-warning'}`}>
                                            {tr.type === 'income' ? t('finances.incomeType') : t('finances.expenseType')}
                                        </span>
                                    </td>
                                    <td>{tr.description || '-'}</td>
                                    <td>
                                        {tr.patient && <span style={{ fontWeight: 500 }}>{tr.patient.name}</span>}
                                        {tr.caseId && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{tr.patient ? ' / ' : ''}{t('finances.order')} #{tr.caseId}</span>}
                                        {tr.case && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{JSON.parse(tr.case.toothFormula || '{}').type || ''}</div>}
                                        {!tr.caseId && !tr.patient && '-'}
                                    </td>
                                    <td style={{ fontWeight: 'bold', color: tr.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                                        {tr.type === 'income' ? '+' : '-'}{formatCurrency(tr.amountUSD)}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }}>{tr.amountUZS > 0 ? formatCurrency(tr.amountUZS, 'UZS') : '-'}</td>
                                    <td>
                                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setSelectedTransaction(tr)}>
                                            {t('finances.view')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    {hasFilters ? t('finances.noFiltered') : t('finances.noData')}
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD MODAL */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '400px', padding: '2rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{t('finances.newTransaction')}</h3>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('finances.opType')}</label>
                                <select className="input-field" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="income">{t('finances.incomeOp')}</option>
                                    <option value="expense">{t('finances.expenseOp')}</option>
                                </select>
                            </div>
                            {formData.type === 'income' && (
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="input-label">{t('finances.client')}</label>
                                    <select className="input-field" value={formData.patientId} onChange={e => setFormData({ ...formData, patientId: e.target.value })}>
                                        <option value="">{t('finances.noClient')}</option>
                                        {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
                                    </select>
                                    <small style={{ color: 'var(--text-muted)' }}>{t('finances.autoDebt')}</small>
                                </div>
                            )}
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('finances.sumUSD')}</label>
                                <input type="number" step="0.01" className="input-field" value={formData.amountUSD} onChange={e => setFormData({ ...formData, amountUSD: e.target.value })} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('finances.sumUZS')}</label>
                                <input type="number" step="1000" className="input-field" value={formData.amountUZS} onChange={e => setFormData({ ...formData, amountUZS: e.target.value })} />
                            </div>
                            <div className="input-group" style={{ marginBottom: '1rem' }}>
                                <label className="input-label">{t('finances.descriptionLabel')}</label>
                                <input type="text" className="input-field" placeholder={t('finances.descriptionPlaceholder')} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
                            </div>
                            <div className="flex gap-4 justify-end">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>{t('finances.cancel')}</button>
                                <button type="submit" className="btn btn-primary">{t('finances.save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedTransaction && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
                    <div className="card" style={{ width: '500px', padding: '2rem' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>{t('finances.transactionTitle')} #{selectedTransaction.id}</h3>
                            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem' }} onClick={() => setSelectedTransaction(null)}>{t('finances.close')}</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '1.5rem' }}>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.2rem' }}>{t('finances.typeLabel')}</p>
                                <span className={`badge ${selectedTransaction.type === 'income' ? 'badge-success' : 'badge-warning'}`}>
                                    {selectedTransaction.type === 'income' ? t('finances.incomeOp') : t('finances.expenseOp')}
                                </span>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.2rem' }}>{t('finances.dateLabel')}</p>
                                <p style={{ fontWeight: 600, margin: 0 }}>{new Date(selectedTransaction.date).toLocaleDateString('ru-RU')}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.2rem' }}>{t('finances.sumUSDLabel')}</p>
                                <p style={{ fontWeight: 'bold', fontSize: '1.4rem', margin: 0, color: selectedTransaction.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                                    {selectedTransaction.type === 'income' ? '+' : '-'}{formatCurrency(selectedTransaction.amountUSD)}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.2rem' }}>{t('finances.sumUZSLabel')}</p>
                                <p style={{ fontWeight: 600, margin: 0 }}>{selectedTransaction.amountUZS > 0 ? formatCurrency(selectedTransaction.amountUZS, 'UZS') : t('finances.notSpecified')}</p>
                            </div>
                            <div style={{ gridColumn: '1/-1' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.2rem' }}>{t('finances.descLabel')}</p>
                                <p style={{ margin: 0, fontWeight: 500 }}>{selectedTransaction.description || t('finances.notSpecified')}</p>
                            </div>
                            {selectedTransaction.patient && (
                                <div style={{ gridColumn: '1/-1' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.2rem' }}>{t('finances.clientLabel')}</p>
                                    <p style={{ margin: 0, fontWeight: 500 }}>{selectedTransaction.patient.name} — {selectedTransaction.patient.phone}</p>
                                </div>
                            )}
                            {selectedTransaction.caseId && (
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.2rem' }}>{t('finances.orderLabel')}</p>
                                    <p style={{ margin: 0, fontWeight: 600 }}>{t('finances.order')} #{selectedTransaction.caseId}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-4">
                            <button className="btn btn-secondary" onClick={() => {
                                exportSingleSheet(
                                    `Транзакция_${selectedTransaction.id}.xlsx`,
                                    'Транзакция',
                                    'Финансовый отчёт',
                                    `Транзакция №${selectedTransaction.id}`,
                                    [{
                                        'ID транзакции': selectedTransaction.id,
                                        'Дата': new Date(selectedTransaction.date).toLocaleDateString('ru-RU'),
                                        'Тип': selectedTransaction.type === 'income' ? 'Доход' : 'Расход',
                                        'ID заказчика': selectedTransaction.patient?.id || '-',
                                        'Заказчик': selectedTransaction.patient?.name || '-',
                                        'Телефон': selectedTransaction.patient?.phone || '-',
                                        'ID заказа': selectedTransaction.caseId || '-',
                                        'Вид работ (заказ)': selectedTransaction.case ? (JSON.parse(selectedTransaction.case.toothFormula || '{}').type || '-') : '-',
                                        'Зубы (заказ)': selectedTransaction.case ? (JSON.parse(selectedTransaction.case.toothFormula || '{}').teeth || []).join(', ') : '-',
                                        'Описание': selectedTransaction.description || '-',
                                        'Сумма USD': selectedTransaction.type === 'income' ? selectedTransaction.amountUSD : -selectedTransaction.amountUSD,
                                        'Сумма UZS': selectedTransaction.amountUZS || 0,
                                    }]
                                );
                            }}>{t('finances.downloadExcel')}</button>
                            <button className="btn btn-primary" onClick={() => setSelectedTransaction(null)}>{t('finances.close')}</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Finances;
