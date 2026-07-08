import React, { useState } from 'react';
import { submitFeedback } from '../services/api.js';

const FeedbackForm = ({ session, onSubmitted }) => {
  const [form, setForm] = useState({
    would_connect_again: 'yes',
    feeling: 'happy',
    comment: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!session) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        session_id: session.id,
        elder_id: session.elder_id,
        orphan_id: session.orphan_id,
        would_connect_again: form.would_connect_again === 'yes',
        feeling: form.feeling,
        comment: form.comment.trim() || null,
      };
      const res = await submitFeedback(payload);
      onSubmitted?.(res);
      setForm({
        would_connect_again: 'yes',
        feeling: 'happy',
        comment: '',
      });
    } catch (err) {
      console.error(err);
      setError('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      {error && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-md px-2 py-1">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="block text-slate-700 font-medium">Would connect again?</span>
          <select
            name="would_connect_again"
            value={form.would_connect_again}
            onChange={handleChange}
            className="w-full rounded-md border-slate-300 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-slate-700 font-medium">How did they feel?</span>
          <select
            name="feeling"
            value={form.feeling}
            onChange={handleChange}
            className="w-full rounded-md border-slate-300 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="happy">Happy</option>
            <option value="curious">Curious</option>
            <option value="peaceful">Peaceful</option>
            <option value="overwhelmed">Overwhelmed</option>
            <option value="sad">Sad</option>
            <option value="neutral">Neutral</option>
          </select>
        </label>
      </div>
      <label className="space-y-1 block">
        <span className="block text-slate-700 font-medium">Optional notes</span>
        <textarea
          name="comment"
          rows={3}
          value={form.comment}
          onChange={handleChange}
          placeholder="Share any observations about their emotional state, level of comfort, or topics that lit them up."
          className="w-full rounded-md border-slate-300 focus:ring-primary-500 focus:border-primary-500"
        />
      </label>
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 disabled:bg-slate-300"
        >
          {loading ? 'Submitting…' : 'Submit feedback'}
        </button>
      </div>
    </form>
  );
};

export default FeedbackForm;

