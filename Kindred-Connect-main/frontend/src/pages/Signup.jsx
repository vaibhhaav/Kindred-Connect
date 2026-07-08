import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Heart } from 'lucide-react';
import { auth, db } from '../components/firebase.js';
import { login } from '../services/api.js';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const userRef = doc(db, 'users', credential.user.uid);
      const existingUser = await getDoc(userRef);

      if (!existingUser.exists()) {
        await setDoc(userRef, {
          userId: credential.user.uid,
          email: credential.user.email || form.email,
          role: 'admin',
          institutionId: null,
          institutionType: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      try {
        const idToken = await credential.user.getIdToken();
        await login({ idToken, email: form.email });
      } catch (apiErr) {
        await signOut(auth);
        throw apiErr;
      }

      navigate('/dashboard');
    } catch (err) {
      const msg =
        err?.code === 'auth/email-already-in-use'
          ? 'An account already exists for this email. Please sign in instead.'
          : err?.code === 'auth/weak-password'
          ? 'Password should be at least 6 characters.'
          : err?.message || 'Sign up failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-indigo-100 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Create Admin Account</h1>
            <p className="text-sm text-slate-500">Register a new admin account for Kindred Connect.</p>
          </div>
        </div>

        {error && (
          <p className="mb-3 text-xs text-red-600 border border-red-200 bg-red-50 rounded-md px-2 py-1">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <label className="space-y-1 block">
            <span className="block text-slate-700 font-medium">Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="admin@example.com"
            />
          </label>
          <label className="space-y-1 block">
            <span className="block text-slate-700 font-medium">Password</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
            />
          </label>
          <label className="space-y-1 block">
            <span className="block text-slate-700 font-medium">Confirm Password</span>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
