import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';

export default function Settings() {
    const { t, i18n } = useTranslation();
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [language, setLanguage] = useState(i18n.language);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        i18n.changeLanguage(newLang);
        localStorage.setItem('appLanguage', newLang);
    };

    return (
        <Layout>
        <div className="card animate-fade-in" style={{ padding: '2rem' }}>
            <h1 style={{ marginBottom: '2rem', marginTop: 0, fontSize: '1.75rem' }}>{t('settings.title')}</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '600px' }}>

                {/* ПРОФИЛЬ */}
                <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>{t('settings.profile')}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('patients.name')}:</span>
                        <strong style={{ color: 'var(--text-main)' }}>{storedUser.name}</strong>

                        <span style={{ color: 'var(--text-muted)' }}>{t('patients.phone')}:</span>
                        <strong style={{ color: 'var(--text-main)' }}>{storedUser.phone}</strong>

                        <span style={{ color: 'var(--text-muted)' }}>{t('settings.role')}:</span>
                        <strong style={{ color: 'var(--text-main)' }}>{t(`roles.${storedUser.role}`) || storedUser.role}</strong>
                    </div>
                </div>

                {/* ЯЗЫК */}
                <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>{t('settings.language')}</h2>
                    <select
                        className="input-field"
                        value={language}
                        onChange={handleLanguageChange}
                        style={{ width: '100%' }}
                    >
                        <option value="ru">Русский (RU)</option>
                        <option value="en">English (EN)</option>
                        <option value="uz">O'zbekcha (UZ)</option>
                    </select>
                </div>

                {/* ТЕМА */}
                <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>{t('settings.theme')}</h2>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setTheme('light')}
                        >
                            ☀️ {t('settings.themes.light')}
                        </button>
                        <button
                            className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setTheme('dark')}
                        >
                            🌙 {t('settings.themes.dark')}
                        </button>
                        <button
                            className={`btn ${theme === 'custom' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setTheme('custom')}
                            style={theme === 'custom' ? { background: '#10b981', borderColor: '#10b981' } : {}}
                        >
                            🌿 {t('settings.themes.custom')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
        </Layout>
    );
}
