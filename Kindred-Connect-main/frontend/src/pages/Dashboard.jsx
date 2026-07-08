import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Dashboard;

