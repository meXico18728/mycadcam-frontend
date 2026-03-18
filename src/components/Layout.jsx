import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SyncStatus from './SyncStatus';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const touchStartX = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { label: t('sidebar.dashboard'), path: '/dashboard', icon: '📊', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.patients'), path: '/patients', icon: '👥', roles: ['admin', 'doctor'] },
        { label: t('sidebar.cases'), path: '/cases', icon: '📋', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.archive'), path: '/archive', icon: '🗂️', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.kanban'), path: '/kanban', icon: '🔲', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.prices'), path: '/prices', icon: '💲', roles: ['admin'] },
        { label: t('sidebar.finances'), path: '/finances', icon: '💰', roles: ['admin', 'accountant'] },
        { label: t('sidebar.users'), path: '/users', icon: '👤', roles: ['admin'] },
        { label: t('sidebar.settings'), path: '/settings', icon: '⚙️', roles: ['admin', 'doctor', 'tech', 'accountant'] },
    ];

    // Свайп вправо — открыть, влево — закрыть
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        if (touchStartX.current === null) return;
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (diff > 60 && touchStartX.current < 40) setDrawerOpen(true);
        if (diff < -60) setDrawerOpen(false);
        touchStartX.current = null;
    };

    // Закрывать шторку при переходе на страницу
    const handleNav = (path) => {
        navigate(path);
        setDrawerOpen(false);
    };

    // Блокировать скролл body когда шторка открыта
    useEffect(() => {
        document.body.style.overflow = drawerOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [drawerOpen]);

    return (
        <div
            className="app-layout"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <header className="app-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button className="burger-btn" onClick={() => setDrawerOpen(true)} aria-label="Меню">
                        <span /><span /><span />
                    </button>
                    <h2 style={{ margin: 0 }}>MyCadCam <span style={{ fontWeight: 400, opacity: 0.8 }}>| Lab</span></h2>
                    <span className="role-badge">/ {t(`roles.${user?.role}`) || user?.role}</span>
                </div>
                <div className="flex gap-4 items-center">
                    <SyncStatus />
                    <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{user?.name}</span>
                    <button
                        className="btn btn-secondary"
                        onClick={handleLogout}
                        style={{ padding: '0.4rem 1rem', borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                    >
                        {t('sidebar.logout')}
                    </button>
                </div>
            </header>

            {/* Оверлей */}
            <div
                className={`drawer-overlay ${drawerOpen ? 'open' : ''}`}
                onClick={() => setDrawerOpen(false)}
            />

            {/* Шторка */}
            <aside className={`drawer ${drawerOpen ? 'open' : ''}`}>
                <div className="drawer-header">
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>MyCadCam Lab</span>
                    <button className="drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
                </div>
                <div style={{ padding: '0 1.5rem', marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {t('sidebar.nav')}
                </div>
                <nav className="nav-menu">
                    {menuItems.filter(item => item.roles.includes(user?.role)).map(item => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <button
                                key={item.path}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                                onClick={() => handleNav(item.path)}
                            >
                                <span style={{ marginRight: '0.6rem', fontSize: '1rem' }}>{item.icon}</span>
                                {item.label}
                            </button>
                        );
                    })}
                </nav>
                <div className="drawer-footer">
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user?.name}</span>
                    <button className="btn btn-secondary" onClick={handleLogout} style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
                        {t('sidebar.logout')}
                    </button>
                </div>
            </aside>

            <main className="app-main">
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
