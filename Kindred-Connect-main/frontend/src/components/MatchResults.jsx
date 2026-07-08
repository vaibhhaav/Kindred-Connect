import React from 'react';

const MatchResults = ({ matches, orphans }) => {
  if (!matches || matches.length === 0) {
    return (
      <div>
        <h3 className="font-semibold text-slate-800 mb-2">Match Recommendations</h3>
        <p className="text-sm text-slate-500">
          Select an elder and at least one orphan, then click &quot;Get Match
          Recommendations&quot; to see suggested connections.
        </p>
      </div>
    );
  }

  const orphanMap = Object.fromEntries(orphans.map((o) => [o.id, o]));

  return (
    <div>
      <h3 className="font-semibold text-slate-800 mb-2">Match Recommendations</h3>
      <p className="text-xs text-slate-500 mb-3">
        Higher scores suggest stronger potential for emotional alignment and shared
        interests.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {matches.map((m) => {
          const orphan = orphanMap[m.orphan_id];
          if (!orphan) return null;
          return (
            <div
              key={m.orphan_id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-800">{orphan.name}</span>
                <span className="text-xs font-semibold text-primary-600">
                  {(m.score * 100).toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-slate-600">
                {orphan.age} yrs • {orphan.institution}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                <span className="font-medium">Languages:</span>{' '}
                {(orphan.languages || []).join(', ') || '—'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                <span className="font-medium">Hobbies:</span>{' '}
                {(orphan.hobbies || []).join(', ') || '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MatchResults;

