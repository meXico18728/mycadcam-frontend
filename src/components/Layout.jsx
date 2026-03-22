import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SyncStatus from './SyncStatus';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [collapsed, setCollapsed] = useState(false);

    // Persist sidebar state
    useEffect(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        if (saved === 'true') setCollapsed(true);
    }, []);
    const toggleSidebar = () => {
        setCollapsed(c => {
            localStorage.setItem('sidebar_collapsed', String(!c));
            return !c;
        });
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const menuItems = [
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

    const visible = menuItems.filter(item => item.roles.includes(user?.role));

    return (
        <div className={`desktop-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
            {/* ── Sidebar ── */}
            <aside className="desktop-sidebar">
                {/* Logo */}
                <div className="sidebar-logo">
                    <span className="sidebar-logo-icon">🦷</span>
                    {!collapsed && (
                        <div className="sidebar-logo-text">
                            <span className="sidebar-logo-name">MyCadCam</span>
                            <span className="sidebar-logo-sub">Lab</span>
                        </div>
                    )}
                    <button className="sidebar-toggle" onClick={toggleSidebar} title={collapsed ? 'Развернуть' : 'Свернуть'}>
                        {collapsed ? '›' : '‹'}
                    </button>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    {!collapsed && (
                        <div className="sidebar-section-label">{t('sidebar.nav')}</div>
                    )}
                    {visible.map(item => {
                        const active = location.pathname.startsWith(item.path);
                        return (
                            <button
                                key={item.path}
                                className={`sidebar-item ${active ? 'active' : ''}`}
                                onClick={() => navigate(item.path)}
                                title={collapsed ? item.label : ''}
                            >
                                <span className="sidebar-item-icon">{item.icon}</span>
                                {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                                {active && !collapsed && <span className="sidebar-item-dot" />}
                            </button>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div className="sidebar-footer">
                    {!collapsed ? (
                        <>
                            <div className="sidebar-user">
                                <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
                                <div className="sidebar-user-info">
                                    <div className="sidebar-user-name">{user?.name}</div>
                                    <div className="sidebar-user-role">{t(`roles.${user?.role}`) || user?.role}</div>
                                </div>
                            </div>
                            <button className="sidebar-logout" onClick={handleLogout}>
                                🚪 {t('sidebar.logout')}
                            </button>
                        </>
                    ) : (
                        <button className="sidebar-item" onClick={handleLogout} title={t('sidebar.logout')}>
                            <span className="sidebar-item-icon">🚪</span>
                        </button>
                    )}
                </div>
            </aside>

            {/* ── Main area ── */}
            <div className="desktop-main-wrap">
                {/* Topbar */}
                <header className="desktop-topbar">
                    <div className="topbar-left">
                        <h2 className="topbar-title">
                            {visible.find(i => location.pathname.startsWith(i.path))?.label || 'MyCadCam'}
                        </h2>
                    </div>
                    <div className="topbar-right">
                        <SyncStatus />
                        <div className="topbar-user">
                            <div className="topbar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
                            <span className="topbar-username">{user?.name}</span>
                            <span className="topbar-role-badge">{t(`roles.${user?.role}`) || user?.role}</span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="desktop-content">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
