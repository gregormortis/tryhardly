// Guild Path options. These are the human-facing labels for a user's path on
// the platform. The stored `adventurerClass` values are the backend `UserClass`
// enum keys. The original fantasy keys (WARRIOR/MAGE/ROGUE/CLERIC) are kept as
// the persisted values for the relabelled paths so existing accounts keep
// displaying correctly; HAULER and FIXER are stored under their own keys.

export interface GuildPathOption {
  value: string;
  icon: string;
  label: string;
  desc: string;
}

export const GUILD_PATHS: GuildPathOption[] = [
  { value: 'WARRIOR', icon: '🛠️', label: 'Builder', desc: 'Handyman, repairs, construction' },
  { value: 'HAULER', icon: '🚚', label: 'Hauler', desc: 'Moving, hauling, heavy lifting' },
  { value: 'FIXER', icon: '🔧', label: 'Fixer', desc: 'Appliance and equipment repair' },
  { value: 'CLERIC', icon: '🤝', label: 'Helper', desc: 'Coaching, tutoring, advisory' },
  { value: 'MAGE', icon: '🎨', label: 'Craftsperson', desc: 'Design, photography, creative work' },
  { value: 'ROGUE', icon: '🧭', label: 'Scout', desc: 'Errands, delivery, writing' },
];

const PATH_BY_VALUE = new Map(GUILD_PATHS.map(p => [p.value, p]));

// Friendly display labels for any legacy or unknown stored value. Older
// fantasy-style names map to their Guild Path equivalents so existing accounts
// keep displaying without breaking.
const LEGACY_LABELS: Record<string, string> = {
  WARRIOR: 'Builder',
  MAGE: 'Craftsperson',
  ROGUE: 'Scout',
  CLERIC: 'Helper',
  HAULER: 'Hauler',
  FIXER: 'Fixer',
};

export function guildPathLabel(value?: string | null): string {
  if (!value) return 'Member';
  return PATH_BY_VALUE.get(value)?.label ?? LEGACY_LABELS[value] ?? value;
}

export function guildPathIcon(value?: string | null): string {
  if (!value) return '🛡️';
  return PATH_BY_VALUE.get(value)?.icon ?? '🛡️';
}
