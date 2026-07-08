import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearToken } from '../utils/auth.js';

const Layout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h1 className="text-xl font-semibold text-primary-600">Kindred Connect</h1>
          <p className="text-xs text-slate-500">Admin Console</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm font-medium ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/sessions"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm font-medium ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            Sessions
          </NavLink>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-500"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

