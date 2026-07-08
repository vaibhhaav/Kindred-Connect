import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';
import InstitutionSetup from '../components/InstitutionSetup.jsx';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../components/firebase.js';
import React, { useEffect, useState } from 'react';
import { BarChart3, Link2, Settings, UserPlus } from 'lucide-react';

export default function DashboardHome() {
  const { loading, institutionId, institutionType } = useUser();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    profiles: null,
    connections: null,
    sessions: null,
    feedback: null,
  });

  useEffect(() => {
    if (!institutionId || !institutionType) return;

    const colName = institutionType === 'oldage' ? 'elders' : 'orphans';

    const unsubs = [
      onSnapshot(
        query(collection(db, colName), where('institutionId', '==', institutionId)),
        (snap) => setStats((s) => ({ ...s, profiles: snap.size })),
      ),
      onSnapshot(
        query(collection(db, 'connections'), where('institutionId', '==', institutionId)),
        (snap) => setStats((s) => ({ ...s, connections: snap.size })),
      ),
      onSnapshot(
        query(collection(db, 'sessions'), where('institutionId', '==', institutionId)),
        (snap) => setStats((s) => ({ ...s, sessions: snap.size })),
      ),
      onSnapshot(
        query(collection(db, 'feedback'), where('institutionId', '==', institutionId)),
        (snap) => setStats((s) => ({ ...s, feedback: snap.size })),
      ),
    ];

    return () => unsubs.forEach((u) => u?.());
  }, [institutionId, institutionType]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-indigo-100 bg-white p-6 text-center text-sm text-slate-600">
          Loading your account…
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-indigo-100 bg-white p-4 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!institutionId) {
    return <InstitutionSetup />;
  }

  const quickActions = [
    { label: 'Add Profile', to: '/dashboard/profiles', icon: UserPlus },
    { label: 'Run Matching', to: '/dashboard/matching', icon: BarChart3 },
    { label: 'View Connections', to: '/dashboard/connections', icon: Link2 },
    { label: 'Settings', to: '/dashboard/settings', icon: Settings },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-600">Real-time overview of your institution&apos;s activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Profiles', value: stats.profiles, to: '/dashboard/profiles' },
          { label: 'Connections', value: stats.connections, to: '/dashboard/connections' },
          { label: 'Sessions', value: stats.sessions, to: '/dashboard/sessions' },
          { label: 'Feedback', value: stats.feedback, to: '/dashboard/feedback' },
        ].map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => navigate(c.to)}
            className="text-left rounded-xl border border-indigo-100 bg-white p-5 shadow-sm hover:border-indigo-200 transition"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wide">{c.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{c.value == null ? '—' : c.value}</p>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.to}
                type="button"
                onClick={() => navigate(action.to)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon size={18} />
                  </div>
                  <span>{action.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
