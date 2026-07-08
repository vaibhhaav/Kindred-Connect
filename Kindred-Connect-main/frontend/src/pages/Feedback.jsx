import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext.jsx';
import FeedbackTable from '../components/FeedbackTable.jsx';
import {
  subscribeFeedback,
  subscribeSessions,
  submitFeedbackDoc,
} from '../services/firestoreService.js';

const reconnectOptions = [
  { value: 'yes', label: 'Yes — would reconnect' },
  { value: 'maybe', label: 'Maybe — undecided' },
  { value: 'no', label: 'No — would not reconnect' },
];

const emotionOptions = [
  { value: 'happy', label: 'Happy' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'sad', label: 'Sad' },
];

export default function Feedback() {
  const { institutionId, loading: userLoading } = useUser();

  const [sessions, setSessions] = useState([]);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    sessionId: '',
    emotion: 'happy',
    engagementScore: 0.5,
    reconnect: 'yes',
    notes: '',
  });

  useEffect(() => {
    if (userLoading) return;

    if (!institutionId) {
      setSessions([]);
      setFeedbackItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    let sLoaded = false;
    let fLoaded = false;

    const done = () => {
      if (sLoaded && fLoaded) setLoading(false);
    };

    const unsubS = subscribeSessions(
      institutionId,
      (data) => {
        setSessions(data);
        sLoaded = true;
        done();
      },
      (err) => {
        setError(err?.message || 'Could not load sessions.');
        sLoaded = true;
        done();
      },
    );

    const unsubF = subscribeFeedback(
      institutionId,
      (data) => {
        setFeedbackItems(data);
        fLoaded = true;
        done();
      },
      (err) => {
        setError(err?.message || 'Could not load feedback.');
        fLoaded = true;
        done();
      },
    );

    return () => {
      unsubS?.();
      unsubF?.();
    };
  }, [institutionId, userLoading]);

  const feedbackSessionIds = useMemo(
    () => new Set(feedbackItems.map((f) => f.sessionId)),
    [feedbackItems],
  );

  const eligibleSessions = useMemo(() => {
    return sessions.filter((s) => s.status === 'completed' && !feedbackSessionIds.has(s.id));
  }, [sessions, feedbackSessionIds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.sessionId) {
      setError('Please select a completed session.');
      return;
    }
    if (!institutionId) {
      setError('Institution not set up.');
      return;
    }
    if (feedbackSessionIds.has(form.sessionId)) {
      setError('Feedback already submitted for this session.');
      return;
    }
    const score = Number(form.engagementScore);
    if (Number.isNaN(score) || score < 0 || score > 1) {
      setError('Engagement score must be between 0 and 1.');
      return;
    }

    setSaving(true);
    try {
      await submitFeedbackDoc({
        sessionId: form.sessionId,
        emotion: form.emotion,
        engagementScore: score,
        reconnect: form.reconnect,
        notes: form.notes.trim(),
        institutionId,
      });
      setForm({ sessionId: '', emotion: 'happy', engagementScore: 0.5, reconnect: 'yes', notes: '' });
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to submit feedback.');
    } finally {
      setSaving(false);
    }
  };

  const avgScore = useMemo(() => {
    if (!feedbackItems.length) return null;
    const total = feedbackItems.reduce((sum, f) => sum + (Number(f.engagementScore) || 0), 0);
    return total / feedbackItems.length;
  }, [feedbackItems]);

  const emotionCounts = useMemo(() => {
    const acc = { happy: 0, neutral: 0, sad: 0 };
    feedbackItems.forEach((f) => {
      const k = f.emotion;
      if (k in acc) acc[k] += 1;
    });
    return acc;
  }, [feedbackItems]);

  const wouldReconnectYes = useMemo(() => feedbackItems.filter((f) => f.reconnect === 'yes').length, [feedbackItems]);

  if (userLoading || loading) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-slate-500">Loading feedback…</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Feedback</h2>
        <p className="text-sm text-slate-600">Submit and review post-session outcomes.</p>
      </div>

      {feedbackItems.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-slate-900">{feedbackItems.length}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Avg. Engagement</p>
            <p className="text-2xl font-bold text-slate-900">{avgScore != null ? avgScore.toFixed(2) : '—'}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Happy</p>
            <p className="text-2xl font-bold text-slate-900">{emotionCounts.happy || 0}</p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Would Reconnect</p>
            <p className="text-2xl font-bold text-slate-900">{wouldReconnectYes}</p>
          </div>
        </div>
      )}

      <form className="rounded-xl border border-indigo-100 bg-white p-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-800">Session</span>
            <select
              value={form.sessionId}
              onChange={(e) => setForm((p) => ({ ...p, sessionId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select completed session</option>
              {eligibleSessions.length === 0 ? (
                <option value="" disabled>
                  No eligible sessions available.
                </option>
              ) : (
                eligibleSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.orphanName} ↔ {s.elderName} ({s.date})
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-800">Emotion</span>
            <select
              value={form.emotion}
              onChange={(e) => setForm((p) => ({ ...p, emotion: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              {emotionOptions.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="space-y-2 block">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-800">Engagement Score</span>
            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-700">
              {Number(form.engagementScore).toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={form.engagementScore}
            onChange={(e) => setForm((p) => ({ ...p, engagementScore: Number(e.target.value) }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>Low</span>
            <span>High</span>
          </div>
        </label>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-800">Reconnect Preference</span>
            <select
              value={form.reconnect}
              onChange={(e) => setForm((p) => ({ ...p, reconnect: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            >
              {reconnectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-800">Notes (optional)</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Any additional observations about the session…"
            />
            <div className="text-right text-xs text-slate-500">{form.notes.length}/500</div>
          </label>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : <span />}

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving || !form.sessionId}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </div>
      </form>

      <FeedbackTable feedbackItems={feedbackItems} />
    </section>
  );
}
