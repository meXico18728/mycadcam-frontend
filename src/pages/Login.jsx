import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getServerUrl } from '../utils/config';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [role, setRole] = useState('doctor');
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        const url = isLogin ? `${getServerUrl()}/api/auth/login` : `${getServerUrl()}/api/auth/register`;
        const payload = isLogin ? { emailOrPhone, password } : { name, emailOrPhone, password, role };
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Ошибка');
            if (isLogin) { login(data.user, data.token); navigate('/dashboard'); }
            else { setIsLogin(true); setSuccessMsg('Регистрация успешна! Войдите.'); setPassword(''); }
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">🦷</div>
                    <h1>MyCadCam Lab</h1>
                    <p>{isLogin ? 'Вход в систему' : 'Регистрация нового пользователя'}</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid rgba(239,68,68,0.15)' }}>
                        ⚠️ {error}
                    </div>
                )}
                {successMsg && (
                    <div style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', padding: '0.65rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid rgba(16,185,129,0.15)' }}>
                        ✅ {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div className="input-group">
                                <label className="input-label">ФИО</label>
                                <input type="text" className="input-field" placeholder="Иванов Иван Иванович" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Роль</label>
                                <select className="input-field" value={role} onChange={e => setRole(e.target.value)}>
                                    <option value="doctor">Врач / Заказчик</option>
                                    <option value="tech">Зубной техник</option>
                                    <option value="accountant">Бухгалтер</option>
                                    <option value="admin">Администратор</option>
                                </select>
                            </div>
                        </>
                    )}
                    <div className="input-group">
                        <label className="input-label">Телефон / Email</label>
                        <input type="text" className="input-field" placeholder="+998 99 123 45 67" value={emailOrPhone} onChange={e => setEmailOrPhone(e.target.value)} autoComplete="username" required />
                    </div>
                    <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                        <label className="input-label">Пароль</label>
                        <div style={{ position: 'relative' }}>
                            <input type={showPass ? 'text' : 'password'} className="input-field" placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight: '2.5rem' }} required />
                            <button type="button" onClick={() => setShowPass(p => !p)}
                                style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {showPass ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}
                        style={{ width: '100%', height: '40px', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                        {loading ? '⏳ Загрузка...' : isLogin ? '🔑 Войти' : '✅ Зарегистрироваться'}
                    </button>
                    <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }}
                        style={{ width: '100%', background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.875rem', cursor: 'pointer', padding: '0.5rem' }}>
                        {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default Login;
