import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ContactsPage from './pages/ContactsPage'
import ContactDetailPage from './pages/ContactDetailPage'
import RetirementPlannerPage from './pages/RetirementPlannerPage'
import ProtectionPlannerPage from './pages/ProtectionPlannerPage'

function ProtectedRoute({ children }) {
  const { agent } = useAuth()
  if (!agent) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { agent } = useAuth()

  if (!agent) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/contacts/:id/retirement" element={<RetirementPlannerPage />} />
        <Route path="/contacts/:id/protection" element={<ProtectionPlannerPage />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  )
}
