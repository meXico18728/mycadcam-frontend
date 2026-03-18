import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { useTranslation } from 'react-i18next';
import ToothFormula from '../components/ToothFormula';
import STLViewer from '../components/STLViewer';
import { formatCurrency } from '../utils/currency';
import { exportMultiSheet } from '../utils/excel';
import { getServerUrl } from '../utils/config';

const Cases = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [cases, setCases] = useState([]);
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedCase, setSelectedCase] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState('');
    const [selectedTeeth, setSelectedTeeth] = useState([]);
    const [restorationTypes, setRestorationTypes] = useState([]);
    const [selectedRestorationId, setSelectedRestorationId] = useState('');
    const [error, setError] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [paymentModal, setPaymentModal] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const calculateCost = () => {
        const type = restorationTypes.find(t => t.id === parseInt(selectedRestorationId));
        return (type ? type.priceUSD : 0) * selectedTeeth.length;
    };

    useEffect(() => {
        fetchCases();
        fetchRestorationTypes();
        if (['admin', 'doctor'].includes(user?.role)) fetchPatients();
    }, [user]);

    const fetchRestorationTypes = async () => {
        const res = await fetch(`${getServerUrl()}/api/restorations`, { headers });
        if (res.ok) {
            const data = await res.json();
            setRestorationTypes(data);
            if (data.length > 0) setSelectedRestorationId(data[0].id.toString());
        }
    };

    const fetchCaseById = async (id) => {
        const res = await fetch(`${getServerUrl()}/api/cases/${id}`, { headers });
        if (res.ok) return res.json();
        return null;
    };

    const fetchCases = async () => {
        const res = await fetch(`${getServerUrl()}/api/cases`, { headers });
        if (res.ok) {
            const data = await res.json();
            setCases(data.filter(c => c.status !== 'ready'));
        }
    };

    const fetchPatients = async () => {
        const res = await fetch(`${getServerUrl()}/api/patients`, { headers });
        if (res.ok) setPatients(await res.json());
    };

    const handleCreateCase = async (e) => {
        e.preventDefault();
        setError('');
        if (!selectedPatient) return setError(t('cases.selectPatient'));
        if (selectedTeeth.length === 0) return setError(t('cases.markTeeth'));
        const type = restorationTypes.find(t => t.id === parseInt(selectedRestorationId));
        const res = await fetch(`${getServerUrl()}/api/cases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({
                patientId: parseInt(selectedPatient),
                toothFormula: JSON.stringify({ teeth: selectedTeeth, type: type.name }),
                totalCost: calculateCost(),
                status: 'new'
            })
        });
        if (!res.ok) return setError(t('cases.newOrder'));
        await fetchCases();
        setShowCreateModal(false);
        setSelectedTeeth([]);
        setSelectedPatient('');
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile || !selectedCase) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        try {
            const res = await fetch(`${getServerUrl()}/api/upload/case/${selectedCase.id}`, {
                method: 'POST', headers, body: formData
            });
            if (!res.ok) throw new Error('Upload error');
            setUploadFile(null);
            await fetchCases();
            const updated = await fetch(`${getServerUrl()}/api/cases`, { headers });
            const all = await updated.json();
            setSelectedCase(all.find(c => c.id === selectedCase.id));
        } catch (err) { console.error(err); }
        finally { setUploading(false); }
    };

    const handleUpdateStatus = async (caseId, newStatus) => {
        const res = await fetch(`${getServerUrl()}/api/cases/${caseId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            await fetchCases();
            if (selectedCase?.id === caseId) {
                const updated = await fetchCaseById(caseId);
                if (updated) setSelectedCase(updated);
            }
        }
    };

    const handlePayment = async (caseId, amount) => {
        const res = await fetch(`${getServerUrl()}/api/finances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ type: 'income', amountUSD: amount, caseId, description: `${t('common.order')} #${caseId}` })
        });
        if (res.ok) {
            await fetchCases();
            const updated = await fetchCaseById(caseId);
            if (updated) setSelectedCase(updated);
        }
    };

    const exportSingleCase = (c) => {
        const formula = JSON.parse(c.toothFormula || '{}');
        const debt = Math.max(0, (c.totalCost || 0) - (c.paidAmount || 0));
        const statusMap = { new: 'Новый', modeling: 'Моделирование', processing: 'Обработка', ready: 'Готов' };
        const info = [{
            'ID заказа': c.id,
            'Дата создания': new Date(c.createdAt).toLocaleDateString('ru-RU'),
            'ID заказчика': c.patient?.id || '-',
            'Заказчик': c.patient?.name || '-',
            'Телефон': c.patient?.phone || '-',
            'Статус': statusMap[c.status] || c.status,
            'Вид работ': formula.type || '-',
            'Зубы': (formula.teeth || []).join(', '),
            'Кол-во зубов': (formula.teeth || []).length,
            'Стоимость USD': c.totalCost || 0,
            'Оплачено USD': c.paidAmount || 0,
            'Долг USD': debt,
            'Погашено': debt <= 0 ? 'Да' : 'Нет',
        }];
        const txData = (c.transactions || []).map(tx => ({
            'ID транзакции': tx.id,
            'Дата': new Date(tx.date).toLocaleDateString('ru-RU'),
            'Тип': tx.type === 'income' ? 'Доход' : 'Расход',
            'ID заказа': tx.caseId || '-',
            'ID заказчика': c.patient?.id || '-',
            'Заказчик': c.patient?.name || '-',
            'Телефон': c.patient?.phone || '-',
            'Сумма USD': tx.type === 'income' ? tx.amountUSD : -tx.amountUSD,
            'Сумма UZS': tx.amountUZS || 0,
            'Описание': tx.description || '-',
        }));
        exportMultiSheet(
            `Заказ_${c.id}_${c.patient?.name || ''}_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`,
            `Заказ #${c.id}`,
            `Заказчик: ${c.patient?.name || '-'}`,
            [
                { name: 'Информация', data: info },
                { name: 'Платежи', data: txData.length ? txData : [{ 'Платежи': 'Нет платежей' }] },
            ]
        );
    };

    const exportCasesToExcel = () => {
        const data = filteredCases.map(c => {
            const formula = JSON.parse(c.toothFormula || '{}');
            const debt = (c.totalCost || 0) - (c.paidAmount || 0);
            const statusMap = { new: 'Новый', modeling: 'Моделирование', processing: 'Обработка', ready: 'Готов' };
            return {
                'ID': c.id,
                'Дата создания': new Date(c.createdAt).toLocaleDateString('ru-RU'),
                'Заказчик': c.patient?.name || '-',
                'Телефон': c.patient?.phone || '-',
                'Статус': statusMap[c.status] || c.status,
                'Вид работ': formula.type || '-',
                'Зубы': (formula.teeth || []).join(', '),
                'Кол-во зубов': (formula.teeth || []).length,
                'Стоимость USD': c.totalCost || 0,
                'Оплачено USD': c.paidAmount || 0,
                'Долг USD': debt > 0 ? debt : 0,
                'Погашено': debt <= 0 ? 'Да' : 'Нет',
            };
        });
        exportMultiSheet(
            `Заказы_MyCadCam_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`,
            'Отчёт по активным заказам',
            `Активных заказов: ${filteredCases.length}`,
            [{ name: 'Заказы', data }]
        );
    };

    const handleDeleteCase = async (id) => {
        if (!window.confirm(`${t('cases.delete')} #${id}?`)) return;
        await fetch(`${getServerUrl()}/api/cases/${id}`, { method: 'DELETE', headers });
        fetchCases();
    };

    const getStatusBadge = (status) => {
        const map = {
            new: <span className="badge badge-neutral">{t('statuses.new')}</span>,
            modeling: <span className="badge badge-warning">{t('statuses.modeling')}</span>,
            processing: <span className="badge badge-warning">{t('statuses.processing')}</span>,
            ready: <span className="badge badge-success">{t('statuses.ready')}</span>,
        };
        return map[status] || <span className="badge badge-neutral">{status}</span>;
    };

    const filteredCases = cases.filter(c => {
        const term = searchTerm.toLowerCase();
        return (c.patient?.name?.toLowerCase() || '').includes(term) ||
            (c.patient?.phone?.toLowerCase() || '').includes(term) ||
            c.id.toString().includes(term);
    });

    const STEPS = ['new', 'modeling', 'processing', 'ready'];
    const STEP_LABELS = { new: t('statuses.new'), modeling: t('statuses.modeling'), processing: t('statuses.processing'), ready: t('statuses.ready') };

    return (
        <Layout>
            <div className="card glass-panel flex justify-between items-center">
                <div>
                    <h3>{t('cases.title')}</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>{t('cases.noActive')}</p>
                </div>
                {['admin', 'doctor'].includes(user?.role) && (
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ {t('cases.add')}</button>
                )}
            </div>

                <div className="card" style={{ padding: '1rem 1.5rem' }}>
                    <div className="flex gap-4 items-center">
                        <input type="text" className="input-field" style={{ maxWidth: '400px' }}
                            placeholder={t('cases.search')} value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)} />
                        <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={exportCasesToExcel}>
                            ↓ Excel
                        </button>
                    </div>
                </div>

            <div className="table-container">
                {filteredCases.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('cases.noActive')}</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{t('cases.patient')}</th>
                                <th>{t('cases.date')}</th>
                                <th>{t('cases.workType')}</th>
                                <th>{t('cases.status')}</th>
                                <th>{t('cases.cost')}</th>
                                <th>{t('cases.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCases.map(c => {
                                const formula = JSON.parse(c.toothFormula || '{}');
                                return (
                                <tr key={c.id} className="table-row-hover">
                                    <td><span className="badge badge-neutral" style={{ fontSize: '0.8rem' }}>#{c.id}</span></td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{c.patient?.name || `ID ${c.patientId}`}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.patient?.phone}</div>
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
                                            : <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>✓ {t('cases.paid')}</div>}
                                    </td>
                                    <td>
                                        <div className="flex gap-4">
                                            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSelectedCase(c)}>{t('cases.open')}</button>
                                            {user?.role === 'admin' && (
                                                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDeleteCase(c.id)}>{t('cases.delete')}</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* CREATE MODAL */}
            {showCreateModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div className="card glass-panel" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>{t('cases.newOrder')}</h3>
                        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '4px' }}>{error}</div>}
                        <form onSubmit={handleCreateCase} className="flex flex-col gap-6">
                            <div className="input-group">
                                <label className="input-label">{t('cases.patient')}</label>
                                <select className="input-field" value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} required>
                                    <option value="" disabled>{t('cases.selectPatient')}</option>
                                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="input-label" style={{ marginBottom: '1rem', display: 'block' }}>{t('cases.markTeeth')}</label>
                                <ToothFormula selectedTeeth={selectedTeeth} onChange={setSelectedTeeth} />
                            </div>
                            <div className="flex gap-4">
                                <div className="input-group w-full">
                                    <label className="input-label">{t('cases.restoType')}</label>
                                    <select className="input-field" value={selectedRestorationId} onChange={e => setSelectedRestorationId(e.target.value)}>
                                        {restorationTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group w-full">
                                    <label className="input-label">{t('cases.estimatedCost')}</label>
                                    <div className="input-field" style={{ backgroundColor: 'var(--bg-main)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>{formatCurrency(calculateCost())}</div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>{t('cases.cancel')}</button>
                                <button type="submit" className="btn btn-primary" disabled={selectedTeeth.length === 0 || !selectedPatient}>{t('cases.submit')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DETAILS MODAL */}
            {selectedCase && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div className="card glass-panel flex flex-col gap-6" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{t('cases.cardTitle')} <span className="badge badge-neutral">#{selectedCase.id}</span></h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('cases.patient')}: {selectedCase.patient?.name}</p>
                            </div>
                            <div className="flex gap-4">
                                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => exportSingleCase(selectedCase)}>↓ Excel</button>
                                <button className="btn btn-secondary" onClick={() => setSelectedCase(null)}>{t('cases.close')}</button>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="flex-col gap-4" style={{ flex: 1 }}>
                                {/* PROGRESS */}
                                <div className="card" style={{ padding: '1rem', boxShadow: 'none', marginBottom: '1rem' }}>
                                    <h4 style={{ marginBottom: '1rem' }}>{t('cases.progress')}</h4>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {STEPS.map((step, idx) => {
                                            const currentIndex = STEPS.indexOf(selectedCase.status);
                                            const isActive = idx <= currentIndex;
                                            return (
                                                <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                                                    <div onClick={() => handleUpdateStatus(selectedCase.id, step)}
                                                        style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: isActive ? 'var(--primary)' : 'var(--border)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', zIndex: 2, cursor: 'pointer', transition: '0.3s' }}>
                                                        {idx + 1}
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: isActive ? 'var(--text-main)' : 'var(--text-muted)', textAlign: 'center' }}>{STEP_LABELS[step]}</span>
                                                    {idx < STEPS.length - 1 && (
                                                        <div style={{ position: 'absolute', top: '16px', left: '50%', width: '100%', height: '4px', backgroundColor: idx < currentIndex ? 'var(--primary)' : 'var(--border)', zIndex: 1 }} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* DETAILS */}
                                <div className="card" style={{ padding: '1rem', boxShadow: 'none' }}>
                                    <h4 style={{ marginBottom: '1rem' }}>{t('cases.details')}</h4>
                                    <p><strong>{t('cases.status')}:</strong> {getStatusBadge(selectedCase.status)}</p>
                                    <p><strong>{t('cases.cost')}:</strong> {formatCurrency(selectedCase.totalCost)}</p>
                                    <p><strong>{t('cases.teeth')}:</strong> {JSON.parse(selectedCase.toothFormula || '{}').teeth?.join(', ')}</p>
                                    <p><strong>{t('cases.workType')}:</strong> {JSON.parse(selectedCase.toothFormula || '{}').type}</p>
                                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p style={{ margin: 0 }}><strong>{t('cases.toPay')}:</strong> {formatCurrency(selectedCase.totalCost)}</p>
                                                <p style={{ margin: 0, color: 'var(--success)' }}><strong>{t('cases.paid')}:</strong> {formatCurrency(selectedCase.paidAmount || 0)}</p>
                                                {(selectedCase.totalCost - (selectedCase.paidAmount || 0)) > 0 && (
                                                    <p style={{ margin: 0, color: 'var(--danger)', fontWeight: 'bold' }}>
                                                        <strong>{t('cases.debt')}:</strong> {formatCurrency(selectedCase.totalCost - (selectedCase.paidAmount || 0))}
                                                    </p>
                                                )}
                                            </div>
                                            {['admin', 'accountant'].includes(user?.role) && (selectedCase.totalCost - (selectedCase.paidAmount || 0)) > 0 && (
                                                <button className="btn btn-primary" style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                                                    onClick={() => { setPaymentAmount((selectedCase.totalCost - (selectedCase.paidAmount || 0)).toString()); setPaymentModal({ caseId: selectedCase.id, maxAmount: selectedCase.totalCost - (selectedCase.paidAmount || 0) }); }}>
                                                    {t('cases.acceptPayment')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* UPLOAD */}
                                <div className="card" style={{ padding: '1rem', boxShadow: 'none', marginTop: '1rem' }}>
                                    <h4 style={{ marginBottom: '1rem' }}>{t('cases.upload3d')}</h4>
                                    <form onSubmit={handleFileUpload} className="flex gap-4 items-center">
                                        <input type="file" accept=".stl,.png,.jpg" onChange={e => setUploadFile(e.target.files[0])} className="input-field" style={{ flex: 1, padding: '0.4rem' }} />
                                        <button type="submit" className="btn btn-primary" disabled={!uploadFile || uploading}>
                                            {uploading ? t('cases.uploading') : t('cases.uploadBtn')}
                                        </button>
                                    </form>
                                </div>
                            </div>

                            <div style={{ flex: 1 }}>
                                <h4 style={{ marginBottom: '1rem' }}>{t('cases.viewer3d')}</h4>
                                {selectedCase.attachments?.filter(a => a.type === 'stl').length > 0 ? (
                                    <STLViewer url={`${getServerUrl()}${selectedCase.attachments.filter(a => a.type === 'stl')[0].filePath}`} />
                                ) : (
                                    <div className="card" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'none' }}>
                                        <p style={{ color: 'var(--text-muted)' }}>{selectedCase.attachments?.length > 0 ? t('cases.noStl') : t('cases.noFiles')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PAYMENT MODAL */}
            {paymentModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="card" style={{ width: '380px', padding: '2rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{t('cases.paymentTitle')}</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('cases.paymentDebt')}: <strong style={{ color: 'var(--danger)' }}>{formatCurrency(paymentModal.maxAmount)}</strong></p>
                        <div className="input-group">
                            <label className="input-label">{t('cases.paymentAmount')}</label>
                            <input type="number" step="0.01" className="input-field" autoFocus value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} max={paymentModal.maxAmount} />
                        </div>
                        <div className="flex justify-end gap-4" style={{ marginTop: '1.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => setPaymentModal(null)}>{t('cases.cancel')}</button>
                            <button className="btn btn-primary" style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                                disabled={!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0}
                                onClick={() => { handlePayment(paymentModal.caseId, parseFloat(paymentAmount)); setPaymentModal(null); }}>
                                {t('cases.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Cases;
