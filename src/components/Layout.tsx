import { useState } from 'react'
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Car, FileText, Wallet, Users, ShieldCheck, Settings as Cog,
  ScanLine, MoreHorizontal, LogOut, Sun, Moon, UserCog, History, CloudOff, Cloud, Handshake, NotebookPen, ArrowLeftRight, Send, X, BarChart3,
} from 'lucide-react'
import { useApp } from '../store/app'
import { Toasts } from './ui'
import { ShowroomMark } from './Brand'
import { Portal } from './Portal'
import dloLogo from '../assets/dlo-it-logo.png'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'داشبۆرد', end: true },
  { to: '/cars', icon: Car, label: 'ئۆتۆمبێلەکان' },
  { to: '/contracts', icon: FileText, label: 'عەقدەکان' },
  { to: '/accounting', icon: Wallet, label: 'حسابات', cap: 'money.view' as const },
  { to: '/reports', icon: BarChart3, label: 'راپۆرت و کەشف حساب', cap: 'money.view' as const },
  { to: '/debts', icon: NotebookPen, label: 'دەفتەری قەرز', cap: 'money.view' as const },
  { to: '/customers', icon: Users, label: 'کریارەکان' },
  { to: '/partners', icon: Handshake, label: 'شەریکەکان', cap: 'money.view' as const },
  { to: '/exchangers', icon: ArrowLeftRight, label: 'سندووقی سەراف', cap: 'money.view' as const },
  { to: '/hawalas', icon: Send, label: 'حەواڵەکان', cap: 'money.view' as const },
  { to: '/security', icon: ShieldCheck, label: 'ئاسایش' },
  { to: '/users', icon: UserCog, label: 'بەکارهێنەران', cap: 'users.manage' as const },
  { to: '/audit', icon: History, label: 'چالاکییەکان', cap: 'settings.edit' as const },
  { to: '/settings', icon: Cog, label: 'ڕێکخستن' },
]

const MOBILE_MAIN = ['/', '/cars', '/contracts']

export function Layout() {
  const { user, can, signOut, toast, drop, mode, settings } = useApp()
  const [more, setMore] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const [theme, setTheme] = useState(() => localStorage.getItem('gm.theme') || 'light')

  const flip = () => {
    const t = theme === 'dark' ? 'light' : 'dark'
    setTheme(t)
    localStorage.setItem('gm.theme', t)
    document.documentElement.className = 'theme-' + t
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#090D12' : '#F5F7FA')
  }

  const items = NAV.filter((n) => !n.cap || can(n.cap))
  const mobileItems = items.filter((n) => MOBILE_MAIN.includes(n.to))
  const restItems = items.filter((n) => !MOBILE_MAIN.includes(n.to))

  return (
    <div className="app-shell h-[100dvh] flex bg-bg overflow-hidden">
      {/* ============ لای دەسک‌تۆپ ============ */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-s border-line bg-surface/60 backdrop-blur h-full no-print">
        <div className="p-5 border-b border-line">
          <div className="flex items-center gap-3">
            <ShowroomMark logo={settings.logo} size={40} />
            <div className="min-w-0">
              <p className="font-bold truncate">{settings.showroomName}</p>
              <p className="text-[11px] text-muted flex items-center gap-1">
                {mode === 'cloud' ? <Cloud size={11} /> : <CloudOff size={11} />}
                {mode === 'cloud' ? 'هاوکاتکراو' : 'ناوخۆیی'}
              </p>
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto grow hide-scroll">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[15px] font-medium transition ${
                  isActive ? 'bg-brand/15 text-brand' : 'text-muted hover:text-ink hover:bg-surface2'
                }`
              }
            >
              <n.icon size={19} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-line space-y-1">
          <button onClick={() => nav('/scan')} className="btn-brand w-full">
            <ScanLine size={18} /> سکانی VIN
          </button>
          <div className="flex gap-1 pt-1">
            <button onClick={flip} className="btn-quiet flex-1 !py-2">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => signOut()} className="btn-quiet flex-1 !py-2">
              <LogOut size={16} />
            </button>
          </div>
          {user && (
            <p className="text-[11px] text-muted text-center pt-1 truncate">
              {user.name} · {user.email}
            </p>
          )}
        </div>
      </aside>

      {/* ============ ناوەڕۆک ============ */}
      <main className="grow min-w-0 h-full app-scroll pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="min-h-full flex flex-col">
          <div className="grow">
            <Outlet />
          </div>
          <DloPromo />
        </div>
      </main>

      {/* ============ ناڤی مۆبایل ============ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line no-print safe-b">
        <div className="grid grid-cols-5 items-end px-1">
          {mobileItems.slice(0, 2).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => tabCls(isActive)}>
              <n.icon size={21} />
              <span>{n.label}</span>
            </NavLink>
          ))}
          <button onClick={() => nav('/scan')} className="flex flex-col items-center -mt-6">
            <span className="w-14 h-14 rounded-2xl bg-brand text-brandInk grid place-items-center shadow-pop border-4 border-bg">
              <ScanLine size={24} />
            </span>
            <span className="text-[10px] mt-0.5 text-brand font-medium">سکان</span>
          </button>
          {mobileItems.slice(2, 3).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => tabCls(isActive)}>
              <n.icon size={21} />
              <span>{n.label}</span>
            </NavLink>
          ))}
          <button onClick={() => setMore(true)} className={tabCls(restItems.some((r) => loc.pathname.startsWith(r.to) && r.to !== '/'))}>
            <MoreHorizontal size={21} />
            <span>زیاتر</span>
          </button>
        </div>
      </nav>

      {/* ============ زیاتر ============ */}
      {more && (
        <Portal>
        <div className="lg:hidden fixed inset-0 z-[90] no-print" onClick={() => setMore(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div className="absolute bottom-0 inset-x-0 bg-surface border-t border-line rounded-t-3xl p-4 pb-8 animate-sheet safe-b" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold">هەموو بەشەکان</p>
              <button onClick={() => setMore(false)} className="p-2 -m-2 text-muted">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {restItems.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setMore(false)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface2 border border-line text-[13px] font-medium"
                >
                  <n.icon size={22} className="text-brand" />
                  {n.label}
                </NavLink>
              ))}
              <button onClick={flip} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface2 border border-line text-[13px] font-medium">
                {theme === 'dark' ? <Sun size={22} className="text-brand" /> : <Moon size={22} className="text-brand" />}
                {theme === 'dark' ? 'ڕووناک' : 'تاریک'}
              </button>
              <button onClick={() => signOut()} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-surface2 border border-line text-[13px] font-medium text-bad">
                <LogOut size={22} />
                دەرچوون
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      <Toasts items={toast} onDrop={drop} />
    </div>
  )
}

function DloPromo() {
  return (
    <footer className="no-print mx-4 sm:mx-6 mt-7 mb-3 lg:mb-5 px-4 py-2.5 rounded-xl border border-line bg-surface text-center text-[12px] sm:text-[13px] text-muted">
      <a
        href="https://www.instagram.com/dlo_.it/"
        target="_blank"
        rel="noreferrer"
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 transition-opacity hover:opacity-75"
        dir="rtl"
      >
        <img src={dloLogo} alt="DLO.IT" className="h-6 w-auto object-contain" />
        <span className="num font-medium text-ink" dir="ltr">07700581716</span>
        <span>بۆ دروستکردنی ئەپلیکەیشن و سیستەمی داتابەیس پەیوەندیم پێوە بکە.</span>
      </a>
    </footer>
  )
}

const tabCls = (active: boolean) =>
  `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${active ? 'text-brand' : 'text-muted'}`

/* سەردێڕی لاپەڕە */
export function PageHead({
  title,
  sub,
  action,
  back,
}: {
  title: string
  sub?: React.ReactNode
  action?: React.ReactNode
  back?: () => void
}) {
  return (
    <div className="sticky top-0 z-30 bg-bg/90 backdrop-blur-md border-b border-line no-print safe-t safe-x">
      <div className="px-4 sm:px-6 py-3.5 flex items-center gap-3">
        {back && (
          <button onClick={back} className="p-2 -ms-2 text-muted hover:text-ink rounded-lg shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}
        <div className="min-w-0 grow">
          <h1 className="text-[19px] sm:text-2xl font-bold truncate">{title}</h1>
          {sub && <div className="text-[13px] text-muted mt-0.5">{sub}</div>}
        </div>
        {action}
      </div>
    </div>
  )
}
