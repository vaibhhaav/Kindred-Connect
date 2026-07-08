import React from 'react';

export default function FeedbackTable({ feedbackItems }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-white shadow-sm">
      <table className="min-w-[560px] w-full text-xs sm:text-sm">
        <thead className="bg-indigo-50 text-slate-700">
          <tr>
            <th className="px-3 py-2 text-left">Session ID</th>
            <th className="px-3 py-2 text-left">Emotion</th>
            <th className="px-3 py-2 text-left">Engagement Score</th>
            <th className="px-3 py-2 text-left">Reconnect</th>
          </tr>
        </thead>
        <tbody>
          {feedbackItems.map((item) => (
            <tr key={item.id} className="border-t border-indigo-50">
              <td className="px-3 py-2">{item.sessionId}</td>
              <td className="px-3 py-2 capitalize">{item.emotion}</td>
              <td className="px-3 py-2">{item.engagementScore}</td>
              <td className="px-3 py-2 capitalize">{item.reconnect}</td>
            </tr>
          ))}
          {feedbackItems.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-center text-xs text-slate-500" colSpan={4}>
                No feedback submitted.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
