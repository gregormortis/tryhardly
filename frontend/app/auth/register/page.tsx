'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CLASSES = [
  { value: 'WARRIOR', label: '⚔️ Warrior', desc: 'Developer / Engineer' },
  { value: 'MAGE', label: '🧙 Mage', desc: 'Designer / Creative' },
  { value: 'ROGUE', label: '🗡️ Rogue', desc: 'Writer / Content' },
  { value: 'CLERIC', label: '✨ Cleric', desc: 'Consultant / Coach' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '', adventurerClass: 'WARRIOR' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/questboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-black text-amber-400">⚔️ Tryhardly</Link>
          <h1 className="text-2xl font-bold text-white mt-4">Begin Your Adventure</h1>
          <p className="text-gray-400 mt-1">Create your free adventurer account</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-1.5">Username</label>
                <input type="text" required value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  placeholder="heroname"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-1.5">Display Name</label>
                <input type="text" value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  placeholder="Hero Name"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1.5">Email</label>
              <input type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                placeholder="hero@example.com"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-1.5">Password</label>
              <input type="password" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                placeholder="••••••••"
              />
            </div>

            {/* Class Selector */}
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Choose Your Class</label>
              <div className="grid grid-cols-2 gap-2">
                {CLASSES.map((cls) => (
                  <button
                    key={cls.value} type="button"
                    onClick={() => setForm({ ...form, adventurerClass: cls.value })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      form.adventurerClass === cls.value
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="font-bold text-sm">{cls.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{cls.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 font-black py-3 rounded-lg transition-colors text-lg"
            >
              {loading ? 'Creating account...' : 'Join the Guild 🏰'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already an adventurer?{' '}
            <Link href="/auth/login" className="text-amber-400 hover:text-amber-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
