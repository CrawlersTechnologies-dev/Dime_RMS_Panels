import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { PlatformProvider } from './context/PlatformContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import RequireRole from './components/guards/RequireRole'
import { ROLES } from './config/permissions'
import Login from './pages/Login'
import Register from './pages/Register'
import SalesSignup from './pages/SalesSignup'
import AdminPanel from './panels/admin/AdminPanel'
import OwnerPanel from './panels/owner/OwnerPanel'
import SalesPanel from './panels/sales/SalesPanel'
import PosPanel from './panels/pos/PosPanel'

// Hash routing only for the single-file preview build (see .env.preview).
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

/**
 * One app, one panel per role. Each panel owns its routes under its prefix:
 *   /admin/*   Global Admin                      (built)
 *   /owner/*   Restaurant Owner, franchise, partner (built)
 *   /sales/*   Sales Person                      (built)
 *   /pos/*     Manager / Biller                  (built)
 */
export default function App() {
  return (
    <PlatformProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/join" element={<SalesSignup />} />
              <Route path="/admin/*" element={<RequireRole roles={[ROLES.GLOBAL_ADMIN]}><AdminPanel /></RequireRole>} />
              <Route path="/owner/*" element={<RequireRole roles={[ROLES.OWNER_ADMIN, ROLES.OWNER_PARTNER]}><OwnerPanel /></RequireRole>} />
              <Route path="/sales/*" element={<RequireRole roles={[ROLES.SALES_PERSON]}><SalesPanel /></RequireRole>} />
              <Route path="/pos/*" element={<RequireRole roles={[ROLES.RMS_STAFF]}><PosPanel /></RequireRole>} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </PlatformProvider>
  )
}

function Home() {
  const { user } = useAuth()
  return <Navigate to={user ? user.home : '/login'} replace />
}
