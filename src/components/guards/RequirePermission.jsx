import { Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import EmptyState from '../ui/EmptyState'

/** Route guard: renders children only if the user has `feature`. */
export default function RequirePermission({ feature, children }) {
  const { can } = useAuth()
  if (can(feature)) return children
  return (
    <EmptyState icon={Lock} title="This module isn't on your access list">
      Ask your account owner to grant access, or upgrade the plan that includes it.
    </EmptyState>
  )
}
