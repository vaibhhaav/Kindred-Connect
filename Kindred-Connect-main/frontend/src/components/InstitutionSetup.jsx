import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext.jsx';
import {
  createInstitutionForAdmin,
  INSTITUTION_TYPES,
} from '../services/firestoreAdmin.js';

export default function InstitutionSetup() {
  const { userId, institutionId } = useUser();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState(INSTITUTION_TYPES.ORPHANAGE);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (institutionId) {
    return (
      <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Institution ready</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your organization is linked. Use Add Profile to register people. Edit the institution from Settings in the sidebar.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/profiles')}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Add Profile
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!userId) {
      setError('Not signed in.');
      return;
    }
    if (!String(name).trim()) {
      setError('Institution name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await createInstitutionForAdmin({
        adminId: userId,
        name: name.trim(),
        type,
      });
      setName('');
    } catch (err) {
      setError(err?.message || 'Could not create institution.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Set up your institution</h2>
      <p className="mt-1 text-sm text-slate-600">
        This is a one-time step. After you create your organization, this form is locked and cannot be shown again for this account.
      </p>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-w-md">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Institution name</span>
          <input
            type="text"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Institution type</span>
          <select
            value={type}
            onChange={(ev) => setType(ev.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value={INSTITUTION_TYPES.ORPHANAGE}>Orphanage</option>
            <option value={INSTITUTION_TYPES.OLDAGE}>Old age home</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create institution'}
        </button>
      </form>
    </div>
  );
}
