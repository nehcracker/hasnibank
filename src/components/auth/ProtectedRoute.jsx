import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function ProtectedRoute({ children, requiredRole }) {
  const { session, role, loading } = useAuth()

  if (loading) return <div className="auth-loading" aria-busy="true" />

  if (!session) return <Navigate to="/login" replace />

  if (requiredRole === 'staff' && role !== 'staff') return <Navigate to="/dashboard" replace />
  if (requiredRole === 'borrower' && role !== 'borrower') return <Navigate to="/admin" replace />

  return children
}
