import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestGiver {
  id: string;
  username: string;
  reputationScore: number;
  questsPosted: number;
  avatarInitials: string;
}

interface Quest {
  id: string;
  title: string;
  category: string;
  tier: string;
  city: string;
  neighborhood: string;
  pay: number;
  payType: "flat" | "hourly";
  description: string;
  xpReward: number;
  applicantCount: number;
  deadline: string; // ISO date string
  tools: string[];
  postedBy: QuestGiver;
  status: "open" | "claimed" | "completed";
  createdAt: string;
}

interface QuestDetailModalProps {
  questId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string | null; // null = not logged in
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: Record<string, { label: string; color: string; bg: string }> = {
  novice:     { label: "NOVICE",     color: "#4ade80", bg: "rgba(74,222,128,0.1)"  },
  apprentice: { label: "APPRENTICE", color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  journeyman: { label: "JOURNEYMAN", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  expert:     { label: "EXPERT",     color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
  master:     { label: "MASTER",     color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  legendary:  { label: "LEGENDARY",  color: "#f43f5e", bg: "rgba(244,63,94,0.1)"  },
};

const CATEGORY_LABELS: Record<string, string> = {
  yard:      "Lawn & Yard",
  hauling:   "Hauling & Junk",
  moving:    "Moving Help",
  handyman:  "Handyman",
  cleaning:  "Cleaning",
  painting:  "Painting",
  pressure:  "Pressure Washing",
  other:     "Odd Jobs",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function payDisplay(pay: number, payType: string): string {
  return payType === "hourly" ? `$${pay}/hr` : `$${pay}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: "9px", fontWeight: 600, letterSpacing: "0.12em",
      color, background: bg,
      border: `1px solid ${color}33`,
      borderRadius: "3px", padding: "3px 8px",
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: "3px",
      padding: "14px 20px",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "8px",
      flex: 1,
    }}>
      <span style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: "20px", fontWeight: 700, color: "#f5b942", lineHeight: 1,
      }}>{value}</span>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "10px", color: "#6b6460",
        letterSpacing: "0.06em", textTransform: "uppercase",
      }}>{label}</span>
    </div>
  );
}

function SkeletonLine({ width = "100%", height = "14px" }: { width?: string; height?: string }) {
  return (
    <div style={{
      width, height,
      background: "rgba(255,255,255,0.05)",
      borderRadius: "4px",
      animation: "shimmer 1.6s ease-in-out infinite",
    }} />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuestDetailModal({
  questId,
  isOpen,
  onClose,
  currentUserId = null,
}: QuestDetailModalProps) {
  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => {
        document.body.style.overflow = "";
        setQuest(null);
        setError(null);
        setClaimed(false);
      }, 280);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Fetch quest
  useEffect(() => {
    if (!questId || !isOpen) return;
    setLoading(true);
    setError(null);
    fetch(`/api/quests/${questId}`)
      .then(r => { if (!r.ok) throw new Error("Quest not found"); return r.json(); })
      .then(data => setQuest(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [questId, isOpen]);

  // Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  function handleClaim() {
    if (!currentUserId) {
      window.location.href = `/login?redirect=/quests/${questId}`;
      return;
    }
    setClaiming(true);
    fetch(`/api/quests/${questId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUserId }),
    })
      .then(r => { if (!r.ok) throw new Error("Claim failed"); return r.json(); })
      .then(() => setClaimed(true))
      .catch(e => setError(e.message))
      .finally(() => setClaiming(false));
  }

  if (!isOpen) return null;

  const tier = quest ? (TIERS[quest.tier] ?? TIERS.novice) : null;
  const days = quest ? daysUntil(quest.deadline) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes shimmer {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.28s ease",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 901,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "100%", maxWidth: "720px",
            maxHeight: "92vh",
            background: "#111009",
            border: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "none",
            borderRadius: "16px 16px 0 0",
            display: "flex", flexDirection: "column",
            pointerEvents: "all",
            transform: visible ? "translateY(0)" : "translateY(32px)",
            opacity: visible ? 1 : 0,
            transition: "transform 0.28s cubic-bezier(0.32,0.72,0,1), opacity 0.28s ease",
            overflow: "hidden",
          }}
        >
          {/* Handle */}
          <div style={{
            width: "36px", height: "4px",
            background: "rgba(255,255,255,0.12)",
            borderRadius: "2px",
            margin: "12px auto 0",
            flexShrink: 0,
          }} />

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: "20px", right: "20px",
              width: "32px", height: "32px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "#8b8578", fontSize: "16px",
              cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontFamily: "monospace", lineHeight: 1,
            }}
          >×</button>

          {/* Scrollable body */}
          <div style={{
            overflowY: "auto", flex: 1,
            padding: "24px 32px 32px",
          }}>
            {/* ── Loading state ── */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "8px" }}>
                <SkeletonLine width="60%" height="28px" />
                <div style={{ display: "flex", gap: "8px" }}>
                  <SkeletonLine width="90px" height="22px" />
                  <SkeletonLine width="110px" height="22px" />
                </div>
                <SkeletonLine width="40%" height="14px" />
                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  {[1,2,3,4].map(i => <SkeletonLine key={i} height="60px" />)}
                </div>
                <SkeletonLine height="120px" />
              </div>
            )}

            {/* ── Error state ── */}
            {error && !loading && (
              <div style={{
                textAlign: "center", paddingTop: "48px",
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px", color: "#f43f5e",
              }}>
                {error}
              </div>
            )}

            {/* ── Quest content ── */}
            {quest && !loading && (
              <div style={{ animation: "slideUp 0.3s ease both" }}>

                {/* Title row */}
                <div style={{ marginBottom: "14px", paddingRight: "40px" }}>
                  <h2 style={{
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "22px", fontWeight: 700,
                    color: "#f5f0e8", lineHeight: 1.25,
                    margin: "0 0 10px",
                  }}>{quest.title}</h2>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {tier && <Badge label={tier.label} color={tier.color} bg={tier.bg} />}
                    <Badge
                      label={CATEGORY_LABELS[quest.category] ?? quest.category}
                      color="#c9c4bc"
                      bg="rgba(255,255,255,0.06)"
                    />
                    {quest.status === "open" && (
                      <Badge label="OPEN" color="#4ade80" bg="rgba(74,222,128,0.08)" />
                    )}
                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px", color: "#6b6460",
                    }}>📍 {quest.neighborhood}, {quest.city}</span>
                  </div>
                </div>

                {/* Stats grid */}
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                  <StatBlock value={payDisplay(quest.pay, quest.payType)} label={quest.payType === "hourly" ? "Per hour" : "Flat rate"} />
                  <StatBlock value={`${quest.xpReward} XP`} label="XP reward" />
                  <StatBlock value={`${quest.applicantCount}`} label="Applicants" />
                  <StatBlock value={`${days}d`} label={days <= 3 ? "⚠ Days left" : "Days left"} />
                </div>

                {/* Deadline */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  marginBottom: "20px",
                  fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#6b6460",
                }}>
                  <span style={{ color: days <= 3 ? "#f43f5e" : "#6b6460" }}>
                    Deadline: {formatDeadline(quest.deadline)}
                    {days <= 3 && " — Closing soon"}
                  </span>
                </div>

                {/* Description */}
                <div style={{ marginBottom: "24px" }}>
                  <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px", fontWeight: 600,
                    letterSpacing: "0.1em", color: "#5c5750",
                    marginBottom: "8px",
                  }}>QUEST DESCRIPTION</div>
                  <p style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "13px", color: "#a09a92",
                    lineHeight: 1.8, margin: 0,
                    whiteSpace: "pre-wrap",
                  }}>{quest.description}</p>
                </div>

                {/* Tools required */}
                {quest.tools?.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px", fontWeight: 600,
                      letterSpacing: "0.1em", color: "#5c5750",
                      marginBottom: "8px",
                    }}>TOOLS / REQUIREMENTS</div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {quest.tools.map(t => (
                        <span key={t} style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: "11px", color: "#8b8578",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "4px", padding: "4px 10px",
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quest giver */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "16px 20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "10px",
                  marginBottom: "28px",
                }}>
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "50%",
                    background: "rgba(245,158,11,0.12)",
                    border: "1px solid rgba(245,158,11,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Syne', sans-serif",
                    fontSize: "14px", fontWeight: 700, color: "#f5b942",
                    flexShrink: 0,
                  }}>{quest.postedBy.avatarInitials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "14px", fontWeight: 600, color: "#f5f0e8",
                      marginBottom: "3px",
                    }}>{quest.postedBy.username}</div>
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "11px", color: "#6b6460",
                    }}>
                      {"★".repeat(Math.min(5, Math.round(quest.postedBy.reputationScore / 20)))}
                      {"☆".repeat(Math.max(0, 5 - Math.round(quest.postedBy.reputationScore / 20)))}
                      {" "}· {quest.postedBy.reputationScore}/100 rep · {quest.postedBy.questsPosted} quests posted
                    </div>
                  </div>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px", color: "#5c5750",
                  }}>Quest Giver</span>
                </div>

                {/* CTA */}
                {claimed ? (
                  <div style={{
                    width: "100%", padding: "16px",
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.3)",
                    borderRadius: "8px", textAlign: "center",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "13px", fontWeight: 600,
                    color: "#4ade80", letterSpacing: "0.06em",
                  }}>
                    ✓ QUEST CLAIMED — CHECK YOUR DASHBOARD
                  </div>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    style={{
                      width: "100%", padding: "16px",
                      background: claiming ? "rgba(245,158,11,0.15)" : "#f5b942",
                      border: "none", borderRadius: "8px",
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "13px", fontWeight: 600,
                      letterSpacing: "0.08em",
                      color: claiming ? "#f5b942" : "#0d0c0b",
                      cursor: claiming ? "default" : "pointer",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {claiming
                      ? "CLAIMING…"
                      : currentUserId
                        ? "CLAIM THIS QUEST"
                        : "LOG IN TO CLAIM"}
                  </button>
                )}

                {!currentUserId && (
                  <p style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px", color: "#5c5750",
                    textAlign: "center", marginTop: "10px",
                  }}>
                    You'll be redirected to log in, then returned here.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
