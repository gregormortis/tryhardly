'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface Reviewer {
  id: string;
  username: string;
  avatarUrl?: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer?: Reviewer;
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={className || 'text-amber-400'} aria-label={`${value} out of 5 stars`}>
      {'★'.repeat(value)}
      <span className="text-gray-700">{'★'.repeat(Math.max(0, 5 - value))}</span>
    </span>
  );
}

interface SkillRow {
  skillName: string;
  rating: number;
}

interface QuestReviewsProps {
  questId: string;
  // When the viewer is a participant on a COMPLETED quest, they may leave a review.
  canReview: boolean;
  // When the viewer is the quest giver, they may additionally rate the worker's
  // individual skills (mowing, fencing, hauling, …) to build skill badges.
  canRateSkills?: boolean;
  // Skill name suggestions (e.g. from the quest's tags) to pre-fill the form.
  suggestedSkills?: string[];
}

export default function QuestReviews({ questId, canReview, canRateSkills = false, suggestedSkills = [] }: QuestReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Per-skill ratings. Seed from suggested skills (deduped, non-empty), default 5★.
  const [skills, setSkills] = useState<SkillRow[]>(() => {
    const seen = new Set<string>();
    const rows: SkillRow[] = [];
    for (const s of suggestedSkills) {
      const name = (s || '').trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      rows.push({ skillName: name, rating: 5 });
      if (rows.length >= 6) break;
    }
    return rows;
  });

  const setSkillRating = (idx: number, value: number) =>
    setSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, rating: value } : s)));
  const setSkillName = (idx: number, value: string) =>
    setSkills((prev) => prev.map((s, i) => (i === idx ? { ...s, skillName: value } : s)));
  const removeSkill = (idx: number) => setSkills((prev) => prev.filter((_, i) => i !== idx));
  const addSkill = () =>
    setSkills((prev) => (prev.length >= 6 ? prev : [...prev, { skillName: '', rating: 5 }]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Review[]>(`/quests/${questId}/reviews`);
      setReviews(data);
    } catch {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [questId]);

  useEffect(() => {
    load();
  }, [load]);

  // Hide the review form once the viewer already has a review on this quest.
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Please add a short comment.');
      return;
    }
    setSubmitting(true);
    try {
      const cleanedSkills = canRateSkills
        ? skills
            .map((s) => ({ skillName: s.skillName.trim(), rating: s.rating }))
            .filter((s) => s.skillName.length > 0)
        : [];
      await api.post(`/quests/${questId}/reviews`, {
        rating,
        comment: comment.trim(),
        ...(cleanedSkills.length > 0 ? { skills: cleanedSkills } : {}),
      });
      toast.success('Review submitted. Thanks for the feedback!');
      setComment('');
      setRating(5);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Reviews</h2>

      {canReview && (
        <form onSubmit={submit} className="mb-6 p-4 bg-gray-800/50 border border-gray-800 rounded-lg space-y-3">
          <p className="text-sm text-gray-300">Leave a review for your counterparty</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-2xl leading-none transition-colors ${n <= rating ? 'text-amber-400' : 'text-gray-700 hover:text-gray-500'}`}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="How did it go? Be honest and specific…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500 resize-none"
          />

          {/* Per-skill ratings — only the quest giver rating the worker. These
              build the worker's skill badges (Bronze → Platinum). */}
          {canRateSkills && (
            <div className="pt-2 border-t border-gray-800 space-y-3">
              <div>
                <p className="text-sm text-gray-300">Rate the skills they performed (optional)</p>
                <p className="text-xs text-gray-500">Helps build their skill badges. Leave blank to skip.</p>
              </div>
              {skills.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={s.skillName}
                    onChange={(e) => setSkillName(idx, e.target.value)}
                    maxLength={40}
                    placeholder="e.g. Lawn mowing"
                    className="flex-1 min-w-[8rem] bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSkillRating(idx, n)}
                        className={`text-xl leading-none transition-colors ${n <= s.rating ? 'text-amber-400' : 'text-gray-700 hover:text-gray-500'}`}
                        aria-label={`Rate ${s.skillName || 'skill'} ${n} star${n > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSkill(idx)}
                    className="text-gray-600 hover:text-rose-400 text-sm px-1"
                    aria-label="Remove skill"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {skills.length < 6 && (
                <button
                  type="button"
                  onClick={addSkill}
                  className="text-sm text-amber-400 hover:text-amber-300 font-medium"
                >
                  + Add a skill
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-900 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="border-b border-gray-800 last:border-b-0 pb-4 last:pb-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <Link
                  href={`/profile/${rev.reviewer?.username}`}
                  className="text-sm text-white font-medium hover:text-amber-400"
                >
                  {rev.reviewer?.username || 'Someone'}
                </Link>
                <Stars value={rev.rating} />
              </div>
              <p className="text-sm text-gray-400 whitespace-pre-line">{rev.comment}</p>
              <p className="text-xs text-gray-600 mt-1">{new Date(rev.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
