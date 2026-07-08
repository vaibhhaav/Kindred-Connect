import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Heart,
  Home,
  Link2,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useUser } from '../context/UserContext.jsx';

const links = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/dashboard/profiles', label: 'Profiles', icon: Users },
  { to: '/dashboard/matching', label: 'Matching', icon: Sparkles },
  { to: '/dashboard/connections', label: 'Connections', icon: Link2 },
  { to: '/dashboard/sessions', label: 'Sessions', icon: Calendar },
  { to: '/dashboard/feedback', label: 'Feedback', icon: MessageSquare },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, email } = useUser();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  const navContent = (
    <>
      <nav className="flex flex-col gap-1 flex-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/dashboard'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2.5 text-sm flex items-center gap-2.5 transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium border-l-2 border-indigo-600'
                  : 'text-slate-700 hover:bg-slate-50 border-l-2 border-transparent'
              }`
            }
          >
            <link.icon className="h-4 w-4 shrink-0 text-slate-600" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-indigo-100 space-y-3">
        {!!email && (
          <p className="text-[11px] text-slate-500 truncate px-1">{email}</p>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-indigo-100 p-4 min-h-screen sticky top-0 flex-col">
        <div className="mb-6 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Heart className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800 leading-tight">
              Kindred Connect
            </h1>
            <p className="text-[11px] text-slate-500">Lifecycle Console</p>
          </div>
        </div>
        {navContent}
      </aside>

      {/* Mobile header + drawer */}
      <div className="md:hidden sticky top-0 z-40 bg-white border-b border-indigo-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Heart className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-800">
            Kindred Connect
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg border border-indigo-200 bg-white p-2"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? (
            <X className="h-5 w-5 text-slate-700" />
          ) : (
            <Menu className="h-5 w-5 text-slate-700" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 w-72 h-full bg-white border-r border-indigo-100 p-4 flex flex-col shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-base font-semibold text-slate-800">
                  Kindred Connect
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-indigo-200 bg-white p-2"
                aria-label="Close menu"
              >
                <X className="h-4 w-4 text-slate-700" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
