import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import ErrorBoundary from './components/ErrorBoundary'

// ─── Lazy-loaded pages (code splitting per route) ─────────────────────────────
const LoginPage             = lazy(() => import('./pages/LoginPage'))
const DashboardPage         = lazy(() => import('./pages/DashboardPage'))
const ContactsPage          = lazy(() => import('./pages/ContactsPage'))
const AddContactPage        = lazy(() => import('./pages/AddContactPage'))
const ContactDetailPage     = lazy(() => import('./pages/ContactDetailPage'))
const EditContactPage       = lazy(() => import('./pages/EditContactPage'))
const RetirementPlannerPage = lazy(() => import('./pages/RetirementPlannerPage'))
const ProtectionPlannerPage = lazy(() => import('./pages/ProtectionPlannerPage'))
const SettingsPage          = lazy(() => import('./pages/SettingsPage'))
const AdminPage             = lazy(() => import('./pages/AdminPage'))
const KnowledgeLibraryPage      = lazy(() => import('./pages/KnowledgeLibraryPage'))
const MedicalUnderwritingPage   = lazy(() => import('./pages/MedicalUnderwritingPage'))
const NotFoundPage              = lazy(() => import('./pages/NotFoundPage'))

// ─── Full-screen loading fallback ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 200,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '3px solid #E5E5EA',
        borderTopColor: '#2E96FF',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Admin-only guard ─────────────────────────────────────────────────────────
function AdminRoute({ children }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { agent } = useAuth()

  if (!agent) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <AppShell>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/new" element={<AddContactPage />} />
            <Route path="/contacts/:id" element={<ContactDetailPage />} />
            <Route path="/contacts/:id/edit" element={<EditContactPage />} />
            <Route path="/contacts/:id/retirement" element={
              <ErrorBoundary><RetirementPlannerPage /></ErrorBoundary>
            } />
            <Route path="/contacts/:id/protection" element={
              <ErrorBoundary><ProtectionPlannerPage /></ErrorBoundary>
            } />
            <Route path="/library" element={<KnowledgeLibraryPage />} />
            <Route path="/underwriting" element={
              <AdminRoute><MedicalUnderwritingPage /></AdminRoute>
            } />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={
              <AdminRoute><AdminPage /></AdminRoute>
            } />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  )
}
