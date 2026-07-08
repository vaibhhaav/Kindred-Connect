import React, { useEffect, useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { getProfiles } from '../services/api.js';

const SessionScheduler = ({ onScheduled }) => {
  const [elders, setElders] = useState([]);
  const [orphans, setOrphans] = useState([]);
  const [form, setForm] = useState({
    elder_id: '',
    orphan_id: '',
    scheduled_at: '',
    duration_minutes: 60,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfiles() {
      try {
        const [e, o] = await Promise.all([
          getProfiles({ type: 'elder' }),
          getProfiles({ type: 'orphan' }),
        ]);
        setElders(e);
        setOrphans(o);
      } catch (err) {
        console.error(err);
        setError('Failed to load profiles');
      }
    }
    loadProfiles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!form.elder_id || !form.orphan_id || !form.scheduled_at) {
        alert('Please complete all required fields');
        return;
      }

      const formData = {
        elder_id: String(form.elder_id).trim(),
        orphan_id: String(form.orphan_id).trim(),
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: Number(form.duration_minutes),
      };

      console.log('Submitting:', formData);

      await addDoc(collection(db, 'sessions'), {
        ...formData,
        createdAt: new Date(),
      });
      onScheduled?.(formData);
      console.log('Saved successfully');
      alert('Data added successfully');
      setForm({
        elder_id: '',
        orphan_id: '',
        scheduled_at: '',
        duration_minutes: 60,
      });
    } catch (err) {
      console.error(err);
      alert('Error saving data');
      setError('Failed to schedule session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-800 mb-2">Schedule Session</h3>
      {error && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-md px-2 py-1 mb-2">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <label className="space-y-1">
          <span className="block text-slate-700 font-medium">Elder</span>
          <select
            name="elder_id"
            value={form.elder_id}
            onChange={handleChange}
            required
            className="w-full rounded-md border-slate-300 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select elder</option>
            {elders.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.age})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-slate-700 font-medium">Orphan</span>
          <select
            name="orphan_id"
            value={form.orphan_id}
            onChange={handleChange}
            required
            className="w-full rounded-md border-slate-300 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select orphan</option>
            {orphans.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.age})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-slate-700 font-medium">Date &amp; Time</span>
          <input
            type="datetime-local"
            name="scheduled_at"
            value={form.scheduled_at}
            onChange={handleChange}
            required
            className="w-full rounded-md border-slate-300 focus:ring-primary-500 focus:border-primary-500"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-slate-700 font-medium">Duration (minutes)</span>
          <input
            type="number"
            name="duration_minutes"
            value={form.duration_minutes}
            onChange={handleChange}
            min={15}
            max={180}
            className="w-full rounded-md border-slate-300 focus:ring-primary-500 focus:border-primary-500"
          />
        </label>
        <div className="md:col-span-2 flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-500 disabled:bg-slate-300"
          >
            {loading ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionScheduler;

