import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getServerUrl } from '../utils/config';

export default function Prices() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [restorations, setRestorations] = useState([]);
    const [newResName, setNewResName] = useState('');
    const [newResPrice, setNewResPrice] = useState('');
    const [editingRes, setEditingRes] = useState(null);
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    async function fetchRestorations() {
        const res = await fetch(`${getServerUrl()}/api/restorations`, { headers });
        if (res.ok) setRestorations(await res.json());
    }

    useEffect(() => { fetchRestorations(); }, []);

    const handleAddRestoration = async (e) => {
        e.preventDefault();
        const res = await fetch(`${getServerUrl()}/api/restorations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ name: newResName, priceUSD: parseFloat(newResPrice) })
        });
        if (res.ok) { setNewResName(''); setNewResPrice(''); fetchRestorations(); }
    };

    const handleDeleteRestoration = async (id) => {
        if (!window.confirm(t('prices.delete') + '?')) return;
        const res = await fetch(`${getServerUrl()}/api/restorations/${id}`, { method: 'DELETE', headers });
        if (res.ok) fetchRestorations();
    };

    const handleUpdateRestoration = async () => {
        const res = await fetch(`${getServerUrl()}/api/restorations/${editingRes.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ name: editingRes.name, priceUSD: parseFloat(editingRes.priceUSD) })
        });
        if (res.ok) { setEditingRes(null); fetchRestorations(); }
    };

    if (user?.role !== 'admin') {
        return (
            <Layout>
                <div className="card" style={{ padding: '2rem' }}>
                    <h3>{t('prices.noAccess')}</h3>
                    <p style={{ color: 'var(--text-muted)' }}>{t('prices.noAccessText')}</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="card glass-panel" style={{ marginBottom: '0.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>{t('prices.title')}</h3>
                <p style={{ color: 'var(--text-muted)' }}>{t('prices.subtitle')}</p>
            </div>

            <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                <h4 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>{t('prices.addNew')}</h4>
                <form onSubmit={handleAddRestoration} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="input-group" style={{ flex: 2 }}>
                        <input required type="text" className="input-field" placeholder={t('prices.namePlaceholder')}
                            value={newResName} onChange={e => setNewResName(e.target.value)} />
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                        <input required type="number" step="0.1" className="input-field" placeholder={t('prices.pricePlaceholder')}
                            value={newResPrice} onChange={e => setNewResPrice(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.55rem 1.5rem' }}>{t('prices.add')}</button>
                    </div>
                </form>

                <h4 style={{ marginBottom: '1rem', color: 'var(--primary)', marginTop: '2rem' }}>{t('prices.existing')}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {restorations.length === 0 && <p style={{ color: 'var(--text-muted)' }}>{t('prices.empty')}</p>}
                    {restorations.map(res => (
                        <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
                            {editingRes?.id === res.id ? (
                                <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'center' }}>
                                    <input className="input-field" value={editingRes.name}
                                        onChange={e => setEditingRes({ ...editingRes, name: e.target.value })} style={{ flex: 2 }} />
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <input type="number" step="0.1" className="input-field" value={editingRes.priceUSD}
                                            onChange={e => setEditingRes({ ...editingRes, priceUSD: e.target.value })}
                                            style={{ paddingLeft: '2rem' }} />
                                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold' }}>$</span>
                                    </div>
                                    <button className="btn btn-primary" onClick={handleUpdateRestoration}>{t('prices.save')}</button>
                                    <button className="btn btn-secondary" onClick={() => setEditingRes(null)}>{t('prices.cancel')}</button>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontWeight: 500, fontSize: '1.1rem' }}>{res.name}</span>
                                        <span className="badge badge-success" style={{ fontSize: '1rem', padding: '0.3rem 0.6rem' }}>{res.priceUSD} $</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setEditingRes(res)}>{t('prices.edit')}</button>
                                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDeleteRestoration(res.id)}>{t('prices.delete')}</button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
}
