import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import STLViewer from '../components/STLViewer';
import { formatCurrency } from '../utils/currency';
import { exportMultiSheet } from '../utils/excel';
import { getServerUrl } from '../utils/config';

const Archive = () => {
    const { t } = useTranslation();
    const [cases, setCases] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCase, setSelectedCase] = useState(null);

    async function fetchArchiveCases() {
        try {
            const res = await fetch(`${getServerUrl()}/api/cases`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCases(data.filter(c => c.status === 'ready'));
            }
        } catch (err) { console.error(err); }
    }

    useEffect(() => { fetchArchiveCases(); }, []);

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

    const exportSingleCase = (c) => {
        const formula = JSON.parse(c.toothFormula || '{}');
        const debt = Math.max(0, (c.totalCost || 0) - (c.paidAmount || 0));
        const info = [{
            'ID заказа': c.id,
            'Дата создания': new Date(c.createdAt).toLocaleDateString('ru-RU'),
            'ID заказчика': c.patient?.id || '-',
            'Заказчик': c.patient?.name || '-',
            'Телефон': c.patient?.phone || '-',
            'Статус': 'Готов',
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

    const exportToExcel = () => {
        const data = filteredCases.map(c => {
            const formula = JSON.parse(c.toothFormula || '{}');
            const debt = (c.totalCost || 0) - (c.paidAmount || 0);
            return {
                'ID': c.id,
                'Дата создания': new Date(c.createdAt).toLocaleDateString('ru-RU'),
                'Заказчик': c.patient?.name || '-',
                'Телефон': c.patient?.phone || '-',
                'Статус': 'Готов',
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
            `Архив_MyCadCam_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`,
            'Отчёт по архивным заказам',
            `Готовых заказов: ${filteredCases.length}`,
            [{ name: 'Архив', data }]
        );
    };

    return (
        <Layout>
            <div className="card glass-panel flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                <div>
                    <h3>{t('archive.title')}</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>{t('archive.subtitle')}</p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div className="flex gap-4 items-center">
                    <input type="text" className="input-field" style={{ maxWidth: '400px' }} placeholder={t('archive.search')}
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <button className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={exportToExcel}>
                        ↓ Excel
                    </button>
                </div>
            </div>

            <div className="table-container">
                {filteredCases.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('archive.empty')}</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{t('cases.patient')}</th>
                                <th>{t('cases.date')}</th>
                                <th>{t('cases.status')}</th>
                                <th>{t('cases.cost')}</th>
                                <th>{t('cases.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCases.map((c) => (
                                <tr key={c.id} className="table-row-hover">
                                    <td><span className="badge badge-neutral" style={{ fontSize: '0.8rem' }}>#{c.id}</span></td>
                                    <td>{c.patient?.name || `ID ${c.patientId}`}</td>
                                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{new Date(c.createdAt).toLocaleDateString('ru-RU')}</td>
                                    <td>{getStatusBadge(c.status)}</td>
                                    <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>{formatCurrency(c.totalCost)}</td>
                                    <td>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSelectedCase(c)}>
                                            {t('cases.open')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedCase && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '2rem' }}>
                    <div className="card glass-panel flex flex-col gap-6" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{t('archive.archiveCard')} <span className="badge badge-neutral">#{selectedCase.id}</span></h3>
                                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('cases.patient')}: {selectedCase.patient?.name}</p>
                            </div>
                            <div className="flex gap-4">
                                <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => exportSingleCase(selectedCase)}>↓ Excel</button>
                                <button className="btn btn-secondary" onClick={() => setSelectedCase(null)}>{t('common.close')}</button>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            <div className="flex-col gap-4" style={{ flex: 1 }}>
                                <div className="card" style={{ padding: '1rem', boxShadow: 'none' }}>
                                    <h4 style={{ marginBottom: '1rem' }}>{t('cases.details')}</h4>
                                    <p><strong>{t('cases.status')}:</strong> {getStatusBadge(selectedCase.status)}</p>
                                    <p><strong>{t('cases.cost')}:</strong> {formatCurrency(selectedCase.totalCost)}</p>
                                    <p><strong>{t('cases.teeth')}:</strong> {JSON.parse(selectedCase.toothFormula || '{}').teeth?.join(', ')}</p>
                                    <p><strong>{t('cases.workType')}:</strong> {JSON.parse(selectedCase.toothFormula || '{}').type}</p>
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
        </Layout>
    );
};

export default Archive;
