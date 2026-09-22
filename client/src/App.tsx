import React, { useState } from 'react';
import { DemoSwitcher } from './components/DemoSwitcher';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { SmartAiChatWidget } from './components/SmartAiChatWidget';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import { AdminDashboard } from './pages/AdminDashboard';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { CategoryManagementPage } from './pages/CategoryManagementPage';
import { ComplaintDetailsPage } from './pages/ComplaintDetailsPage';
import { CreateComplaintPage } from './pages/CreateComplaintPage';
import { DepartmentManagementPage } from './pages/DepartmentManagementPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SettingsPage } from './pages/SettingsPage';
import { StaffDashboard } from './pages/StaffDashboard';
import { StaffManagementPage } from './pages/StaffManagementPage';
import { TrackPublicPage } from './pages/TrackPublicPage';
import { UserDashboard } from './pages/UserDashboard';
import { UserManagementPage } from './pages/UserManagementPage';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [pageParams, setPageParams] = useState<any>({});

  const handleNavigate = (page: string, params: any = {}) => {
    setCurrentPage(page);
    setPageParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-xs font-semibold">
        Initializing ResolvIQ Portal...
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <LandingPage onNavigate={handleNavigate} />;
      case 'login':
        return <LoginPage onNavigate={handleNavigate} />;
      case 'register':
        return <RegisterPage onNavigate={handleNavigate} />;
      case 'track':
        return (
          <TrackPublicPage
            initialComplaintNumber={pageParams.complaintNumber || ''}
            onNavigate={handleNavigate}
          />
        );
      case 'user-dashboard':
        return <UserDashboard onNavigate={handleNavigate} />;
      case 'staff-dashboard':
        return <StaffDashboard onNavigate={handleNavigate} />;
      case 'admin-dashboard':
        return <AdminDashboard onNavigate={handleNavigate} />;
      case 'create-complaint':
        return <CreateComplaintPage onNavigate={handleNavigate} />;
      case 'complaint-details':
        return (
          <ComplaintDetailsPage
            complaintId={pageParams.id || 1}
            onNavigate={handleNavigate}
          />
        );
      case 'user-management':
        return <UserManagementPage />;
      case 'staff-management':
        return <StaffManagementPage />;
      case 'category-management':
        return <CategoryManagementPage />;
      case 'department-management':
        return <DepartmentManagementPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'audit-logs':
        return <AuditLogPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  const isLandingOrAuth = ['home', 'login', 'register'].includes(currentPage);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white transition-colors">
      <Navbar onNavigate={handleNavigate} />

      <div className="flex-1 flex">
        {user && !isLandingOrAuth && (
          <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
        )}

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 ${isLandingOrAuth ? 'p-0 sm:p-0 lg:p-0' : ''}`}>
          {renderPage()}
        </main>
      </div>

      <DemoSwitcher />
      <SmartAiChatWidget onNavigate={handleNavigate} />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
