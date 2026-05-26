import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PostQuestFormProps {
  currentUserId?: string | null;
  onSuccess?: (questId: string) => void;
  onCancel?: () => void;
}

interface FormData {
  // Step 1
  title: string;
  category: string;
  city: string;
  neighborhood: string;
  // Step 2
  description: string;
  reward: string;
  deadline: string;
  xpReward: number;
  // Meta
  payType: "flat" | "hourly";
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "yard",     label: "Lawn & Yard"       },
  { id: "hauling",  label: "Hauling & Junk"    },
  { id: "moving",   label: "Moving Help"       },
  { id: "handyman", label: "Handyman"          },
  { id: "cleaning", label: "Cleaning"         },
  { id: "painting", label: "Painting"         },
  { id: "pressure", label: "Pressure Washing" },
  { id: "other",    label: "Odd Jobs"         },
];

const TIER_MAP: { min: number; max: number; tier: string; color: string }[] = [
  { min: 0,   max: 49,  tier: "Novice",     color: "#4ade80" },
  { min: 50,  max: 99,  tier: "Apprentice", color: "#60a5fa" },
  { min: 100, max: 199, tier: "Journeyman", color: "#f59e0b" },
  { min: 200, max: 499, tier: "Expert",     color: "#f97316" },
  { min: 500, max: 999, tier: "Master",     color: "#a78bfa" },
  { min: 1000, max: Infinity, tier: "Legendary", color: "#f43f5e" },
];

function getTierFromReward(reward: number): { tier: string; color: string } {
  return TIER_MAP.find(t => reward >= t.min && reward <= t.max) ?? TIER_MAP[0];
}

const STEPS = ["Details", "Quest Info", "Review"];
const MIN_DATE = new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]; // 2 days from now

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function validate(step: number, data: FormData): string[] {
  const errors: string[] = [];
  if (step === 1) {
    if (!data.title.trim() || data.title.length < 10) errors.push("Title must be at least 10 characters.");
    if (!data.category) errors.push("Please select a category.");
    if (!data.city.trim()) errors.push("City is required.");
    if (!data.neighborhood.trim()) errors.push("Neighborhood is required.");
  }
  if (step === 2) {
    if (!data.description.trim() || data.description.length < 30) errors.push("Description must be at least 30 characters.");
    const r = parseFloat(data.reward);
    if (!data.reward || isNaN(r) || r < 10) errors.push("Reward must be at least $10.");
    if (!data.deadline) errors.push("Deadline is required.");
  }
  return errors;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "32px" }}>
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < total - 1 ? 1 : undefined }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%",
                background: done
                  ? "#f5b942"
                  : active
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(255,255,255,0.04)",
                border: `1px solid ${done ? "#f5b942" : active ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.1)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px", fontWeight: 600,
                color: done ? "#0d0c0b" : active ? "#f5b942" : "#4a4740",
                transition: "all 0.2s ease",
              }}>
                {done ? "✓" : idx}
              </div>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px", fontWeight: 600,
                letterSpacing: "0.08em",
                color: active ? "#f5b942" : done ? "#8b8578" : "#4a4740",
                whiteSpace: "nowrap",
              }}>{label.toUpperCase()}</span>
            </div>
            {i < total - 1 && (
              <div style={{
                flex: 1, height: "1px",
                background: done ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.06)",
                margin: "0 8px",
                marginBottom: "22px",
                transition: "background 0.2s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{
      display: "block",
      fontFamily: "'DM Mono', monospace",
      fontSize: "10px", fontWeight: 600,
      letterSpacing: "0.1em", color: "#6b6460",
      marginBottom: "8px",
      textTransform: "uppercase",
    }}>
      {children}
      {required && <span style={{ color: "#f43f5e", marginLeft: "4px" }}>*</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: "'DM Mono', monospace",
  fontSize: "13px",
  padding: "11px 14px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "6px",
  color: "#c9c4bc",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease",
};

function TextInput({
  value, onChange, placeholder, maxLength,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={inputStyle}
      onFocus={e => { e.target.style.borderColor = "rgba(245,158,11,0.4)"; }}
      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
    />
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "12px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "10px", fontWeight: 600,
        letterSpacing: "0.08em", color: "#5c5750",
        textTransform: "uppercase",
        flexShrink: 0, marginRight: "16px",
      }}>{label}</span>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "12px", color: "#c9c4bc",
        textAlign: "right",
      }}>{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PostQuestForm({
  currentUserId = null,
  onSuccess,
  onCancel,
}: PostQuestFormProps) {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [data, setData] = useState<FormData>({
    title: "", category: "", city: "", neighborhood: "",
    description: "", reward: "", deadline: "", xpReward: 0,
    payType: "flat",
  });

  // Auth gate
  useEffect(() => {
    if (!currentUserId) {
      window.location.href = `/login?redirect=/post-quest`;
    }
  }, [currentUserId]);

  // Auto-calc XP whenever reward changes
  useEffect(() => {
    const r = parseFloat(data.reward);
    setData(prev => ({ ...prev, xpReward: isNaN(r) ? 0 : Math.round(r * 10) }));
  }, [data.reward]);

  function update(field: keyof FormData, value: string | number) {
    setData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  }

  function handleNext() {
    const errs = validate(step, data);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setErrors([]);
    setStep(s => s - 1);
  }

  async function handleSubmit() {
    const errs = [...validate(1, data), ...validate(2, data)];
    if (errs.length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title.trim(),
          category: data.category,
          city: data.city.trim(),
          neighborhood: data.neighborhood.trim(),
          description: data.description.trim(),
          reward: parseFloat(data.reward),
          payType: data.payType,
          deadline: data.deadline,
          xpReward: data.xpReward,
          postedBy: currentUserId,
        }),
      });
      if (!res.ok) throw new Error("Failed to post quest. Please try again.");
      const quest = await res.json();
      setSubmitted(true);
      onSuccess?.(quest.id);
    } catch (e: any) {
      setErrors([e.message]);
    } finally {
      setSubmitting(false);
    }
  }

  const rewardNum = parseFloat(data.reward) || 0;
  const tierInfo = getTierFromReward(rewardNum);

  // ── Success screen ──
  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "64px 32px" }}>
        <div style={{
          fontSize: "40px", marginBottom: "16px",
          animation: "popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) both",
        }}>⚔</div>
        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "22px", fontWeight: 700,
          color: "#f5f0e8", marginBottom: "8px",
        }}>Quest Posted</h2>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "12px", color: "#6b6460",
          lineHeight: 1.7, marginBottom: "28px",
        }}>
          Your quest is live on the board.<br />Adventurers can start applying now.
        </p>
        <button
          onClick={() => window.location.href = "/quests"}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "12px", fontWeight: 600,
            letterSpacing: "0.08em",
            padding: "12px 28px",
            background: "#f5b942", color: "#0d0c0b",
            border: "none", borderRadius: "6px", cursor: "pointer",
          }}
        >VIEW QUEST BOARD</button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateX(12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        select option { background: #1a1916; color: #c9c4bc; }
        textarea:focus, input:focus, select:focus { outline: none; }
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
        <div style={{ maxWidth: "580px", margin: "0 auto" }}>

          {/* Header */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <h1 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "24px", fontWeight: 800,
                color: "#f5f0e8", margin: 0,
              }}>Post a Quest</h1>
              {onCancel && (
                <button
                  onClick={onCancel}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px", color: "#5c5750",
                    background: "transparent", border: "none",
                    cursor: "pointer", padding: 0,
                  }}
                >Cancel ×</button>
              )}
            </div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#5c5750", margin: 0 }}>
              Describe what you need done. Adventurers in your area will apply.
            </p>
          </div>

          <StepIndicator current={step} total={3} />

          {/* ── Step 1: Basic details ── */}
          {step === 1 && (
            <div style={{ animation: "fadeSlide 0.25s ease both" }}>
              <div style={{ marginBottom: "20px" }}>
                <FieldLabel required>Quest title</FieldLabel>
                <TextInput
                  value={data.title}
                  onChange={v => update("title", v)}
                  placeholder="e.g. Weekly lawn mowing — front & back yard"
                  maxLength={100}
                />
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px", color: "#4a4740",
                  marginTop: "5px", textAlign: "right",
                }}>{data.title.length}/100</div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <FieldLabel required>Category</FieldLabel>
                <select
                  value={data.category}
                  onChange={e => update("category", e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={e => { e.target.style.borderColor = "rgba(245,158,11,0.4)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <FieldLabel required>City</FieldLabel>
                  <TextInput
                    value={data.city}
                    onChange={v => update("city", v)}
                    placeholder="e.g. Rocklin, CA"
                  />
                </div>
                <div>
                  <FieldLabel required>Neighborhood</FieldLabel>
                  <TextInput
                    value={data.neighborhood}
                    onChange={v => update("neighborhood", v)}
                    placeholder="e.g. Whitney Ranch"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Quest info ── */}
          {step === 2 && (
            <div style={{ animation: "fadeSlide 0.25s ease both" }}>
              <div style={{ marginBottom: "20px" }}>
                <FieldLabel required>Description</FieldLabel>
                <textarea
                  value={data.description}
                  onChange={e => update("description", e.target.value)}
                  placeholder="Describe exactly what needs to be done, any special instructions, and what to expect on the job…"
                  rows={5}
                  maxLength={1000}
                  style={{
                    ...inputStyle,
                    resize: "vertical", minHeight: "120px",
                    lineHeight: 1.7,
                  }}
                  onFocus={e => { (e.target as HTMLElement).style.borderColor = "rgba(245,158,11,0.4)"; }}
                  onBlur={e => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.09)"; }}
                />
                <div style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "9px", color: "#4a4740",
                  marginTop: "5px", textAlign: "right",
                }}>{data.description.length}/1000</div>
              </div>

              {/* Pay type toggle */}
              <div style={{ marginBottom: "20px" }}>
                <FieldLabel>Pay type</FieldLabel>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["flat", "hourly"] as const).map(pt => (
                    <button
                      key={pt}
                      onClick={() => update("payType", pt)}
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: "11px", fontWeight: 600,
                        letterSpacing: "0.06em",
                        padding: "8px 20px",
                        borderRadius: "20px",
                        border: `1px solid ${data.payType === pt ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)"}`,
                        background: data.payType === pt ? "rgba(245,158,11,0.1)" : "transparent",
                        color: data.payType === pt ? "#f5b942" : "#6b6460",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {pt === "flat" ? "Flat rate" : "Hourly"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reward */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <FieldLabel required>Reward amount ($)</FieldLabel>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: "14px", top: "50%",
                      transform: "translateY(-50%)",
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "15px", fontWeight: 700,
                      color: rewardNum > 0 ? "#f5b942" : "#3a3730",
                    }}>$</span>
                    <input
                      type="number"
                      value={data.reward}
                      onChange={e => update("reward", e.target.value)}
                      placeholder="0"
                      min="10"
                      step="5"
                      style={{ ...inputStyle, paddingLeft: "28px" }}
                      onFocus={e => { e.target.style.borderColor = "rgba(245,158,11,0.4)"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel>Deadline</FieldLabel>
                  <input
                    type="date"
                    value={data.deadline}
                    min={MIN_DATE}
                    onChange={e => update("deadline", e.target.value)}
                    style={{ ...inputStyle, colorScheme: "dark" }}
                    onFocus={e => { e.target.style.borderColor = "rgba(245,158,11,0.4)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.09)"; }}
                  />
                </div>
              </div>

              {/* XP preview */}
              {rewardNum > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "10px", color: "#5c5750",
                      letterSpacing: "0.08em",
                    }}>XP REWARD (auto-calculated)</span>
                    <span style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "18px", fontWeight: 700, color: "#f5b942",
                    }}>{data.xpReward} XP</span>
                  </div>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px", fontWeight: 600,
                    letterSpacing: "0.1em",
                    color: tierInfo.color,
                    background: `${tierInfo.color}18`,
                    border: `1px solid ${tierInfo.color}33`,
                    borderRadius: "3px", padding: "3px 8px",
                  }}>{tierInfo.tier.toUpperCase()} TIER</span>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div style={{ animation: "fadeSlide 0.25s ease both" }}>
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
                padding: "20px 24px",
                marginBottom: "24px",
              }}>
                <h3 style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "16px", fontWeight: 700,
                  color: "#f5f0e8", margin: "0 0 4px",
                }}>{data.title}</h3>
                <div style={{
                  display: "flex", gap: "8px", flexWrap: "wrap",
                  marginBottom: "16px",
                }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px", fontWeight: 600,
                    letterSpacing: "0.1em",
                    color: tierInfo.color,
                    background: `${tierInfo.color}18`,
                    border: `1px solid ${tierInfo.color}33`,
                    borderRadius: "3px", padding: "2px 8px",
                  }}>{tierInfo.tier.toUpperCase()}</span>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "9px", color: "#6b6460",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "3px", padding: "2px 8px",
                  }}>{CATEGORIES.find(c => c.id === data.category)?.label}</span>
                </div>

                <ReviewRow label="Location" value={`${data.neighborhood}, ${data.city}`} />
                <ReviewRow label="Pay" value={`$${data.reward} ${data.payType === "hourly" ? "/ hour" : "flat"}`} />
                <ReviewRow label="XP reward" value={`${data.xpReward} XP`} />
                <ReviewRow label="Deadline" value={formatDate(data.deadline)} />
                <div style={{ paddingTop: "12px" }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px", fontWeight: 600,
                    letterSpacing: "0.08em", color: "#5c5750",
                    textTransform: "uppercase",
                    display: "block", marginBottom: "8px",
                  }}>Description</span>
                  <p style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "12px", color: "#8b8578",
                    lineHeight: 1.7, margin: 0,
                    whiteSpace: "pre-wrap",
                    maxHeight: "120px",
                    overflowY: "auto",
                  }}>{data.description}</p>
                </div>
              </div>

              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px", color: "#4a4740",
                lineHeight: 1.7, marginBottom: "20px",
              }}>
                By posting, you agree to TryHardly's terms. Payment will be held in escrow and released when you confirm the quest is complete.
              </p>
            </div>
          )}

          {/* ── Errors ── */}
          {errors.length > 0 && (
            <div style={{
              background: "rgba(244,63,94,0.07)",
              border: "1px solid rgba(244,63,94,0.25)",
              borderRadius: "8px", padding: "12px 16px",
              marginBottom: "20px",
            }}>
              {errors.map(e => (
                <div key={e} style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px", color: "#f43f5e",
                  lineHeight: 1.6,
                }}>· {e}</div>
              ))}
            </div>
          )}

          {/* ── Navigation ── */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "space-between" }}>
            {step > 1 ? (
              <button
                onClick={handleBack}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px", fontWeight: 600,
                  letterSpacing: "0.08em",
                  padding: "13px 24px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px", color: "#6b6460",
                  cursor: "pointer",
                }}
              >← BACK</button>
            ) : <div />}

            {step < 3 ? (
              <button
                onClick={handleNext}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px", fontWeight: 600,
                  letterSpacing: "0.08em",
                  padding: "13px 28px",
                  background: "#f5b942", color: "#0d0c0b",
                  border: "none", borderRadius: "6px",
                  cursor: "pointer",
                }}
              >NEXT →</button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "11px", fontWeight: 600,
                  letterSpacing: "0.08em",
                  padding: "13px 28px",
                  background: submitting ? "rgba(245,158,11,0.2)" : "#f5b942",
                  color: submitting ? "#f5b942" : "#0d0c0b",
                  border: submitting ? "1px solid rgba(245,158,11,0.4)" : "none",
                  borderRadius: "6px",
                  cursor: submitting ? "default" : "pointer",
                  transition: "all 0.18s ease",
                }}
              >{submitting ? "POSTING…" : "POST QUEST ⚔"}</button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
