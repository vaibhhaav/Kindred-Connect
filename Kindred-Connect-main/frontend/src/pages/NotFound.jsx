import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Keep it console-only to avoid breaking UI expectations.
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="mb-4 text-5xl font-bold text-slate-900">404</h1>
        <p className="mb-4 text-xl text-slate-600">Oops! Page not found</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}

