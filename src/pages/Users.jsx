import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getServerUrl } from '../utils/config';

const EMPTY_FORM = { name: '', emailOrPhone: '', password: '', role: 'doctor' };

export default function Users() {
    const { user: currentUser } = useAuth();
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState('');
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    async function fetchUsers() {
        const res = await fetch(`${getServerUrl()}/api/users`, { headers });
        if (res.ok) setUsers(await res.json());
    }

    useEffect(() => { fetchUsers(); }, []);

    const openCreate = () => { setEditingUser(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); };
    const openEdit = (u) => { setEditingUser(u); setForm({ name: u.name, emailOrPhone: u.emailOrPhone, password: '', role: u.role }); setError(''); setShowModal(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const url = editingUser ? `${getServerUrl()}/api/users/${editingUser.id}` : `${getServerUrl()}/api/users`;
        const method = editingUser ? 'PUT' : 'POST';
        const body = editingUser
            ? { name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) }
            : form;
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) return setError(data.error || 'Error');
        setShowModal(false);
        fetchUsers();
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('users.confirmDelete'))) return;
        const res = await fetch(`${getServerUrl()}/api/users/${id}`, { method: 'DELETE', headers });
        if (res.ok) fetchUsers();
    };

    if (currentUser?.role !== 'admin') {
        return (
            <Layout>
                <div className="card" style={{ padding: '2rem' }}>
                    <h3>{t('users.noAccess')}</h3>
                    <p style={{ color: 'var(--text-muted)' }}>{t('users.noAccessText')}</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="card glass-panel flex justify-between items-center">
                <div>
                    <h3>{t('users.title')}</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>{t('users.subtitle')}</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>{t('users.add')}</button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>{t('users.id')}</th>
                            <th>{t('users.name')}</th>
                            <th>{t('users.login')}</th>
                            <th>{t('users.role')}</th>
                            <th>{t('users.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="table-row-hover">
                                <td>{u.id}</td>
                                <td style={{ fontWeight: 500 }}>{u.name}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{u.emailOrPhone}</td>
                                <td>
                                    <span className={`badge ${u.role === 'admin' ? 'badge-success' : 'badge-neutral'}`}>
                                        {t(`roles.${u.role}`) || u.role}
                                    </span>
                                </td>
                                <td>
                                    <div className="flex gap-4">
                                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openEdit(u)}>{t('users.edit')}</button>
                                        {u.id !== currentUser?.userId && (
                                            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDelete(u.id)}>{t('users.delete')}</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('users.noUsers')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '420px', padding: '2rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{editingUser ? t('users.editTitle') : t('users.createTitle')}</h3>
                        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '4px' }}>{error}</div>}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('users.name')}</label>
                                <input required type="text" className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            {!editingUser && (
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                    <label className="input-label">{t('users.loginLabel')}</label>
                                    <input required type="text" className="input-field" value={form.emailOrPhone} onChange={e => setForm({ ...form, emailOrPhone: e.target.value })} />
                                </div>
                            )}
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{editingUser ? t('users.passwordEditLabel') : t('users.passwordLabel')}</label>
                                <input type="password" className="input-field" required={!editingUser} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <label className="input-label">{t('users.roleLabel')}</label>
                                <select className="input-field" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                    <option value="doctor">{t('roles.doctor')}</option>
                                    <option value="tech">{t('roles.tech')}</option>
                                    <option value="accountant">{t('roles.accountant')}</option>
                                    <option value="admin">{t('roles.admin')}</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-4" style={{ marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('users.cancel')}</button>
                                <button type="submit" className="btn btn-primary">{editingUser ? t('users.save') : t('users.create')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
