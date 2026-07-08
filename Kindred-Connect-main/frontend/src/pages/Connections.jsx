import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext.jsx';
import ConnectionTable from '../components/ConnectionTable.jsx';
import { subscribeConnections, updateConnectionStatusDoc } from '../services/firestoreService.js';

export default function Connections() {
  const { institutionId, loading: userLoading } = useUser();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (userLoading) return;
    if (!institutionId) {
      setConnections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const unsub = subscribeConnections(
      institutionId,
      (data) => {
        setConnections(data);
        setLoading(false);
      },
      (err) => {
        setError(err?.message || 'Failed to load connections.');
        setLoading(false);
      },
    );

    return () => unsub?.();
  }, [institutionId, userLoading]);

  const onUpdateStatus = async (id, status) => {
    const connection = connections.find((item) => item.id === id);
    if (!connection || connection.status !== 'pending') return;

    setProcessingId(id);
    setError('');
    try {
      await updateConnectionStatusDoc(id, status);
    } catch (err) {
      setError(err?.message || 'Failed to update status.');
    } finally {
      setProcessingId('');
    }
  };

  if (userLoading) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-slate-500">Loading…</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Connections</h2>
        <p className="text-sm text-slate-600">Approve or reject pending matches (real-time).</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading connections…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <ConnectionTable
        connections={connections}
        processingId={processingId}
        onUpdateStatus={onUpdateStatus}
      />
    </section>
  );
}
