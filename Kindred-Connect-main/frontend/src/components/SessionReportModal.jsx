import React, { useMemo } from 'react';
import { Button } from './ui/button.jsx';
import { Card } from './ui/card.jsx';
import { Progress } from './ui/progress.jsx';

export default function SessionReportModal({ open, onClose, session, report }) {
  const emotionConfig = useMemo(
    () => ({
      happy: { emoji: '😊', label: 'Happy', colorClass: 'text-emerald-700', bgClass: 'bg-emerald-50 border-emerald-100' },
      neutral: { emoji: '😐', label: 'Neutral', colorClass: 'text-amber-700', bgClass: 'bg-amber-50 border-amber-100' },
      sad: { emoji: '😞', label: 'Sad', colorClass: 'text-rose-700', bgClass: 'bg-rose-50 border-rose-100' },
    }),
    [],
  );

  const recommendationConfig = useMemo(
    () => ({
      continue: { label: 'Continue Bond', desc: 'This pair should continue meeting', accentClass: 'text-emerald-700' },
      reconsider: { label: 'Reconsider', desc: 'May need adjustments or more time', accentClass: 'text-amber-700' },
      rematch: { label: 'Rematch Suggested', desc: 'Consider finding a better match', accentClass: 'text-rose-700' },
    }),
    [],
  );

  if (!open || !report) return null;

  const emo = emotionConfig[report.emotion] || emotionConfig.neutral;
  const rec = recommendationConfig[report.reconnectRecommendation] || recommendationConfig.reconsider;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-elevated">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Session Report</h3>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          {session?.orphanName || 'Orphan'} ↔ {session?.elderName || 'Elder'} · {session?.date || '-'}
        </p>

        <div className="rounded-xl border border-slate-200 p-4 mb-3 flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-3xl ${emo.bgClass}`}>
            {emo.emoji}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Detected Emotion</p>
            <p className={`text-xl font-bold ${emo.colorClass}`}>{emo.label}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Engagement</p>
            <p className="text-2xl font-bold text-slate-900 mb-1">{(report.engagementScore * 100).toFixed(0)}%</p>
            <Progress value={report.engagementScore * 100} />
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Bond Strength</p>
            <p className="text-2xl font-bold text-slate-900 mb-1">{(report.bondStrength * 100).toFixed(0)}%</p>
            <Progress value={report.bondStrength * 100} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Recommendation</p>
          <p className={`font-bold ${rec.accentClass}`}>{rec.label}</p>
          <p className="text-sm text-slate-600 mt-1">{rec.desc}</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Analysis Summary</p>
          <p className="text-sm text-slate-800">{report.reason}</p>
          <div className="flex gap-2 mt-3">
            <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-700">
              Polarity: {report.polarity}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-700">
              Subjectivity: {report.subjectivity}
            </span>
          </div>
        </div>

        <Button type="button" className="w-full" onClick={onClose}>
          Close Report
        </Button>
      </Card>
    </div>
  );
}

