import { useState, useEffect, useRef } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const TIERS = {
  novice:      { label: "NOVICE",      color: "#4ade80", bg: "rgba(74,222,128,0.1)"  },
  apprentice:  { label: "APPRENTICE",  color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  journeyman:  { label: "JOURNEYMAN",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  expert:      { label: "EXPERT",      color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
  master:      { label: "MASTER",      color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  legendary:   { label: "LEGENDARY",   color: "#f43f5e", bg: "rgba(244,63,94,0.1)"   },
};

const CATEGORIES = [
  { id: "all",       label: "All Quests",      icon: "◈" },
  { id: "yard",      label: "Lawn & Yard",      icon: "⬡" },
  { id: "hauling",   label: "Hauling & Junk",   icon: "⬟" },
  { id: "moving",    label: "Moving Help",      icon: "⬠" },
  { id: "handyman",  label: "Handyman",         icon: "⬡" },
  { id: "cleaning",  label: "Cleaning",         icon: "⬟" },
  { id: "painting",  label: "Painting",         icon: "⬠" },
  { id: "pressure",  label: "Pressure Washing", icon: "⬡" },
  { id: "other",     label: "Odd Jobs",         icon: "⬟" },
];

const SORT_OPTIONS = [
  { id: "newest",   label: "Newest first"   },
  { id: "pay_high", label: "Highest pay"    },
  { id: "pay_low",  label: "Lowest pay"     },
  { id: "nearby",   label: "Nearest to me" },
];

const SAMPLE_QUESTS = [
  { id: 1,  category: "yard",     tier: "novice",     title: "Weekly lawn mowing — front & back yard",       neighborhood: "East Rocklin",   city: "Rocklin, CA",        pay: 45,  payType: "flat",    posted: 8,   urgent: false, tools: ["Mower provided"],               postedBy: "Karen R.", jobsPosted: 14 },
  { id: 2,  category: "hauling",  tier: "apprentice", title: "Furniture removal — 2 couches + dresser",      neighborhood: "West Roseville", city: "Roseville, CA",      pay: 120, payType: "flat",    posted: 34,  urgent: true,  tools: ["Truck needed"],                 postedBy: "Mike T.",  jobsPosted: 3  },
  { id: 3,  category: "moving",   tier: "journeyman", title: "1BR apartment move — need 2 people, 4 hrs",   neighborhood: "Oak Park",       city: "Folsom, CA",         pay: 240, payType: "flat",    posted: 71,  urgent: false, tools: ["Dolly helpful"],                postedBy: "Aisha M.", jobsPosted: 7  },
  { id: 4,  category: "yard",     tier: "novice",     title: "Leaf cleanup + bag haul — large yard",         neighborhood: "Whitney Ranch",  city: "Rocklin, CA",        pay: 60,  payType: "flat",    posted: 15,  urgent: false, tools: ["Rake & bags provided"],         postedBy: "Tom H.",   jobsPosted: 22 },
  { id: 5,  category: "handyman", tier: "journeyman", title: "Install ceiling fan, mount TV, fix door",     neighborhood: "Stone Creek",    city: "El Dorado Hills, CA",pay: 35,  payType: "hourly",  posted: 120, urgent: false, tools: ["Basic tools needed"],           postedBy: "Linda S.", jobsPosted: 5  },
  { id: 6,  category: "pressure", tier: "apprentice", title: "Driveway + fence pressure wash",              neighborhood: "South Placer",   city: "Auburn, CA",         pay: 95,  payType: "flat",    posted: 55,  urgent: false, tools: ["Pressure washer provided"],     postedBy: "Dave P.",  jobsPosted: 9  },
  { id: 7,  category: "cleaning", tier: "novice",     title: "Deep clean 3BR house after move-out",         neighborhood: "Natomas",        city: "Sacramento, CA",     pay: 180, payType: "flat",    posted: 200, urgent: true,  tools: ["Supplies provided"],            postedBy: "Jess W.",  jobsPosted: 2  },
  { id: 8,  category: "painting", tier: "journeyman", title: "Paint 2-car garage interior — walls only",   neighborhood: "Lincoln Hills",  city: "Lincoln, CA",        pay: 40,  payType: "hourly",  posted: 180, urgent: false, tools: ["Paint + rollers provided"],     postedBy: "Ray C.",   jobsPosted: 16 },
  { id: 9,  category: "hauling",  tier: "novice",     title: "Yard waste haul — 3 truck loads, weekend",   neighborhood: "Meadow Vista",   city: "Meadow Vista, CA",   pay: 80,  payType: "flat",    posted: 22,  urgent: false, tools: ["Truck needed"],                 postedBy: "Nancy K.", jobsPosted: 4  },
  { id: 10, category: "other",    tier: "expert",     title: "Help set up outdoor event — tables, tents",  neighborhood: "Granite Bay",    city: "Granite Bay, CA",    pay: 45,  payType: "hourly",  posted: 300, urgent: true,  tools: ["Heavy lifting req."],           postedBy: "Chris B.", jobsPosted: 31 },
  { id: 11, category: "yard",     tier: "apprentice", title: "Install 6 raised garden beds + soil fill",   neighborhood: "Cameron Park",   city: "Cameron Park, CA",   pay: 160, payType: "flat",    posted: 90,  urgent: false, tools: ["Beds + soil provided"],         postedBy: "Maria L.", jobsPosted: 8  },
  { id: 12, category: "moving",   tier: "apprentice", title: "Piano move — upright, ground floor only",    neighborhood: "Antelope",       city: "Antelope, CA",       pay: 110, payType: "flat",    posted: 410, urgent: false, tools: ["Piano dolly needed"],           postedBy: "Frank O.", jobsPosted: 1  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(mins) {
  if (mins < 60)  return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
}

function payDisplay(pay, payType) {
  return payType === "hourly" ? `$${pay}/hr` : `$${pay}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TierBadge({ tier }) {
  const t = TIERS[tier];
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: "9px",
      fontWeight: 600,
      letterSpacing: "0.12em",
      color: t.color,
      background: t.bg,
      border: `1px solid ${t.color}33`,
      borderRadius: "3px",
      padding: "2px 7px",
      whiteSpace: "nowrap",
    }}>
      {t.label}
    </span>
  );
}

function UrgentBadge() {
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace",
      fontSize: "9px",
      fontWeight: 600,
      letterSpacing: "0.1em",
      color: "#f43f5e",
      background: "rgba(244,63,94,0.08)",
      border: "1px solid rgba(244,63,94,0.25)",
      borderRadius: "3px",
      padding: "2px 7px",
    }}>
      URGENT
    </span>
  );
}

function QuestCard({ quest, onClaim, isNew }) {
  const [hovered, setHovered] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  function handleClaim(e) {
    e.stopPropagation();
    setClaiming(true);
    setTimeout(() => {
      setClaiming(false);
      setClaimed(true);
      onClaim && onClaim(quest);
    }, 900);
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? "rgba(255,255,255,0.04)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${hovered ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: "8px",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        cursor: "pointer",
        transition: "all 0.18s ease",
        position: "relative",
        animation: isNew ? "slideIn 0.35s ease both" : "none",
        overflow: "hidden",
      }}
    >
      {/* Left accent */}
      <div style={{
        position: "absolute",
        left: 0, top: "20%", bottom: "20%",
        width: "2px",
        background: TIERS[quest.tier].color,
        borderRadius: "2px",
        opacity: hovered ? 1 : 0.4,
        transition: "opacity 0.18s",
      }} />

      {/* Category icon block */}
      <div style={{
        width: "40px", height: "40px",
        borderRadius: "6px",
        background: `${TIERS[quest.tier].color}14`,
        border: `1px solid ${TIERS[quest.tier].color}28`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontSize: "18px",
        color: TIERS[quest.tier].color,
      }}>
        {CATEGORIES.find(c => c.id === quest.category)?.icon || "◈"}
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px", flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
            color: "#f5f0e8",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "340px",
          }}>{quest.title}</span>
          {quest.urgent && <UrgentBadge />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <TierBadge tier={quest.tier} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#8b8578" }}>
            📍 {quest.neighborhood} · {quest.city}
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#5c5750" }}>
            {timeAgo(quest.posted)}
          </span>
          {quest.tools.map(t => (
            <span key={t} style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "#6b6460",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "3px",
              padding: "1px 6px",
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Pay + CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "20px",
            fontWeight: 700,
            color: "#f5b942",
            lineHeight: 1,
          }}>{payDisplay(quest.pay, quest.payType)}</div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "9px",
            color: "#6b6460",
            marginTop: "2px",
            letterSpacing: "0.05em",
          }}>{quest.payType === "hourly" ? "per hour" : "flat rate"}</div>
        </div>

        <button
          onClick={handleClaim}
          disabled={claimed}
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            padding: "8px 16px",
            borderRadius: "5px",
            border: claimed ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(245,158,11,0.5)",
            background: claimed
              ? "rgba(74,222,128,0.08)"
              : claiming
                ? "rgba(245,158,11,0.15)"
                : hovered
                  ? "rgba(245,158,11,0.12)"
                  : "transparent",
            color: claimed ? "#4ade80" : "#f5b942",
            cursor: claimed ? "default" : "pointer",
            transition: "all 0.18s ease",
            whiteSpace: "nowrap",
            minWidth: "108px",
            textAlign: "center",
          }}
        >
          {claimed ? "✓ CLAIMED" : claiming ? "CLAIMING…" : "CLAIM QUEST"}
        </button>
      </div>
    </div>
  );
}

function StatPill({ value, label }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "10px 20px",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: "20px", fontWeight: 700,
        color: "#f5b942",
        lineHeight: 1,
      }}>{value}</span>
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "10px", color: "#6b6460",
        marginTop: "3px", letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}>{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function QuestBoard() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSort, setActiveSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [quests, setQuests] = useState(SAMPLE_QUESTS);
  const [claimedIds, setClaimedIds] = useState([]);
  const [newIds, setNewIds] = useState([]);
  const [liveCount, setLiveCount] = useState(1809);
  const tickRef = useRef(null);

  // Simulate live quest arrivals
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setLiveCount(n => n + Math.floor(Math.random() * 3));
    }, 4000);
    return () => clearInterval(tickRef.current);
  }, []);

  // Filter + sort
  const visible = quests
    .filter(q => {
      if (activeCategory !== "all" && q.category !== activeCategory) return false;
      if (search && !q.title.toLowerCase().includes(search.toLowerCase()) &&
          !q.city.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (activeSort === "newest")   return a.posted - b.posted;
      if (activeSort === "pay_high") return b.pay - a.pay;
      if (activeSort === "pay_low")  return a.pay - b.pay;
      return a.posted - b.posted;
    });

  function handleClaim(quest) {
    setClaimedIds(ids => [...ids, quest.id]);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.7); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .cat-btn { transition: all 0.15s ease; }
        .cat-btn:hover { border-color: rgba(245,158,11,0.4) !important; color: #f5b942 !important; }
      `}</style>

      <div style={{
        background: "#0d0c0b",
        minHeight: "100vh",
        fontFamily: "'DM Mono', monospace",
        color: "#c9c4bc",
      }}>

        {/* ── Header ── */}
        <div style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0 32px",
        }}>
          <div style={{
            maxWidth: "1100px", margin: "0 auto",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "20px", fontWeight: 800,
                color: "#f5f0e8", letterSpacing: "-0.02em",
              }}>TryHardly</span>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px", color: "#f5b942",
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "3px", padding: "2px 8px",
                letterSpacing: "0.1em",
              }}>QUEST BOARD</span>
            </div>

            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#4ade80",
                animation: "pulse-dot 2s ease-in-out infinite",
              }} />
              <span style={{ fontSize: "11px", color: "#6b6460" }}>
                <span style={{ color: "#f5f0e8", fontWeight: 600 }}>{liveCount.toLocaleString()}</span> quests live
              </span>
            </div>

            <button style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px", fontWeight: 600,
              letterSpacing: "0.08em",
              padding: "9px 20px",
              background: "#f5b942",
              color: "#0d0c0b",
              border: "none", borderRadius: "5px",
              cursor: "pointer",
            }}>POST A QUEST</button>
          </div>

          {/* Stats bar */}
          <div style={{
            maxWidth: "1100px", margin: "0 auto",
            display: "flex",
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}>
            <StatPill value="14,280" label="Completed" />
            <StatPill value="4.91★"  label="Avg rating" />
            <StatPill value="3,840"  label="Adventurers" />
            <StatPill value="180+"   label="Cities" />
            <div style={{ flex: 1 }} />
            <div style={{
              display: "flex", alignItems: "center",
              padding: "10px 0",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px", color: "#5c5750",
              letterSpacing: "0.05em",
            }}>
              THE WORK AI CANNOT DO
            </div>
          </div>
        </div>

        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 32px" }}>

          {/* ── Filters row ── */}
          <div style={{
            display: "flex", alignItems: "center",
            gap: "12px", marginBottom: "20px", flexWrap: "wrap",
          }}>
            {/* Search */}
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <span style={{
                position: "absolute", left: "12px", top: "50%",
                transform: "translateY(-50%)",
                fontSize: "13px", color: "#5c5750",
              }}>⌕</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search quests or city..."
                style={{
                  width: "100%",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "12px",
                  padding: "10px 12px 10px 32px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                  color: "#c9c4bc",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Sort */}
            <select
              value={activeSort}
              onChange={e => setActiveSort(e.target.value)}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                padding: "10px 14px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "6px",
                color: "#c9c4bc",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.id} value={s.id} style={{ background: "#1a1916" }}>{s.label}</option>
              ))}
            </select>

            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#5c5750", whiteSpace: "nowrap" }}>
              {visible.length} result{visible.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── Category pills ── */}
          <div style={{
            display: "flex", gap: "6px", marginBottom: "24px",
            overflowX: "auto", paddingBottom: "4px",
          }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  className="cat-btn"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "11px", fontWeight: isActive ? 600 : 400,
                    letterSpacing: "0.04em",
                    padding: "7px 14px",
                    borderRadius: "20px",
                    border: isActive
                      ? "1px solid rgba(245,158,11,0.6)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: isActive
                      ? "rgba(245,158,11,0.1)"
                      : "transparent",
                    color: isActive ? "#f5b942" : "#6b6460",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* ── Quest list ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {visible.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "60px 0",
                fontFamily: "'DM Mono', monospace",
                fontSize: "13px", color: "#4a4740",
              }}>
                No quests found. Try a different category or search term.
              </div>
            ) : (
              visible.map(quest => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  onClaim={handleClaim}
                  isNew={newIds.includes(quest.id)}
                />
              ))
            )}
          </div>

          {/* ── Load more ── */}
          {visible.length > 0 && (
            <div style={{ textAlign: "center", marginTop: "28px" }}>
              <button style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px", fontWeight: 600,
                letterSpacing: "0.08em",
                padding: "11px 28px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "6px",
                color: "#6b6460",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={e => {
                e.target.style.borderColor = "rgba(245,158,11,0.4)";
                e.target.style.color = "#f5b942";
              }}
              onMouseLeave={e => {
                e.target.style.borderColor = "rgba(255,255,255,0.1)";
                e.target.style.color = "#6b6460";
              }}
              >
                LOAD MORE QUESTS
              </button>
            </div>
          )}

          {/* ── Bottom strip ── */}
          <div style={{
            marginTop: "48px",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: "20px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3a3730", letterSpacing: "0.06em" }}>
              © TRYHARDLY.COM · LOCAL WORK · REAL PEOPLE
            </span>
            <div style={{ display: "flex", gap: "20px" }}>
              {["Post a Quest", "Become an Adventurer", "How it Works", "Pricing"].map(link => (
                <span key={link} style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "10px", color: "#4a4740",
                  cursor: "pointer", letterSpacing: "0.04em",
                }}>{link}</span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
