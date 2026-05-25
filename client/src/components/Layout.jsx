import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3, PlugZap, MessageSquare, Gem,
} from 'lucide-react';
import DemoToggle from './DemoToggle.jsx';
import { useDemo } from '../context/DemoContext.jsx';

const NAV = [
  { to: '/',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/products',   label: 'Products',   icon: Package },
  { to: '/orders',     label: 'Orders',     icon: ShoppingCart },
  { to: '/customers',  label: 'Customers',  icon: Users },
  { to: '/analytics',  label: 'Analytics',  icon: BarChart3 },
  { to: '/platforms',  label: 'Platforms',  icon: PlugZap },
  { to: '/chat',       label: 'AI Chat',    icon: MessageSquare },
];

export default function Layout() {
  const { enabled } = useDemo();

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-navy-900 text-slate-100 flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-slate-700/40">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-500 to-gold-400 flex items-center justify-center">
            <Gem size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-base leading-tight">Jewelry Authority</div>
            <div className="text-[10px] text-gold-400 tracking-wider uppercase">Commerce Intelligence</div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-gold-500/15 text-gold-400 border-l-2 border-gold-500'
                    : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-slate-700/40 text-xs text-slate-400">
          v1.0 - {new Date().getFullYear()}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="text-sm text-slate-500">
            Welcome back - here is what is happening across your channels.
          </div>
          <DemoToggle />
        </header>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            enabled ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-sm px-6 py-2">
            <strong>DEMO MODE</strong> — Showing sample data. Toggle off to connect live platforms.
          </div>
        </div>

        <main className="flex-1 p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
