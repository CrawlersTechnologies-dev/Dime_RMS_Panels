import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/** Sends signed-out users to /login and users of other roles to their own panel. */
export default function RequireRole({ roles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={user.home} replace />
  return children
}
