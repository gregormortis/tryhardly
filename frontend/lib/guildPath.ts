// Guild Path options. These are the human-facing labels for a user's path on
// the platform. The stored `adventurerClass` values remain the original enum
// keys (WARRIOR/MAGE/ROGUE/CLERIC) for backward compatibility with existing
// accounts and the backend `UserClass` enum.

export interface GuildPathOption {
  value: string;
  icon: string;
  label: string;
  desc: string;
}

export const GUILD_PATHS: GuildPathOption[] = [
  { value: 'WARRIOR', icon: '🛠️', label: 'Builder', desc: 'Handyman, repairs, construction' },
  { value: 'MAGE', icon: '🎨', label: 'Craftsperson', desc: 'Design, photography, creative work' },
  { value: 'ROGUE', icon: '🧭', label: 'Scout', desc: 'Errands, delivery, writing' },
  { value: 'CLERIC', icon: '🤝', label: 'Helper', desc: 'Coaching, tutoring, advisory' },
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
};

export function guildPathLabel(value?: string | null): string {
  if (!value) return 'Member';
  return PATH_BY_VALUE.get(value)?.label ?? LEGACY_LABELS[value] ?? value;
}

export function guildPathIcon(value?: string | null): string {
  if (!value) return '🛡️';
  return PATH_BY_VALUE.get(value)?.icon ?? '🛡️';
}
