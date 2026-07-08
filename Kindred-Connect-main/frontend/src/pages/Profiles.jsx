import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import ProfileForm from '../components/ProfileForm.jsx';
import ProfileCard from '../components/ProfileCard.jsx';
import { db } from '../components/firebase.js';
import { useUser } from '../context/UserContext.jsx';
import {
  deleteProfileDocument,
  profilesCollectionForInstitution,
} from '../services/firestoreAdmin.js';
import InstitutionSetup from '../components/InstitutionSetup.jsx';

export default function Profiles() {
  const { institutionId, institutionType, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    if (!institutionId || !institutionType) {
      setProfiles([]);
      return undefined;
    }
    const colName = profilesCollectionForInstitution(institutionType);
    if (!colName) {
      setProfiles([]);
      return undefined;
    }
    const q = query(
      collection(db, colName),
      where('institutionId', '==', institutionId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError('');
      },
      (err) => {
        console.error(err);
        setError('Could not load profiles. Check Firestore rules and indexes.');
      },
    );
    return () => unsub();
  }, [institutionId, institutionType]);

  if (userLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!institutionId) {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Profiles</h2>
            <p className="text-sm text-slate-600">Set up your institution to add profiles.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to dashboard
          </button>
        </div>
        <InstitutionSetup />
      </section>
    );
  }

  const label =
    institutionType === 'oldage' ? 'Elders' : 'Orphans';

  const handleDeleteProfile = async (profile) => {
    if (!institutionType || !profile?.id) return;

    const profileName = profile.name || profile.fullName || 'this profile';
    if (!window.confirm(`Delete ${profileName}? This action cannot be undone.`)) return;

    setDeletingId(profile.id);
    setError('');
    try {
      await deleteProfileDocument({
        institutionType,
        profileId: profile.id,
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to delete profile.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Profiles</h2>
          <p className="text-sm text-slate-600">
            {label} for your institution (type is set automatically).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Add Profile
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            onDelete={handleDeleteProfile}
            deleting={deletingId === profile.id}
          />
        ))}
        {profiles.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-indigo-200 bg-white p-6 text-sm text-slate-500">
            No profiles yet. Click Add Profile.
          </div>
        )}
      </div>

      <ProfileForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </section>
  );
}
