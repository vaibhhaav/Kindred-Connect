import React, { useEffect, useState } from 'react';
import ProfileForm from './ProfileForm.jsx';
import MatchResults from './MatchResults.jsx';
import { createProfile, listProfiles, getMatches } from '../services/api.js';

const AdminDashboard = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedElder, setSelectedElder] = useState('');
  const [selectedOrphans, setSelectedOrphans] = useState([]);
  const [matches, setMatches] = useState([]);

  async function refreshProfiles() {
    setLoading(true);
    setError('');
    try {
      const elders = await listProfiles({ type: 'elder' });
      const orphans = await listProfiles({ type: 'orphan' });
      setProfiles([...elders, ...orphans]);
    } catch (err) {
      console.error(err);
      setError('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshProfiles();
  }, []);

  const elders = profiles.filter((p) => p.type === 'elder');
  const orphans = profiles.filter((p) => p.type === 'orphan');

  const handleProfileSubmit = async (payload) => {
    setError('');
    try {
      await createProfile(payload);
      await refreshProfiles();
    } catch (err) {
      console.error(err);
      const res = err.response?.data;
      const msg = res?.error
        ? res.error
        : Array.isArray(res?.errors)
          ? res.errors.join('. ')
          : err.message || 'Failed to create profile';
      setError(msg);
    }
  };

  const toggleOrphanSelection = (id) => {
    setSelectedOrphans((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id],
    );
  };

  const handleGetMatches = async () => {
    if (!selectedElder || selectedOrphans.length === 0) return;
    setError('');
    setMatches([]);
    try {
      const data = await getMatches(selectedElder, selectedOrphans);
      setMatches(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch match recommendations');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h2>
        <p className="text-sm text-slate-600">
          Register profiles, explore match recommendations, and oversee emotional safety.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 className="font-semibold mb-3 text-slate-800">Register Profile</h3>
          <ProfileForm onSubmit={handleProfileSubmit} />
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">Profiles</h3>
            {loading && <span className="text-xs text-slate-500">Loading…</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <h4 className="font-medium text-slate-700 mb-2">Elders</h4>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {elders.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedElder(e.id)}
                    className={`w-full text-left px-3 py-2 rounded-md border ${
                      selectedElder === e.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-slate-500">
                      {e.age} yrs • {e.institution}
                    </div>
                  </button>
                ))}
                {elders.length === 0 && (
                  <p className="text-xs text-slate-500">No elders yet.</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-2">Orphans</h4>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {orphans.map((o) => (
                  <label
                    key={o.id}
                    className="flex items-start gap-2 px-3 py-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedOrphans.includes(o.id)}
                      onChange={() => toggleOrphanSelection(o.id)}
                    />
                    <div>
                      <div className="font-medium">{o.name}</div>
                      <div className="text-xs text-slate-500">
                        {o.age} yrs • {o.institution}
                      </div>
                    </div>
                  </label>
                ))}
                {orphans.length === 0 && (
                  <p className="text-xs text-slate-500">No orphans yet.</p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleGetMatches}
              disabled={!selectedElder || selectedOrphans.length === 0}
              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-primary-600 disabled:bg-slate-300 hover:bg-primary-500"
            >
              Get Match Recommendations
            </button>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <MatchResults matches={matches} orphans={orphans} />
      </section>
    </div>
  );
};

export default AdminDashboard;

