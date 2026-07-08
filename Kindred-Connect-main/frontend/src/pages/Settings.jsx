import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../components/firebase.js';
import { useUser } from '../context/UserContext.jsx';
import { deleteInstitutionCascade } from '../services/firestoreAdmin.js';

export default function Settings() {
  const { userId, institutionId, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [institution, setInstitution] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!institutionId) {
      setInstitution(null);
      return undefined;
    }
    const ref = doc(db, 'institutions', institutionId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setInstitution(null);
          return;
        }
        const d = { id: snap.id, ...snap.data() };
        setInstitution(d);
        setName(d.name || '');
      },
      () => setError('Could not load institution.'),
    );
    return () => unsub();
  }, [institutionId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!institutionId) return;
    setError('');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'institutions', institutionId), {
        name: String(name).trim(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setError(err?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!institutionId || !userId) return;
    const ok = window.confirm(
      'Delete this institution and all profiles linked to it? This cannot be undone.',
    );
    if (!ok) return;
    setError('');
    setDeleting(true);
    try {
      await deleteInstitutionCascade({ institutionId, adminId: userId });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  if (userLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!institutionId) {
    return (
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-600">Create your institution from the dashboard first.</p>
      </section>
    );
  }

  if (!institution) {
    return (
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500">Loading institution…</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-600">Edit or remove your organization. Changes sync in real time.</p>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Type</p>
          <p className="text-sm capitalize text-slate-900">{institution.type}</p>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-slate-700">Institution name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-5">
        <h3 className="text-sm font-semibold text-rose-900">Danger zone</h3>
        <p className="mt-1 text-xs text-rose-800">
          Deletes the institution document, clears your account link, and removes all orphan/elder profiles for this institution.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
        >
          {deleting ? 'Deleting…' : 'Delete institution'}
        </button>
      </div>
    </section>
  );
}
