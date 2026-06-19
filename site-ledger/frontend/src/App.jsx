import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SitesPage from './pages/SitesPage';
import SiteDetailPage from './pages/SiteDetailPage';
import LedgerPage from './pages/LedgerPage';
import MaterialsPage from './pages/MaterialsPage';
import LabourPage from './pages/LabourPage';
import MachineryPage from './pages/MachineryPage';
import TransportPage from './pages/TransportPage';
import ExpensesPage from './pages/ExpensesPage';
import BalancePage from './pages/BalancePage';
import AdvancesPage from './pages/AdvancesPage';
import PaymentsPage from './pages/PaymentsPage';
import DocumentsPage from './pages/DocumentsPage';
import UsersPage from './pages/UsersPage';
import YojnasPage from './pages/YojnasPage';
import YojnaDetailPage from './pages/YojnaDetailPage';
import VerificationQueuePage from './pages/VerificationQueuePage';
import VoiceEntryPage from './pages/VoiceEntryPage';
import CorrectionPage from './pages/CorrectionPage';

import StaffDashboard from './pages/StaffDashboard';
import MaterialShiftingPage from './pages/MaterialShiftingPage';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to sites (most common accessible page for all roles)
    return <Navigate to="/sites" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/sites" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN']}><DashboardPage /></ProtectedRoute>} />
      <Route path="/my-sites" element={<ProtectedRoute allowedRoles={['SITE_INCHARGE', 'MUNSHI', 'MATE']}><StaffDashboard /></ProtectedRoute>} />
      
      {/* Yojna Routes */}
      <Route path="/yojnas" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><YojnasPage /></ProtectedRoute>} />
      <Route path="/yojnas/:id" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><YojnaDetailPage /></ProtectedRoute>} />
      
      {/* Site Routes */}
      <Route path="/sites" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><SitesPage /></ProtectedRoute>} />
      <Route path="/sites/:id" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><SiteDetailPage /></ProtectedRoute>} />
      
      {/* Other Routes */}
      <Route path="/ledger" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN']}><LedgerPage /></ProtectedRoute>} />
      <Route path="/materials" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><MaterialsPage /></ProtectedRoute>} />
      <Route path="/material-shifting" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><MaterialShiftingPage /></ProtectedRoute>} />
      <Route path="/labour" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><LabourPage /></ProtectedRoute>} />
      <Route path="/machinery" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><MachineryPage /></ProtectedRoute>} />
      <Route path="/transport" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><TransportPage /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><ExpensesPage /></ProtectedRoute>} />
      <Route path="/my-balance" element={<ProtectedRoute allowedRoles={['SITE_INCHARGE', 'MUNSHI', 'MATE']}><BalancePage /></ProtectedRoute>} />
      <Route path="/advances" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN']}><AdvancesPage /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN']}><PaymentsPage /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><DocumentsPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute allowedRoles={['OWNER']}><UsersPage /></ProtectedRoute>} />
      <Route path="/verification" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN']}><VerificationQueuePage /></ProtectedRoute>} />
      <Route path="/corrections" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN']}><CorrectionPage /></ProtectedRoute>} />
      <Route path="/voice-entry" element={<ProtectedRoute allowedRoles={['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'MATE']}><VoiceEntryPage /></ProtectedRoute>} />
      
      
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
