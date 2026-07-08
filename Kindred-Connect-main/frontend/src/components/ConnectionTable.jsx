import React from 'react';

export default function ConnectionTable({ connections, processingId, onUpdateStatus }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-white shadow-sm">
      <table className="min-w-[700px] w-full text-xs sm:text-sm">
        <thead className="bg-indigo-50 text-slate-700">
          <tr>
            <th className="px-3 py-2 text-left">Orphan Name</th>
            <th className="px-3 py-2 text-left">Elder Name</th>
            <th className="px-3 py-2 text-left">Score</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((connection) => {
            const busy = processingId === connection.id;
            const pending = connection.status === 'pending';
            return (
              <tr key={connection.id} className="border-t border-indigo-50">
                <td className="px-3 py-2">{connection.orphanName || connection.orphan?.name || '-'}</td>
                <td className="px-3 py-2">{connection.elderName || connection.elder?.name || '-'}</td>
                <td className="px-3 py-2">{connection.compatibilityScore ?? '-'}</td>
                <td className="px-3 py-2 capitalize">{connection.status}</td>
                <td className="px-3 py-2">
                  {pending && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onUpdateStatus(connection.id, 'approved')}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onUpdateStatus(connection.id, 'rejected')}
                        className="rounded bg-rose-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {connection.status === 'approved' && (
                    <span className="text-xs font-medium text-emerald-700">Ready for session</span>
                  )}
                  {connection.status === 'rejected' && (
                    <button
                      type="button"
                      disabled
                      className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-500"
                    >
                      Rejected
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {connections.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-center text-xs text-slate-500" colSpan={5}>
                No connections found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
