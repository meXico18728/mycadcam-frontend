import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { formatCurrency } from '../utils/currency';
import { exportMultiSheet } from '../utils/excel';
import { getServerUrl } from '../utils/config';

const Patients = () => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [newPatient, setNewPatient] = useState({ name: '', phone: '' });
    const [error, setError] = useState('');

    const { user } = useAuth();
    const { t } = useTranslation();
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    useEffect(() => { fetchPatients(); }, []);

    async function fetchPatients() {
        try {
            const res = await fetch(`${getServerUrl()}/api/patients`, { headers });
            if (res.ok) setPatients(await res.json());
        } catch (err) { console.error(err); }
    }

    async function openPatientCard(patientId) {
        try {
            const res = await fetch(`${getServerUrl()}/api/patients/${patientId}`, { headers });
            if (res.ok) setSelectedPatient(await res.json());
        } catch (err) { console.error(err); }
    }

    const handleAddPatient = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch(`${getServerUrl()}/api/patients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(newPatient)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t('common.error'));
            await fetchPatients();
            setShowModal(false);
            setNewPatient({ name: '', phone: '' });
        } catch (err) { setError(err.message); }
    };

    const filteredPatients = patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm)
    );

    const getStatusBadge = (status) => {
        const map = {
            new: <span className="badge badge-neutral">{t('statuses.new')}</span>,
            modeling: <span className="badge badge-warning">{t('statuses.modeling')}</span>,
            processing: <span className="badge badge-warning">{t('statuses.processing')}</span>,
            ready: <span className="badge badge-success">{t('statuses.ready')}</span>,
        };
        return map[status] || <span className="badge badge-neutral">{status}</span>;
    };

    const exportPatientToExcel = (patient) => {
        const statusMap = { new: 'Новый', modeling: 'Моделирование', processing: 'Обработка', ready: 'Готов' };
        const totalDebt = patient.cases?.reduce((sum, c) => sum + Math.max(0, (c.totalCost || 0) - (c.paidAmount || 0)), 0) || 0;
        const totalPaid = patient.cases?.reduce((sum, c) => sum + (c.paidAmount || 0), 0) || 0;
        const totalCost = patient.cases?.reduce((sum, c) => sum + (c.totalCost || 0), 0) || 0;

        const infoData = [{
            'ID заказчика': patient.id,
            'Имя': patient.name,
            'Телефон': patient.phone,
            'Кол-во заказов': patient.cases?.length || 0,
            'Общая стоимость USD': totalCost,
            'Итого оплачено USD': totalPaid,
            'Общий долг USD': totalDebt,
            'Дата выгрузки': new Date().toLocaleDateString('ru-RU'),
        }];

        const casesData = (patient.cases || []).map(c => {
            const formula = JSON.parse(c.toothFormula || '{}');
            const debt = Math.max(0, (c.totalCost || 0) - (c.paidAmount || 0));
            return {
                'ID заказа': c.id,
                'Дата создания': new Date(c.createdAt).toLocaleDateString('ru-RU'),
                'Заказчик': patient.name,
                'Телефон': patient.phone,
                'Статус': statusMap[c.status] || c.status,
                'Вид работ': formula.type || '-',
                'Зубы': (formula.teeth || []).join(', '),
                'Кол-во зубов': (formula.teeth || []).length,
                'Стоимость USD': c.totalCost || 0,
                'Оплачено USD': c.paidAmount || 0,
                'Долг USD': debt,
                'Погашено': debt <= 0 ? 'Да' : 'Нет',
            };
        });

        const allTx = (patient.transactions || []).map(tr => ({
            'ID транзакции': tr.id,
            'Дата': new Date(tr.date).toLocaleDateString('ru-RU'),
            'Тип': tr.type === 'income' ? 'Доход' : 'Расход',
            'Заказчик': patient.name,
            'Телефон': patient.phone,
            'ID заказа': tr.caseId || '-',
            'Сумма USD': tr.amountUSD || 0,
            'Сумма UZS': tr.amountUZS || 0,
            'Описание': tr.description || '-',
        }));

        exportMultiSheet(
            `Заказчик_${patient.name}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`,
            `Карточка заказчика: ${patient.name}`,
            `Тел.: ${patient.phone} | Заказов: ${patient.cases?.length || 0} | Долг: $${totalDebt}`,
            [
                { name: 'Сводка', data: infoData },
                { name: 'Заказы', data: casesData.length ? casesData : [{ 'Заказы': 'Нет заказов' }] },
                { name: 'Транзакции', data: allTx.length ? allTx : [{ 'Транзакции': 'Нет транзакций' }] },
            ]
        );
    };

    return (
        <Layout>
            <div className="card flex justify-between items-center" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
                <div>
                    <h3 style={{ margin: 0 }}>{t('patients.title')}</h3>
                </div>
                {['admin', 'doctor'].includes(user?.role) && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ {t('patients.add')}</button>
                )}
            </div>

            <div className="card">
                <div className="input-group" style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
                    <input type="text" className="input-field" placeholder={t('patients.search')}
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th># ID</th>
                                <th>{t('patients.name')}</th>
                                <th>{t('patients.phone')}</th>
                                <th>{t('patients.casesCount')}</th>
                                <th>{t('patients.debt')}</th>
                                <th>{t('patients.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.length > 0 ? filteredPatients.map((p) => (
                                <tr key={p.id} className="table-row-hover">
                                    <td style={{ fontWeight: '500' }}>{p.id}</td>
                                    <td style={{ fontWeight: '500' }}>{p.name}</td>
                                    <td>{p.phone}</td>
                                    <td><span className="badge badge-neutral">{p.cases?.length || 0}</span></td>
                                    <td style={{ fontWeight: 'bold', color: p.cases?.reduce((sum, c) => sum + ((c.totalCost || 0) - (c.paidAmount || 0)), 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                        {formatCurrency(p.cases?.reduce((sum, c) => sum + ((c.totalCost || 0) - (c.paidAmount || 0)), 0) || 0)}
                                    </td>
                                    <td>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openPatientCard(p.id)}>
                                            {t('patients.openCard')}
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        {t('patients.notFound')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
                        <h3 style={{ marginBottom: '1.5rem', marginTop: 0 }}>{t('patients.newForm')}</h3>
                        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
                        <form onSubmit={handleAddPatient} className="flex flex-col gap-4">
                            <div className="input-group">
                                <label className="input-label">{t('patients.name')}</label>
                                <input required type="text" className="input-field" value={newPatient.name} onChange={e => setNewPatient({ ...newPatient, name: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">{t('patients.phone')}</label>
                                <input required type="text" className="input-field" placeholder="+7 999 123 45 67" value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-4 mt-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('patients.cancel')}</button>
                                <button type="submit" className="btn btn-primary">{t('patients.create')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedPatient && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>{t('patients.card')}: {selectedPatient.name}</h3>
                            <div className="flex gap-4 items-center">
                                <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem' }} onClick={() => exportPatientToExcel(selectedPatient)}>
                                    {t('patients.exportExcel')}
                                </button>
                                <button className="btn btn-secondary" onClick={() => setSelectedPatient(null)}>{t('common.close')}</button>
                            </div>
                        </div>

                        <div className="flex gap-6" style={{ marginBottom: '2rem' }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t('patients.clientId')}</p>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>#{selectedPatient.id}</p>
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t('patients.phone')}</p>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedPatient.phone}</p>
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t('patients.totalCases')}</p>
                                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{selectedPatient.cases?.length || 0}</p>
                            </div>
                            <div style={{ flex: 1, borderLeft: '2px solid var(--border)', paddingLeft: '1.5rem' }}>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t('patients.totalDebt')}</p>
                                <p style={{ fontWeight: 'bold', fontSize: '1.3rem', color: selectedPatient.cases?.reduce((sum, c) => sum + ((c.totalCost || 0) - (c.paidAmount || 0)), 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                    {formatCurrency(selectedPatient.cases?.reduce((sum, c) => sum + ((c.totalCost || 0) - (c.paidAmount || 0)), 0) || 0)}
                                </p>
                            </div>
                        </div>

                        <h4 style={{ marginBottom: '1rem' }}>{t('patients.caseHistory')}</h4>
                        {selectedPatient.cases && selectedPatient.cases.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th># ID</th>
                                            <th>{t('cases.status')}</th>
                                            <th>{t('cases.cost')}</th>
                                            <th>{t('cases.debt')}</th>
                                            <th>{t('cases.date')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPatient.cases.map(c => (
                                            <tr key={c.id}>
                                                <td><span className="badge badge-neutral" style={{ fontSize: '0.8rem' }}>#{c.id}</span></td>
                                                <td>{getStatusBadge(c.status)}</td>
                                                <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>{formatCurrency(c.totalCost)}</td>
                                                <td style={{ fontWeight: '600', color: ((c.totalCost || 0) - (c.paidAmount || 0)) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                                    {((c.totalCost || 0) - (c.paidAmount || 0)) > 0 ? formatCurrency((c.totalCost || 0) - (c.paidAmount || 0)) : t('cases.paid')}
                                                </td>
                                                <td style={{ color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>{t('patients.noCases')}</p>
                        )}

                        <h4 style={{ marginBottom: '1rem', marginTop: '2.5rem' }}>{t('patients.paymentHistory')}</h4>
                        {selectedPatient.transactions && selectedPatient.transactions.filter(tr => tr.type === 'income').length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t('finances.date')}</th>
                                            <th>{t('finances.amountUSD')}</th>
                                            <th>{t('finances.amountUZS')}</th>
                                            <th>{t('finances.description')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPatient.transactions.filter(tr => tr.type === 'income').map(tr => (
                                            <tr key={tr.id}>
                                                <td style={{ color: 'var(--text-muted)' }}>{new Date(tr.date).toLocaleDateString('ru-RU')}</td>
                                                <td style={{ fontWeight: '600', color: 'var(--success)' }}>+{formatCurrency(tr.amountUSD)}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{tr.amountUZS > 0 ? formatCurrency(tr.amountUZS, 'UZS') : '-'}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>{tr.description || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>{t('patients.noPayments')}</p>
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Patients;
