import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SyncStatus from './SyncStatus';

async function haptic() {
    try {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.impact({ style: 'LIGHT' });
    } catch {}
}

async function setupBackButton(navigate, pathname) {
    try {
        const { App } = await import('@capacitor/app');
        const handle = App.addListener('backButton', () => {
            if (pathname === '/dashboard') App.exitApp();
            else navigate(-1);
        });
        return () => handle.then(h => h.remove()).catch(() => {});
    } catch {
        return () => {};
    }
}

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        let cleanup = () => {};
        setupBackButton(navigate, location.pathname).then(fn => { cleanup = fn; });
        return () => cleanup();
    }, [navigate, location.pathname]);

    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    const handleLogout = async () => {
        await haptic();
        logout();
        navigate('/login');
    };

    const allTabs = [
        { label: t('sidebar.dashboard'), path: '/dashboard', icon: '📊', roles: ['admin', 'doctor', 'tech', 'accountant'] },
        { label: t('sidebar.cases'),     path: '/cases',     icon: '📋', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.kanban'),    path: '/kanban',    icon: '🔲', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.crm'),       path: '/crm',       icon: '🦷', roles: ['admin', 'doctor', 'accountant'] },
        { label: 'Ещё',                  path: '__more__',   icon: '☰',  roles: ['admin', 'doctor', 'tech', 'accountant'] },
    ];

    const allMenuItems = [
        { label: t('sidebar.dashboard'), path: '/dashboard', icon: '📊', roles: ['admin', 'doctor', 'tech', 'accountant'] },
        { label: t('sidebar.patients'),  path: '/patients',  icon: '👥', roles: ['admin', 'doctor'] },
        { label: t('sidebar.cases'),     path: '/cases',     icon: '📋', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.archive'),   path: '/archive',   icon: '🗂️', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.kanban'),    path: '/kanban',    icon: '🔲', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.crm'),       path: '/crm',       icon: '🦷', roles: ['admin', 'doctor', 'accountant'] },
        { label: t('sidebar.finances'),  path: '/finances',  icon: '💰', roles: ['admin', 'accountant'] },
        { label: t('sidebar.prices'),    path: '/prices',    icon: '💲', roles: ['admin'] },
        { label: t('sidebar.users'),     path: '/users',     icon: '👤', roles: ['admin'] },
        { label: t('sidebar.settings'),  path: '/settings',  icon: '⚙️', roles: ['admin', 'doctor', 'tech', 'accountant'] },
    ];

    const visibleTabs = allTabs.filter(tab => tab.roles.includes(user?.role));
    const visibleMenu = allMenuItems.filter(item => item.roles.includes(user?.role));
    const isActive = (path) => path !== '__more__' && location.pathname.startsWith(path);

    const handleTab = async (tab) => {
        await haptic();
        if (tab.path === '__more__') setMenuOpen(true);
        else navigate(tab.path);
    };

    const handleMenuNav = async (path) => {
        await haptic();
        setMenuOpen(false);
        navigate(path);
    };

    return (
        <div className="android-layout">
            <header className="android-header">
                <div className="android-header-inner">
                    <h2 className="android-header-title">
                        MyCadCam <span className="android-header-sub">Lab</span>
                    </h2>
                    <div className="android-header-right">
                        <SyncStatus />
                    </div>
                </div>
            </header>

            <main className="android-main">
                <div className="android-content">{children}</div>
            </main>

            <nav className="android-bottom-nav">
                {visibleTabs.map(tab => (
                    <button
                        key={tab.path}
                        className={`android-tab ${isActive(tab.path) ? 'active' : ''}`}
                        onClick={() => handleTab(tab)}
                        aria-label={tab.label}
                    >
                        <span className="android-tab-icon">{tab.icon}</span>
                        <span className="android-tab-label">{tab.label}</span>
                    </button>
                ))}
            </nav>

            {menuOpen && (
                <>
                    <div className="sheet-overlay" onClick={() => setMenuOpen(false)} />
                    <div className="sheet">
                        <div className="sheet-handle" />
                        <div className="sheet-user">
                            <div className="sheet-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
                            <div>
                                <div className="sheet-user-name">{user?.name}</div>
                                <div className="sheet-user-role">{t(`roles.${user?.role}`) || user?.role}</div>
                            </div>
                        </div>
                        <div className="sheet-menu">
                            {visibleMenu.map(item => (
                                <button
                                    key={item.path}
                                    className={`sheet-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                                    onClick={() => handleMenuNav(item.path)}
                                >
                                    <span className="sheet-item-icon">{item.icon}</span>
                                    <span className="sheet-item-label">{item.label}</span>
                                    {location.pathname.startsWith(item.path) && <span className="sheet-item-check">✓</span>}
                                </button>
                            ))}
                        </div>
                        <div className="sheet-footer">
                            <button className="sheet-logout" onClick={handleLogout}>
                                🚪 {t('sidebar.logout')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Layout;
