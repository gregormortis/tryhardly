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
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-subtle">Loading profile...</p>
        </div>
      </div>
    );
  }

  const displayProfile = profile || user;

  const statusColors: Record<string, string> = {
    OPEN: 'text-success',
    COMPLETED: 'text-info',
    IN_PROGRESS: 'text-accent-text',
    CANCELLED: 'text-danger',
    PENDING: 'text-warning',
    ACCEPTED: 'text-success',
    REJECTED: 'text-danger',
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile header */}
        <div className="bg-surface border border-line rounded-xl p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-accent/20 border-2 border-accent/50 rounded-full flex items-center justify-center text-3xl font-bold text-accent-text overflow-hidden">
                {displayProfile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayProfile.avatarUrl} alt={displayProfile.username} className="w-full h-full object-cover" />
                ) : (
                  displayProfile.username?.[0]?.toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-strong">{displayProfile.username}</h1>
                {(displayProfile as any).displayName && (displayProfile as any).displayName !== displayProfile.username && (
                  <div className="text-muted text-sm">{(displayProfile as any).displayName}</div>
                )}
                <div className="text-accent-text font-medium">
                  Level {displayProfile.level} • {guildPathLabel((displayProfile as any).adventurerClass)}
                </div>
                <div className="text-subtle text-sm mt-1">{displayProfile.email}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="text-muted hover:text-accent-text text-sm transition-colors border border-line-strong hover:border-accent px-4 py-2 rounded-lg"
              >
                {editing ? 'Cancel' : '✏️ Edit'}
              </button>
              <button
                onClick={handleLogout}
                className="text-muted hover:text-danger text-sm transition-colors border border-line-strong hover:border-danger px-4 py-2 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Edit form */}
          {editing && (
            <div className="mt-6 pt-6 border-t border-line space-y-4">
              <div>
                <label className="block text-sm font-medium text-body mb-1">Display Name</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={e => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                  placeholder="Your display name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={3}
                  className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent resize-none"
                  placeholder="Tell us about your adventures..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-1">Avatar URL</label>
                <input
                  type="url"
                  value={editForm.avatarUrl}
                  onChange={e => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                  className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-body mb-1">Business name</label>
                  <input
                    type="text"
                    value={editForm.businessName}
                    onChange={e => setEditForm({ ...editForm, businessName: e.target.value })}
                    className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-body mb-1">Service area</label>
                  <input
                    type="text"
                    value={editForm.serviceArea}
                    onChange={e => setEditForm({ ...editForm, serviceArea: e.target.value })}
                    className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                    placeholder="e.g. Redding, CA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-body mb-1">Years experience</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.yearsExperience}
                    onChange={e => setEditForm({ ...editForm, yearsExperience: e.target.value })}
                    className="w-full bg-raised border border-line-strong rounded-lg px-4 py-2.5 text-strong focus:outline-none focus:border-accent"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-body mb-2">Guild Path</label>
                <p className="text-xs text-subtle mb-2">Choose the path that best describes how you like to help.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GUILD_PATHS.map(cls => (
                    <button
                      key={cls.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, adventurerClass: cls.value })}
                      className={`flex h-full flex-col p-3 rounded-lg border text-left transition-colors ${
                        editForm.adventurerClass === cls.value
                          ? 'border-accent bg-accent/10'
                          : 'border-line-strong hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium text-sm">
                        <span className="w-5 shrink-0 text-center">{cls.icon}</span>
                        <span>{cls.label}</span>
                      </div>
                      <div className="text-xs text-subtle">{cls.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-accent hover:bg-accent disabled:opacity-50 text-on-accent font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Bio */}
          {!editing && displayProfile.bio && (
            <p className="mt-6 text-body leading-relaxed">{displayProfile.bio}</p>
          )}

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-raised rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-accent-text">{displayProfile.xp?.toLocaleString() || 0}</div>
              <div className="text-subtle text-xs mt-1">Total points</div>
            </div>
            <div className="bg-raised rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-strong">{(displayProfile as any).totalQuestsCompleted || 0}</div>
              <div className="text-subtle text-xs mt-1">Quests Done</div>
            </div>
            <div className="bg-raised rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-strong">{(displayProfile as any).reputationScore || 0}</div>
              <div className="text-subtle text-xs mt-1">Reputation</div>
            </div>
          </div>

          {/* Guild */}
          {displayProfile.guild && (
            <div className="mt-4">
              <Link href={`/guilds/${displayProfile.guild.id}`} className="inline-flex items-center gap-2 text-sm text-accent-text hover:text-accent-text-hover">
                🛡️ {displayProfile.guild.name} [{displayProfile.guild.tag}]
              </Link>
            </div>
          )}
        </div>

        {/* Direct payment */}
        <div className="bg-surface border border-line rounded-xl p-6">
          <h2 className="font-semibold text-body mb-1">How you get paid</h2>
          <p className="text-sm text-subtle">
            TryHardly does not process payments. Agree on the amount, method, and timing directly
            with the customer before work starts. You keep 100% of what you earn.
          </p>
        </div>

        {/* Professional credentials */}
        <CredentialsManager />

        {/* Worker service packages */}
        <ServicePackagesManager />

        {/* Professionalism: Code of Craft pledge, Verified Pro, proof of work */}
        <ProfessionalismManager userId={displayProfile.id} />

        {/* Applications */}
        <div className="bg-surface border border-line rounded-xl p-6">
          <h2 className="font-semibold text-body mb-4">My Applications ({applications.length})</h2>
          {applications.length === 0 ? (
            <div className="text-center py-8 text-subtle">
              <p>No applications yet.</p>
              <Link href="/jobs" className="text-accent-text hover:text-accent-text-hover mt-2 inline-block">Browse quests</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app: Application) => (
                <Link key={app.id} href={`/job/${app.questId}`}>
                  <div className="flex items-center justify-between p-4 bg-raised rounded-lg hover:bg-raised-2 transition-colors">
                    <div>
                      <h3 className="text-strong font-medium">{app.quest?.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-subtle">
                        <span>${app.quest?.reward?.toLocaleString()}</span>
                        <span>{app.quest?.difficulty}</span>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${statusColors[app.status] || 'text-muted'}`}>
                      {app.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Account & data */}
        <div className="bg-surface border border-line rounded-xl p-6">
          <h2 className="font-semibold text-body mb-1">Account &amp; Data</h2>
          <p className="text-sm text-subtle mb-4">
            Manage or delete your account and personal data.
          </p>
          <Link
            href="/account-deletion"
            className="inline-block text-sm text-muted hover:text-danger transition-colors border border-line-strong hover:border-danger px-4 py-2 rounded-lg"
          >
            Delete account &amp; data
          </Link>
        </div>
      </div>
    </div>
  );
}
