import React, { useState } from 'react';
import { createSessionDoc } from '../services/firestoreService.js';

export default function SessionModal({
  open,
  approvedConnections,
  onClose,
  onSubmit,
  institutionId,
}) {
  const [connectionId, setConnectionId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const selectedConnection = approvedConnections?.find((c) => c.id === connectionId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!connectionId || !date || !time) {
      setError('All fields are required.');
      return;
    }
    if (!institutionId) {
      setError('Institution not set up.');
      return;
    }

    setSaving(true);
    try {
      const id = await createSessionDoc({
        connectionId,
        orphanId: selectedConnection?.orphanId,
        elderId: selectedConnection?.elderId,
        orphanName: selectedConnection?.orphanName || 'Orphan',
        elderName: selectedConnection?.elderName || 'Elder',
        date: String(date),
        time: String(time),
        institutionId,
        compatibilityScore: selectedConnection?.compatibilityScore ?? null,
        // meetLink is optional; service will generate it.
      });

      onSubmit?.({ connectionId, date, time, id });
      setConnectionId('');
      setDate('');
      setTime('');
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to schedule session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">Schedule Session</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <p className="mt-0 mb-4 text-xs text-slate-500">Only approved connections are available.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="space-y-1 block">
            <span className="text-sm font-medium text-slate-800">Connection</span>
            <select
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select approved connection</option>
              {approvedConnections?.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {(connection.orphanName || connection.orphan?.name || 'Orphan')} ↔{' '}
                  {(connection.elderName || connection.elder?.name || 'Elder')}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="text-sm font-medium text-slate-800">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-sm font-medium text-slate-800">Time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {saving ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
