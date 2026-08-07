import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './store/app'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Loader2 } from 'lucide-react'
import { BrandMark } from './components/Brand'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Cars = lazy(() => import('./pages/Cars'))
const CarForm = lazy(() => import('./pages/CarForm'))
const CarDetail = lazy(() => import('./pages/CarDetail'))
const Scan = lazy(() => import('./pages/Scan'))
const Sell = lazy(() => import('./pages/Sell'))
const Contracts = lazy(() => import('./pages/Contracts'))
const ContractView = lazy(() => import('./pages/ContractView'))
const Customers = lazy(() => import('./pages/Customers'))
const Accounting = lazy(() => import('./pages/Accounting'))
const Reports = lazy(() => import('./pages/Reports'))
const Debts = lazy(() => import('./pages/Debts'))
const Partners = lazy(() => import('./pages/Partners'))
const Exchangers = lazy(() => import('./pages/Exchangers'))
const Hawalas = lazy(() => import('./pages/Hawalas'))
const Security = lazy(() => import('./pages/Security'))
const Users = lazy(() => import('./pages/Users'))
const Audit = lazy(() => import('./pages/Audit'))
const SettingsPage = lazy(() => import('./pages/Settings'))

function Splash({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <BrandMark size={64} className="animate-pulseSoft" />
        <p className="text-muted text-sm flex items-center gap-2">
          <Loader2 size={15} className="animate-spin" /> {msg}
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const { ready, mode, user, authChecked, init } = useApp()

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ready || !authChecked) return <Splash msg="کردنەوەی سیستەم..." />
  if (mode === 'cloud' && !user) return <Login />

  return (
    <Suspense fallback={<Splash msg="بارکردن..." />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/cars/new" element={<CarForm />} />
          <Route path="/cars/:id" element={<CarDetail />} />
          <Route path="/cars/:id/edit" element={<CarForm />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/sell/:carId" element={<Sell />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/contracts/:id" element={<ContractView />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/exchangers" element={<Exchangers />} />
          <Route path="/hawalas" element={<Hawalas />} />
          <Route path="/security" element={<Security />} />
          <Route path="/users" element={<Users />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
