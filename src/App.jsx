// src/App.jsx — Root Application with router, layout shell, and profile gating
// Handles navigation between Dashboard, History, Add, Insights, Settings, Onboarding, Profiles,
// Recurring Expenses, Category Management, and Budget Management.

import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import AppBar from './components/layout/AppBar';
import BottomNav from './components/layout/BottomNav';
import PageShell from './components/layout/PageShell';
import Dashboard from './screens/Dashboard';
import AddTransaction from './screens/AddTransaction';
import TransactionHistory from './screens/TransactionHistory';
import SpendingInsights from './screens/SpendingInsights';
import Settings from './screens/Settings';
import Onboarding from './screens/Onboarding';
import ProfileSelect from './screens/ProfileSelect';
import RecurringExpenses from './screens/RecurringExpenses';
import CategoryManagement from './screens/CategoryManagement';
import BudgetManagement from './screens/BudgetManagement';
import { useProfile } from './contexts/ProfileContext';
import { db } from './db/db';

// Route title mapping for the top AppBar
const ROUTE_TITLES = {
  '/': 'Dashboard',
  '/history': 'Transaction History',
  '/insights': 'Spending Insights',
  '/settings': 'App Settings',
  '/add': 'Add Expense',
  '/recurring': 'Recurring Expenses',
  '/categories': 'Category Management',
  '/budgets': 'Budget Management',
};

// Main layout wrapper — keyed on activeProfileId to ensure complete state isolation on profile switch
const AppLayout = ({ children, isStack = false }) => {
  const location = useLocation();
  const { activeProfileId } = useProfile();
  const title = ROUTE_TITLES[location.pathname] || 'Expensify';

  return (
    <div key={activeProfileId} className="flex flex-col min-h-screen bg-background text-on-surface antialiased">
      <AppBar title={title} variant={isStack ? 'stack' : 'tab'} />
      <PageShell>{children}</PageShell>
      {!isStack && <BottomNav />}
    </div>
  );
};

// Guard component that enforces profile existence, active selection, and PIN access gates
const ProfileGuard = ({ children }) => {
  const { activeProfileId, setActiveProfileId, isProfileUnlocked } = useProfile();
  const profiles = useLiveQuery(() => db.profiles.toArray(), []);

  // Loading state while IndexedDB initializes
  if (profiles === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <span className="material-symbols-outlined text-[36px] animate-spin">sync</span>
      </div>
    );
  }

  // 1. If no profiles exist at all → force Onboarding
  if (profiles.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  // 2. If profiles exist but none active → auto-select first ONLY if unprotected
  if (!activeProfileId || !profiles.some((p) => p.id === activeProfileId)) {
    if (profiles.length === 1 && !profiles[0].pinHash) {
      setActiveProfileId(profiles[0].id);
      return children;
    }
    return <Navigate to="/profiles" replace />;
  }

  // 3. Find active profile and verify PIN lock status
  const currentProfile = profiles.find((p) => p.id === activeProfileId);
  if (currentProfile?.pinHash && !isProfileUnlocked(currentProfile)) {
    // Protected profile requires entering PIN in this session
    return <Navigate to="/profiles" replace />;
  }

  return children;
};

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Onboarding Screen (No layout chrome) */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Profile Switcher Screen */}
        <Route path="/profiles" element={<ProfileSelect />} />

        {/* Core Tab Routes (Wrapped with AppBar + BottomNav) */}
        <Route
          path="/"
          element={
            <ProfileGuard>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProfileGuard>
          }
        />
        <Route
          path="/history"
          element={
            <ProfileGuard>
              <AppLayout>
                <TransactionHistory />
              </AppLayout>
            </ProfileGuard>
          }
        />
        <Route
          path="/insights"
          element={
            <ProfileGuard>
              <AppLayout>
                <SpendingInsights />
              </AppLayout>
            </ProfileGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <ProfileGuard>
              <AppLayout>
                <Settings />
              </AppLayout>
            </ProfileGuard>
          }
        />

        {/* Add Transaction Route (Stack variant with back button, no bottom nav) */}
        <Route
          path="/add"
          element={
            <ProfileGuard>
              <AppLayout isStack>
                <AddTransaction />
              </AppLayout>
            </ProfileGuard>
          }
        />

        {/* Phase 2 Feature Routes (Stack variants with back button) */}
        <Route
          path="/recurring"
          element={
            <ProfileGuard>
              <AppLayout isStack>
                <RecurringExpenses />
              </AppLayout>
            </ProfileGuard>
          }
        />
        <Route
          path="/categories"
          element={
            <ProfileGuard>
              <AppLayout isStack>
                <CategoryManagement />
              </AppLayout>
            </ProfileGuard>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProfileGuard>
              <AppLayout isStack>
                <BudgetManagement />
              </AppLayout>
            </ProfileGuard>
          }
        />

        {/* Fallback to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
