import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompletedQuest {
  id: string;
  title: string;
  category: string;
  city: string;
  reward: number;
  xpEarned: number;
  completedAt: string;
  rating: number;
}

interface Guild {
  id: string;
  name: string;
  rank: string;
  memberCount: number;
}

interface Adventurer {
  id: string;
  username: string;
  avatarInitials: string;
  tier: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  reputationScore: number;
  bio: string;
  skills: string[];
  questsCompleted: number;
  totalGoldEarned: number;
  guild: Guild | null;
  memberSince: string;
  recentQuests: CompletedQuest[];
}

interface AdventurerProfileProps {
  userId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: Record<string, { label: string; color: string; bg: string; glow: string }> = {
  novice:     { label: "NOVICE",     color: "#4ade80", bg: "rgba(74,222,128,0.1)",  glow: "rgba(74,222,128,0.15)"  },
  apprentice: { label: "APPRENTICE", color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  glow: "rgba(96,165,250,0.15)"  },
  journeyman: { label: "JOURNEYMAN", color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  glow: "rgba(245,158,11,0.15)"  },
  expert:     { label: "EXPERT",     color: "#f97316", bg: "rgba(249,115,22,0.1)",  glow: "rgba(249,115,22,0.15)"  },
  master:     { label: "MASTER",     color: "#a78bfa", bg: "rgba(167,139,250,0.1)", glow: "rgba(167,139,250,0.15)" },
  legendary:  { label: "LEGENDARY",  color: "#f43f5e", bg: "rgba(244,63,94,0.1)",   glow: "rgba(244,63,94,0.15)"   },
};

const CATEGORY_ICONS: Record<string, string> = {
  yard: "⬡", hauling: "⬟", moving: "⬠", handyman: "⬡",
  cleaning: "⬟", painting: "⬠", pressure: "⬡", other: "◈",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function starsFromScore(score: number): string {
  const filled = Math.round(score / 20);
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function formatGold(amount: number): string {
  return amount >= 1000 ? `$${(amount / 1000).toFixed(1)}k` : `$${amount}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function XPBar({ xp, xpToNext, color }: { xp: number; xpToNext: number; color: string }) {
  const pct = Math.min(100, Math.round((xp / xpToNext) * 100));
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px", color: "#5c5750",
        marginBottom: "6px", letterSpacing: "0.06em",
      }}>
        <span>{xp.toLocaleString()} XP</span>
        <span>{xpToNext.toLocaleString()} XP to next level</span>
      </div>
      <div style={{
        height: "5px",
        background: "rgba(255,255,255,0.06)",
        borderRadius: "3px",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: "3px",
          transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
          boxShadow: `0 0 8px ${color}80`,
        }} />
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "8px",
      padding: "14px 16px",
      textAlign: "center",
    }}>
      <div style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: "22px", fontWeight: 700,
        color: "#f5b942", lineHeight: 1,
        marginBottom: "4px",
      }}>{value}</div>
      <div style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "9px", color: "#5c5750",
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{label}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: "10px", fontWeight: 600,
      letterSpacing: "0.1em", color: "#5c5750",
      textTransform: "uppercase",
      marginBottom: "12px",
      paddingBottom: "8px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>{children}</div>
  );
}

function QuestHistoryCard({ quest }: { quest: CompletedQuest }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "8px",
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
        <span style={{
          fontSize: "16px",
          color: "rgba(255,255,255,0.3)",
          flexShrink: 0,
          lineHeight: 1.3,
        }}>{CATEGORY_ICONS[quest.category] ?? "◈"}</span>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "12px", fontWeight: 600,
          color: "#c9c4bc", lineHeight: 1.4,
        }}>{quest.title}</span>
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "6px",
      }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "14px", fontWeight: 700, color: "#f5b942",
          }}>${quest.reward}</span>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px", color: "#4ade80",
          }}>+{quest.xpEarned} XP</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px", color: "#f5b942",
            letterSpacing: "0.02em",
          }}>{"★".repeat(quest.rating)}{"☆".repeat(5 - quest.rating)}</span>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "10px", color: "#4a4740",
          }}>{formatFullDate(quest.completedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function SkeletonBlock({ h = "16px", w = "100%" }: { h?: string; w?: string }) {
  return (
    <div style={{
      width: w, height: h,
      background: "rgba(255,255,255,0.05)",
      borderRadius: "4px",
      animation: "shimmer 1.6s ease-in-out infinite",
    }} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdventurerProfile({ userId }: AdventurerProfileProps) {
  const [adventurer, setAdventurer] = useState<Adventurer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/users/${userId}`)
      .then(r => { if (!r.ok) throw new Error("Adventurer not found."); return r.json(); })
      .then(data => setAdventurer(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>

      <div style={{
        background: "#0d0c0b",
        minHeight: "100vh",
        fontFamily: "'DM Mono', monospace",
        color: "#c9c4bc",
        padding: "40px 24px",
      }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>

          {/* ── Loading ── */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", marginBottom: "8px" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", animation: "shimmer 1.6s ease-in-out infinite", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", paddingTop: "8px" }}>
                  <SkeletonBlock h="24px" w="40%" />
                  <SkeletonBlock h="14px" w="60%" />
                  <SkeletonBlock h="10px" w="80%" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                {[1,2,3,4].map(i => <SkeletonBlock key={i} h="70px" />)}
              </div>
              <SkeletonBlock h="100px" />
              <SkeletonBlock h="14px" w="50%" />
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1,2,3].map(i => <SkeletonBlock key={i} h="72px" />)}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && !loading && (
            <div style={{
              textAlign: "center", paddingTop: "80px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px", color: "#f43f5e",
            }}>{error}</div>
          )}

          {/* ── Profile content ── */}
          {adventurer && !loading && (() => {
            const tier = TIERS[adventurer.tier] ?? TIERS.novice;
            return (
              <div style={{ animation: "fadeIn 0.35s ease both" }}>

                {/* ── Hero row ── */}
                <div style={{
                  display: "flex", gap: "24px", alignItems: "flex-start",
                  marginBottom: "28px",
                  paddingBottom: "28px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: "80px", height: "80px", borderRadius: "50%",
                    background: tier.bg,
                    border: `2px solid ${tier.color}40`,
                    boxShadow: `0 0 24px ${tier.glow}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "24px", fontWeight: 800, color: tier.color,
                    flexShrink: 0,
                  }}>{adventurer.avatarInitials}</div>

                  {/* Identity */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <h1 style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: "26px", fontWeight: 800,
                        color: "#f5f0e8", margin: 0, lineHeight: 1,
                      }}>{adventurer.username}</h1>
                      <span style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px", fontWeight: 600,
                        letterSpacing: "0.12em",
                        color: tier.color, background: tier.bg,
                        border: `1px solid ${tier.color}33`,
                        borderRadius: "3px", padding: "3px 8px",
                      }}>{tier.label}</span>
                      <span style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "9px", color: "#5c5750",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "3px", padding: "3px 8px",
                      }}>LVL {adventurer.level}</span>
                    </div>

                    {/* Reputation */}
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "13px", color: "#f5b942",
                      marginBottom: "8px", letterSpacing: "0.04em",
                    }}>
                      {starsFromScore(adventurer.reputationScore)}
                      <span style={{ fontSize: "11px", color: "#6b6460", marginLeft: "8px" }}>
                        {adventurer.reputationScore}/100 rep
                      </span>
                    </div>

                    {/* XP bar */}
                    <div style={{ marginBottom: "10px" }}>
                      <XPBar xp={adventurer.xp} xpToNext={adventurer.xpToNextLevel} color={tier.color} />
                    </div>

                    {/* Member since */}
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px", color: "#4a4740",
                    }}>Adventurer since {formatDate(adventurer.memberSince)}</div>
                  </div>
                </div>

                {/* ── Stats grid ── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "28px" }}>
                  <StatCard value={String(adventurer.questsCompleted)} label="Quests done" />
                  <StatCard value={formatGold(adventurer.totalGoldEarned)} label="Gold earned" />
                  <StatCard value={`${adventurer.level}`} label="Level" />
                  <StatCard value={`${adventurer.reputationScore}`} label="Rep score" />
                </div>

                {/* ── Bio ── */}
                {adventurer.bio && (
                  <div style={{ marginBottom: "28px" }}>
                    <SectionLabel>About</SectionLabel>
                    <p style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "13px", color: "#8b8578",
                      lineHeight: 1.8, margin: 0,
                    }}>{adventurer.bio}</p>
                  </div>
                )}

                {/* ── Skills ── */}
                {adventurer.skills?.length > 0 && (
                  <div style={{ marginBottom: "28px" }}>
                    <SectionLabel>Skills</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {adventurer.skills.map(skill => (
                        <span key={skill} style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "11px", color: "#a09a92",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "4px", padding: "6px 12px",
                        }}>{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Guild ── */}
                {adventurer.guild && (
                  <div style={{ marginBottom: "28px" }}>
                    <SectionLabel>Guild</SectionLabel>
                    <div style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      padding: "14px 18px",
                      background: "rgba(167,139,250,0.05)",
                      border: "1px solid rgba(167,139,250,0.15)",
                      borderRadius: "8px",
                    }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "6px",
                        background: "rgba(167,139,250,0.12)",
                        border: "1px solid rgba(167,139,250,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "16px", color: "#a78bfa",
                      }}>⚜</div>
                      <div>
                        <div style={{
                          fontFamily: "'Syne', sans-serif",
                          fontSize: "14px", fontWeight: 700, color: "#c4b5fd",
                          marginBottom: "3px",
                        }}>{adventurer.guild.name}</div>
                        <div style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "10px", color: "#7c6fa0",
                        }}>
                          {adventurer.guild.rank} · {adventurer.guild.memberCount} members
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Recent quests ── */}
                {adventurer.recentQuests?.length > 0 && (
                  <div>
                    <SectionLabel>Recent completed quests</SectionLabel>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {adventurer.recentQuests.map(q => (
                        <QuestHistoryCard key={q.id} quest={q} />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
