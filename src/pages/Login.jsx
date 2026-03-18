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
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const url = isLogin ? `${getServerUrl()}/api/auth/login` : `${getServerUrl()}/api/auth/register`;
        const payload = isLogin
            ? { emailOrPhone, password }
            : { name, emailOrPhone, password, role };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || (isLogin ? 'Ошибка входа' : 'Ошибка регистрации'));
            }

            if (isLogin) {
                login(data.user, data.token);
                navigate('/dashboard');
            } else {
                setIsLogin(true);
                setSuccessMsg('Регистрация успешна! Теперь вы можете войти.');
                setPassword('');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-main)', padding: '1rem' }}>
            <div className="card flex-col gap-6" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem' }}>
                <div className="text-center mb-8">
                    <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary)' }}>MyCadCam <span style={{ fontWeight: 400, opacity: 0.8, color: 'var(--text-main)' }}>| Lab</span></h2>
                    <p className="mt-4" style={{ color: 'var(--text-muted)' }}>{isLogin ? 'Вход в Систему' : 'Регистрация'}</p>
                </div>

                {error && (
                    <div style={{ backgroundColor: 'var(--danger)', color: 'white', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}
                {successMsg && (
                    <div style={{ backgroundColor: 'var(--success)', color: 'white', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {!isLogin && (
                        <div className="input-group" style={{ marginBottom: '0' }}>
                            <label className="input-label">ФИО</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Иванов Иван..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    {!isLogin && (
                        <div className="input-group" style={{ marginBottom: '0' }}>
                            <label className="input-label">Роль</label>
                            <select className="input-field" value={role} onChange={(e) => setRole(e.target.value)}>
                                <option value="doctor">Врач</option>
                                <option value="tech">Зубной техник</option>
                                <option value="admin">Администратор</option>
                            </select>
                        </div>
                    )}

                    <div className="input-group" style={{ marginBottom: '0' }}>
                        <label className="input-label">Телефон (+998...)</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="+99899..."
                            value={emailOrPhone}
                            onChange={(e) => setEmailOrPhone(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <label className="input-label">Пароль</label>
                        <input
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={loading}
                    >
                        {loading ? (isLogin ? 'Вход...' : 'Регистрация...') : (isLogin ? 'Войти' : 'Зарегистрироваться')}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button
                            type="button"
                            className="btn btn-outline w-full"
                            style={{ border: 'none', color: 'var(--text-muted)' }}
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                                setSuccessMsg('');
                            }}
                        >
                            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
