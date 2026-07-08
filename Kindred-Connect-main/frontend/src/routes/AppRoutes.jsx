import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Home from '../pages/Home.jsx';
import Login from '../pages/Login.jsx';
import Signup from '../pages/Signup.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import DashboardHome from '../pages/DashboardHome.jsx';
import Profiles from '../pages/Profiles.jsx';
import Settings from '../pages/Settings.jsx';
import Matching from '../pages/Matching.jsx';
import Connections from '../pages/Connections.jsx';
import Sessions from '../pages/Sessions.jsx';
import Feedback from '../pages/Feedback.jsx';
import NotFound from '../pages/NotFound.jsx';
import { useUser } from '../context/UserContext.jsx';
import { getToken } from '../utils/auth.js';

function ProtectedRoute() {
  const { firebaseUser, loading } = useUser();
  const token = getToken();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
        Checking session…
      </div>
    );
  }
  if (!firebaseUser || !token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<DashboardHome />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="settings" element={<Settings />} />
          <Route path="matching" element={<Matching />} />
          <Route path="connections" element={<Connections />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="feedback" element={<Feedback />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
