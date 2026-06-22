'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Application, User } from '@/lib/types';
import CredentialsManager from '@/components/CredentialsManager';
import ServicePackagesManager from '@/components/ServicePackagesManager';
import ProfessionalismManager from '@/components/ProfessionalismManager';
import StripeConnectButton from '@/components/StripeConnectButton';
import { GUILD_PATHS, guildPathLabel } from '@/lib/guildPath';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    avatarUrl: '',
    adventurerClass: '',
    businessName: '',
    serviceArea: '',
    yearsExperience: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) fetchProfile();
  }, [user, authLoading, router]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [profileData, appData] = await Promise.all([
        api.get<User>('/users/me'),
        api.get<Application[]>('/users/me/applications').catch(() => []),
      ]);
      setProfile(profileData);
      setApplications(Array.isArray(appData) ? appData : []);
      setEditForm({
        displayName: profileData.displayName || profileData.username || '',
        bio: profileData.bio || '',
        avatarUrl: profileData.avatarUrl || '',
        adventurerClass: profileData.adventurerClass || 'WARRIOR',
        businessName: profileData.businessName || '',
        serviceArea: profileData.serviceArea || '',
        yearsExperience:
          profileData.yearsExperience != null ? String(profileData.yearsExperience) : '',
      });
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/me', {
        ...editForm,
        yearsExperience: editForm.yearsExperience === '' ? null : Number(editForm.yearsExperience),
      });
      await refreshUser();
      await fetchProfile();
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading adventurer profile...</p>
        </div>
      </div>
    );
  }

  const displayProfile = profile || user;

  const statusColors: Record<string, string> = {
    OPEN: 'text-green-400',
    COMPLETED: 'text-blue-400',
    IN_PROGRESS: 'text-amber-400',
    CANCELLED: 'text-red-400',
    PENDING: 'text-yellow-400',
    ACCEPTED: 'text-green-400',
    REJECTED: 'text-red-400',
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-500/50 rounded-full flex items-center justify-center text-3xl font-bold text-amber-400 overflow-hidden">
                {displayProfile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayProfile.avatarUrl} alt={displayProfile.username} className="w-full h-full object-cover" />
                ) : (
                  displayProfile.username?.[0]?.toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{displayProfile.username}</h1>
                {(displayProfile as any).displayName && (displayProfile as any).displayName !== displayProfile.username && (
                  <div className="text-gray-400 text-sm">{(displayProfile as any).displayName}</div>
                )}
                <div className="text-amber-400 font-medium">
                  Level {displayProfile.level} • {guildPathLabel((displayProfile as any).adventurerClass)}
                </div>
                <div className="text-gray-500 text-sm mt-1">{displayProfile.email}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="text-gray-400 hover:text-amber-400 text-sm transition-colors border border-gray-700 hover:border-amber-500 px-4 py-2 rounded-lg"
              >
                {editing ? 'Cancel' : '✏️ Edit'}
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-400 text-sm transition-colors border border-gray-700 hover:border-red-700 px-4 py-2 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Edit form */}
          {editing && (
            <div className="mt-6 pt-6 border-t border-gray-800 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={e => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                  placeholder="Your display name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500 resize-none"
                  placeholder="Tell us about your adventures..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Avatar URL</label>
                <input
                  type="url"
                  value={editForm.avatarUrl}
                  onChange={e => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Business name</label>
                  <input
                    type="text"
                    value={editForm.businessName}
                    onChange={e => setEditForm({ ...editForm, businessName: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Service area</label>
                  <input
                    type="text"
                    value={editForm.serviceArea}
                    onChange={e => setEditForm({ ...editForm, serviceArea: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Redding, CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Years experience</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.yearsExperience}
                    onChange={e => setEditForm({ ...editForm, yearsExperience: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-amber-500"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Guild Path</label>
                <p className="text-xs text-gray-500 mb-2">Choose the path that best describes how you like to help.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GUILD_PATHS.map(cls => (
                    <button
                      key={cls.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, adventurerClass: cls.value })}
                      className={`flex h-full flex-col p-3 rounded-lg border text-left transition-colors ${
                        editForm.adventurerClass === cls.value
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <span className="w-5 shrink-0 text-center">{cls.icon}</span>
                        <span>{cls.label}</span>
                      </div>
                      <div className="text-xs text-gray-500">{cls.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Bio */}
          {!editing && displayProfile.bio && (
            <p className="mt-6 text-gray-300 leading-relaxed">{displayProfile.bio}</p>
          )}

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{displayProfile.xp?.toLocaleString() || 0}</div>
              <div className="text-gray-500 text-xs mt-1">Total XP</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{(displayProfile as any).totalQuestsCompleted || 0}</div>
              <div className="text-gray-500 text-xs mt-1">Quests Done</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{(displayProfile as any).reputationScore || 0}</div>
              <div className="text-gray-500 text-xs mt-1">Reputation</div>
            </div>
          </div>

          {/* Guild */}
          {displayProfile.guild && (
            <div className="mt-4">
              <Link href={`/guilds/${displayProfile.guild.id}`} className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300">
                🛡️ {displayProfile.guild.name} [{displayProfile.guild.tag}]
              </Link>
            </div>
          )}
        </div>

        {/* Payout account (Stripe Connect) */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-gray-200 mb-1">Payout Account</h2>
          <p className="text-sm text-gray-500 mb-4">
            Set up Stripe Connect to receive payouts for completed quests.
          </p>
          <StripeConnectButton stripeAccountId={(displayProfile as any).stripeAccountId} />
        </div>

        {/* Professional credentials */}
        <CredentialsManager />

        {/* Worker service packages */}
        <ServicePackagesManager />

        {/* Professionalism: Code of Craft pledge, Verified Pro, proof of work */}
        <ProfessionalismManager userId={displayProfile.id} />

        {/* Applications */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-gray-200 mb-4">My Applications ({applications.length})</h2>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No applications yet.</p>
              <Link href="/questboard" className="text-amber-400 hover:text-amber-300 mt-2 inline-block">Browse quests</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: Application) => (
                <Link key={app.id} href={`/questboard/${app.questId}`}>
                  <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
                    <div>
                      <h3 className="text-white font-medium">{app.quest?.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>${app.quest?.reward?.toLocaleString()}</span>
                        <span>{app.quest?.difficulty}</span>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${statusColors[app.status] || 'text-gray-400'}`}>
                      {app.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Account & data */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-gray-200 mb-1">Account &amp; Data</h2>
          <p className="text-sm text-gray-500 mb-4">
            Manage or delete your account and personal data.
          </p>
          <Link
            href="/account-deletion"
            className="inline-block text-sm text-gray-400 hover:text-red-400 transition-colors border border-gray-700 hover:border-red-700 px-4 py-2 rounded-lg"
          >
            Delete account &amp; data
          </Link>
        </div>
      </div>
    </div>
  );
}
