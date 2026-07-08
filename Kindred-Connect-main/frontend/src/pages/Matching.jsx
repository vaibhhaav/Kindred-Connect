import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useUser } from '../context/UserContext.jsx';
import MatchCard from '../components/MatchCard.jsx';
import { db } from '../components/firebase.js';
import {
  buildMatchResult,
  generateMatchesLocal,
  autoMatchAllLocal,
} from '../services/matchingEngine.js';
import {
  createConnectionDoc,
  subscribeConnections,
} from '../services/firestoreService.js';

export default function Matching() {
  const { institutionId, institutionType } = useUser();
  const isOrphanage = institutionType === 'orphanage';

  const myLabel = isOrphanage ? 'orphan' : 'elder';
  const myLabelPlural = isOrphanage ? 'orphans' : 'elders';
  const otherLabel = isOrphanage ? 'elder' : 'orphan';
  const otherLabelPlural = isOrphanage ? 'elders' : 'orphans';

  const myCollection = isOrphanage ? 'orphans' : 'elders';
  const otherCollection = isOrphanage ? 'elders' : 'orphans';

  const [myProfiles, setMyProfiles] = useState([]);
  const [otherProfiles, setOtherProfiles] = useState([]);

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState('');
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [autoMatched, setAutoMatched] = useState(false);
  const [highlightMatchIds, setHighlightMatchIds] = useState([]);
  const [savingAll, setSavingAll] = useState(false);

  const [existingPairs, setExistingPairs] = useState(new Set());
  const getMatchKey = (match) => match.id || `${match.elderId}-${match.orphanId}`;

  const isSameProfilePair = (elder, orphan) => {
    if (!elder || !orphan) return false;

    if (elder.id && orphan.id && elder.id === orphan.id) return true;

    const normalize = (value) => String(value || '').trim().toLowerCase();
    const elderName = normalize(elder.name || elder.fullName);
    const orphanName = normalize(orphan.name || orphan.fullName);

    return Boolean(elderName && orphanName && elderName === orphanName);
  };

  const withDisplayName = (result) => ({
    ...result,
    displayName: isOrphanage ? result.elderName : result.orphanName,
  });

  // Load MY institution's profiles
  useEffect(() => {
    if (!institutionId) {
      setMyProfiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, myCollection), where('institutionId', '==', institutionId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMyProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data(), type: myLabel })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [institutionId, myCollection, myLabel]);

  // Load ALL profiles of the OTHER type (cross-institution pool)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, otherCollection), (snap) => {
      setOtherProfiles(snap.docs.map((d) => ({ id: d.id, ...d.data(), type: otherLabel })));
    });
    return () => unsub();
  }, [otherCollection, otherLabel]);

  // Subscribe connections to detect already-used pairs
  useEffect(() => {
    if (!institutionId) return;
    const unsub = subscribeConnections(
      institutionId,
      (connections) => {
        const pairs = new Set();
        connections.forEach((c) => {
          if (c.status !== 'rejected') {
            pairs.add(`${c.orphanId}::${c.elderId}`);
            pairs.add(`${c.elderId}::${c.orphanId}`);
          }
        });
        setExistingPairs(pairs);
      },
      () => {},
    );
    return () => unsub?.();
  }, [institutionId]);

  const orphans = useMemo(() => (isOrphanage ? myProfiles : otherProfiles), [isOrphanage, myProfiles, otherProfiles]);
  const elders = useMemo(() => (isOrphanage ? otherProfiles : myProfiles), [isOrphanage, myProfiles, otherProfiles]);

  const runMatching = () => {
    if (!selectedProfileId) {
      setError(`Please select a ${myLabel} profile first.`);
      return;
    }

    setError('');
    setSuccessMessage('');
    setAutoMatched(false);
    setHighlightMatchIds([]);
    setLoading(true);

    try {
      let results = [];

      if (isOrphanage) {
        results = generateMatchesLocal(selectedProfileId, orphans, elders);
      } else {
        const selectedElder = myProfiles.find((e) => e.id === selectedProfileId);
        if (!selectedElder) {
          setError('Profile not found.');
          setLoading(false);
          return;
        }

        results = orphans
          .filter((orphan) => !isSameProfilePair(selectedElder, orphan))
          .map((orphan) => buildMatchResult(selectedElder, orphan))
          .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
      }

      results = results
        .filter((m) => !existingPairs.has(`${m.orphanId}::${m.elderId}`))
        .map(withDisplayName);

      if (!results.length) {
        setError(`No new ${otherLabelPlural} matches available (all pairs already connected).`);
        setMatches([]);
      } else {
        setMatches(results);
        setSuccessMessage(`Found ${results.length} new ${otherLabelPlural} match${results.length > 1 ? 'es' : ''}`);
      }
    } catch (e) {
      console.error(e);
      setError('Failed to generate matches.');
    } finally {
      setLoading(false);
    }
  };

  const createConnection = async (match) => {
    if (!institutionId) {
      setError('Institution not set up.');
      return;
    }

    const matchKey = getMatchKey(match);
    setCreatingId(matchKey);
    setError('');
    try {
      await createConnectionDoc({
        orphanId: match.orphanId,
        orphanName: match.orphanName || match.orphan?.name || 'Orphan',
        elderId: match.elderId,
        elderName: match.elderName || match.elder?.name || 'Elder',
        compatibilityScore: match.compatibilityScore ?? null,
        institutionId,
      });
      setSuccessMessage(`Connection created: ${match.orphanName} ↔ ${match.elderName}`);
      setMatches((current) => current.filter((item) => getMatchKey(item) !== matchKey));
      setHighlightMatchIds((current) => current.filter((id) => id !== matchKey));
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to create connection.');
    } finally {
      setCreatingId('');
    }
  };

  const runAutoMatchAll = async () => {
    if (!window.confirm(`Auto Match All will propose matches for your ${myLabelPlural}. Continue?`)) return;

    setError('');
    setSuccessMessage('');
    setAutoMatched(false);
    setHighlightMatchIds([]);
    setAutoMatchLoading(true);

    try {
      const results = autoMatchAllLocal(orphans, elders);
      const filtered = results
        .filter((m) => {
          const elder = elders.find((profile) => profile.id === m.elderId);
          const orphan = orphans.find((profile) => profile.id === m.orphanId);
          return !isSameProfilePair(elder, orphan);
        })
        .filter((m) => !existingPairs.has(`${m.orphanId}::${m.elderId}`))
        .map(withDisplayName);

      if (filtered.length > 0) {
        setMatches(filtered);
        setHighlightMatchIds(filtered.map((m) => m.id).filter(Boolean));
        setAutoMatched(true);
        setSuccessMessage(`Found ${filtered.length} new match${filtered.length > 1 ? 'es' : ''} — review and save below`);
      } else {
        setMatches([]);
        setError(`No new matches available — all profiles are already connected.`);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Auto match failed.');
    } finally {
      setAutoMatchLoading(false);
    }
  };

  const saveAllConnections = async () => {
    if (!institutionId) {
      setError('Institution not set up.');
      return;
    }

    setSavingAll(true);
    setError('');
    try {
      let saved = 0;
      for (const match of matches) {
        await createConnectionDoc({
          orphanId: match.orphanId,
          orphanName: match.orphanName,
          elderId: match.elderId,
          elderName: match.elderName,
          compatibilityScore: match.compatibilityScore ?? null,
          institutionId,
        });
        saved += 1;
      }
      setSuccessMessage(`✓ Saved ${saved} connection${saved > 1 ? 's' : ''} to database`);
      setAutoMatched(false);
      setHighlightMatchIds([]);
    } catch (err) {
      console.error(err);
      setError(`Error while saving connections: ${err?.message || 'Unknown error'}`);
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Matching</h2>
        <p className="text-sm text-slate-600">
          Select a {myLabel} profile to find compatible {otherLabelPlural}. Matching uses a local ML model and updates live from Firestore.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={runAutoMatchAll}
          disabled={autoMatchLoading || loading || !institutionId}
          className="auto-match-btn"
        >
          {autoMatchLoading ? 'Matching…' : `Auto Match All`}
        </button>

        {autoMatched && matches.length > 0 && (
          <button
            type="button"
            onClick={saveAllConnections}
            disabled={savingAll}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {savingAll ? 'Saving…' : `Save All ${matches.length} Connections`}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="w-full sm:w-auto sm:min-w-64">
          <label className="block text-xs font-medium text-slate-600 mb-1">Select {myLabel}</label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            required
          >
            <option value="">Select {myLabel}</option>
            {myProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name || p.fullName || p.id}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={runMatching}
          disabled={loading || !selectedProfileId}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading ? 'Generating…' : `Generate Matches`}
        </button>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {successMessage && <p className="text-sm text-emerald-600">{successMessage}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading profiles…</p>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-indigo-100 bg-white p-6 text-sm text-slate-600">
          Select a {myLabel} and click "Generate Matches", or use "Auto Match All".
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => (
            <MatchCard
              key={getMatchKey(match)}
              match={match}
              loading={creatingId === getMatchKey(match)}
              onCreateConnection={createConnection}
              showCreateConnection
              highlight={autoMatched && highlightMatchIds.includes(match.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
