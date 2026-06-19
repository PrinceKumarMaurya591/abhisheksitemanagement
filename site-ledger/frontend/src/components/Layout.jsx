import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['OWNER', 'OFFICE_ADMIN'] },
  { name: 'My Sites', href: '/my-sites', icon: '🏗️', roles: ['SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'Nikay / Yojna', href: '/yojnas', icon: '📋', roles: ['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'Sites', href: '/sites', icon: '🏗️', roles: ['OWNER', 'OFFICE_ADMIN'] },
  { name: 'Ledger', href: '/ledger', icon: '📒', roles: ['OWNER', 'OFFICE_ADMIN'] },
  { name: 'Materials', href: '/materials', icon: '📦', roles: ['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'Labour', href: '/labour', icon: '👷', roles: ['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'Material Shift', href: '/material-shifting', icon: '🚛', roles: ['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'Machinery', href: '/machinery', icon: '🚜', roles: ['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'Transport', href: '/transport', icon: '🚛', roles: ['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'Expenses', href: '/expenses', icon: '💸', roles: ['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'My Balance', href: '/my-balance', icon: '📊', roles: ['SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'Advances', href: '/advances', icon: '💰', roles: ['OWNER', 'OFFICE_ADMIN'] },
  { name: 'Payments', href: '/payments', icon: '💳', roles: ['OWNER', 'OFFICE_ADMIN'] },
  { name: 'Documents', href: '/documents', icon: '📄', roles: ['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'Voice Entry', href: '/voice-entry', icon: '🎤', roles: ['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE'] },
  { name: 'Verify', href: '/verification', icon: '✅', roles: ['OWNER', 'OFFICE_ADMIN'] },
  { name: 'Users', href: '/users', icon: '👥', roles: ['OWNER'] },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Android back button handler — go back in-app instead of exiting
  useEffect(() => {
    const handler = () => {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/dashboard');
      }
    };
    // Listen for popstate (browser back) and Capacitor back
    window.addEventListener('popstate', handler);
    // Capacitor back button listener
    if (window.Capacitor?.Platform?.isNativePlatform()) {
      import('@capacitor/core').then(({ App }) => {
        App.addListener('backButton', () => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/dashboard');
          }
        });
      }).catch(() => {});
    }
    return () => window.removeEventListener('popstate', handler);
  }, [navigate]);

  const canGoBack = window.history.length > 1;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-indigo-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button onClick={() => navigate(-1)} className="text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <Link to="/dashboard" className="font-bold text-lg hover:text-indigo-200">Site Ledger</Link>
        <button onClick={handleLogout} className="text-white text-sm">Logout</button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-20 w-64 bg-indigo-800 transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-700">
          <span className="text-white text-xl font-bold">Site Ledger</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-indigo-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-4 px-3 space-y-1 flex-1 overflow-y-auto">
          {navigation.filter(item => item.roles.includes(user?.role)).map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-200 hover:bg-indigo-700 hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User info & Logout */}
        <div className="border-t border-indigo-700 px-3 py-3">
          <div className="text-indigo-200 text-sm mb-2 px-3">
            <div className="font-medium text-white truncate">{user?.fullName || user?.username}</div>
            <div className="text-indigo-300 text-xs truncate">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-600 hover:text-white transition-colors"
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-10 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
