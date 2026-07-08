import React from 'react';

export default function ProfileCard({ profile, onDelete, deleting = false }) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {profile.name || profile.fullName || 'Unnamed'}
          </h3>
          <p className="text-xs text-slate-500 capitalize">
            {profile.institutionType || profile.type || '-'}
          </p>
        </div>
        {typeof onDelete === 'function' && (
          <button
            type="button"
            onClick={() => onDelete(profile)}
            disabled={deleting}
            className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
        <span>Age: {profile.age ?? '-'}</span>
        <span>Language: {profile.language || '-'}</span>
        <span>Emotion: {profile.emotionalState || '-'}</span>
        <span>Attachment: {profile.attachmentStyle || '-'}</span>
      </div>
    </div>
  );
}
