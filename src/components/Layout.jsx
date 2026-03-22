import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SyncStatus from './SyncStatus';

// Haptic feedback helper
async function haptic(style = 'LIGHT') {
    try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        await Haptics.impact({ style: ImpactStyle[style] });
    } catch {}
}

// Hardware back button (Android)
async function setupBackButton(navigate, location) {
    try {
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', ({ canGoBack }) => {
            if (location.pathname === '/dashboard') {
                App.exitApp();
            } else {
                navigate(-1);
            }
        });
        return () => App.removeAllListeners();
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

    // Hardware back button
    useEffect(() => {
        let cleanup = () => {};
        setupBackButton(navigate, location).then(fn => { cleanup = fn; });
        return () => cleanup();
    }, [navigate, location.pathname]);

    // Close side menu on route change
    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    // Block body scroll when menu open
    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    const handleLogout = async () => {
        await haptic('MEDIUM');
        logout();
        navigate('/login');
    };

    // Bottom tabs — shown for all roles, filtered by role
    const allTabs = [
        { label: t('sidebar.dashboard'), path: '/dashboard', icon: '📊', roles: ['admin', 'doctor', 'tech', 'accountant'] },
        { label: t('sidebar.cases'), path: '/cases', icon: '📋', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.kanban'), path: '/kanban', icon: '🔲', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.crm'), path: '/crm', icon: '🦷', roles: ['admin', 'doctor', 'accountant'] },
        { label: 'Ещё', path: '__more__', icon: '☰', roles: ['admin', 'doctor', 'tech', 'accountant'] },
    ];

    // Full menu items (for the slide-up "more" sheet)
    const allMenuItems = [
        { label: t('sidebar.dashboard'), path: '/dashboard', icon: '📊', roles: ['admin', 'doctor', 'tech', 'accountant'] },
        { label: t('sidebar.patients'), path: '/patients', icon: '👥', roles: ['admin', 'doctor'] },
        { label: t('sidebar.cases'), path: '/cases', icon: '📋', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.archive'), path: '/archive', icon: '🗂️', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.kanban'), path: '/kanban', icon: '🔲', roles: ['admin', 'doctor', 'tech'] },
        { label: t('sidebar.crm'), path: '/crm', icon: '🦷', roles: ['admin', 'doctor', 'accountant'] },
        { label: t('sidebar.finances'), path: '/finances', icon: '💰', roles: ['admin', 'accountant'] },
        { label: t('sidebar.prices'), path: '/prices', icon: '💲', roles: ['admin'] },
        { label: t('sidebar.users'), path: '/users', icon: '👤', roles: ['admin'] },
        { label: t('sidebar.settings'), path: '/settings', icon: '⚙️', roles: ['admin', 'doctor', 'tech', 'accountant'] },
    ];

    const visibleTabs = allTabs.filter(t => t.roles.includes(user?.role));
    const visibleMenu = allMenuItems.filter(item => item.roles.includes(user?.role));

    const handleTabPress = async (tab) => {
        await haptic('LIGHT');
        if (tab.path === '__more__') {
            setMenuOpen(true);
        } else {
            navigate(tab.path);
        }
    };

    const handleMenuNav = async (path) => {
        await haptic('LIGHT');
        setMenuOpen(false);
        navigate(path);
    };

    const isActive = (path) => path !== '__more__' && location.pathname.startsWith(path);

    return (
        <div className="android-layout">
            {/* Top header */}
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

            {/* Main scrollable content */}
            <main className="android-main">
                <div className="android-content">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation Bar */}
            <nav className="android-bottom-nav">
                {visibleTabs.map(tab => {
                    const active = isActive(tab.path);
                    return (
                        <button
                            key={tab.path}
                            className={`android-tab ${active ? 'active' : ''}`}
                            onClick={() => handleTabPress(tab)}
                            aria-label={tab.label}
                        >
                            <span className="android-tab-icon">{tab.icon}</span>
                            <span className="android-tab-label">{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Sheet — "More" menu */}
            {menuOpen && (
                <>
                    <div className="sheet-overlay" onClick={() => setMenuOpen(false)} />
                    <div className="sheet">
                        {/* Handle bar */}
                        <div className="sheet-handle" />

                        {/* User info */}
                        <div className="sheet-user">
                            <div className="sheet-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
                            <div>
                                <div className="sheet-user-name">{user?.name}</div>
                                <div className="sheet-user-role">{t(`roles.${user?.role}`) || user?.role}</div>
                            </div>
                        </div>

                        {/* Nav items */}
                        <div className="sheet-menu">
                            {visibleMenu.map(item => (
                                <button
                                    key={item.path}
                                    className={`sheet-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
                                    onClick={() => handleMenuNav(item.path)}
                                >
                                    <span className="sheet-item-icon">{item.icon}</span>
                                    <span className="sheet-item-label">{item.label}</span>
                                    {location.pathname.startsWith(item.path) && (
                                        <span className="sheet-item-check">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Logout */}
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
