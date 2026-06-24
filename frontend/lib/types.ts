// TypeScript interfaces matching API response shapes

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  adventurerClass?: string;
  role?: string;
  reputationScore?: number;
  totalQuestsCompleted?: number;
  verified?: boolean;
  createdAt?: string;
    stripeAccountId?: string;
  businessName?: string | null;
  serviceArea?: string | null;
  yearsExperience?: number | null;
  codeOfCraftPledgedAt?: string | null;
  guild?: { id: string; name: string; tag: string; badgeUrl?: string } | null;
  achievements?: UserAchievement[];
}

export interface Quest {
  id: string;
  title: string;
  description?: string;
  category: string;
  difficulty: string;
  reward: number;
  currency: string;
  xpReward: number;
  status: string;
  tags: string[];
  deadline?: string | null;
  maxApplications?: number;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
  // Work completion protocol (additive).
  completionNote?: string | null;
  completionProofUrls?: string[];
  completionRequestedAt?: string | null;
  completionConfirmedAt?: string | null;
  changeRequestCount?: number;
  changeRequestNote?: string | null;
  // Recurring booking template (additive). Scheduling/visibility only — no money
  // is charged or held; each occurrence pays out per-task on completion.
  isRecurring?: boolean;
  recurrenceCadence?: RecurrenceCadence | null;
  recurrenceInterval?: number;
  recurrenceEndDate?: string | null;
  recurrenceCount?: number | null;
  nextOccurrenceAt?: string | null;
  recurrenceParentId?: string | null;
  questGiver?: {
    id: string;
    username: string;
    avatarUrl?: string;
    reputationScore?: number;
    level?: number;
  };
  questGiverId?: string;
  assignedAdventurerId?: string | null;
  applications?: Application[];
  milestones?: Milestone[];
  _count?: { applications: number };
}

export type WalkthroughType = 'NONE' | 'REMOTE' | 'IN_PERSON';

// A single line in a worker's itemized material list.
export interface MaterialItem {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  estimatedCost?: number | null;
  notes?: string | null;
}

export interface Application {
  id: string;
  questId: string;
  adventurerId: string;
  coverLetter?: string;
  // Prisma Decimal columns serialize to JSON strings, so these arrive as
  // `string` over the wire (not number). Coerce with Number()/a numeric helper
  // before doing math or comparisons on them.
  proposedRate?: number | string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  appliedAt: string;
  // Detailed bid fields (additive). Present when the worker submitted a full
  // bid rather than just expressing interest.
  bidAmount?: number | string | null;
  materialCostEstimate?: number | string | null;
  laborCostEstimate?: number | string | null;
  estimatedLaborHours?: number | string | null;
  materialItems?: MaterialItem[] | null;
  toolsNeeded?: string | null;
  timeline?: string | null;
  walkthroughRequested?: boolean;
  walkthroughType?: WalkthroughType;
  proposedWalkthroughTimes?: string | null;
  bidNotes?: string | null;
  legalQualificationAck?: boolean;
  quest?: {
    id: string;
    title: string;
    category: string;
    difficulty: string;
    reward: number;
    status: string;
  };
  adventurer?: {
    id: string;
    username: string;
    avatarUrl?: string;
    level: number;
    reputationScore?: number;
    adventurerClass?: string;
  };
}

export interface Guild {
  id: string;
  name: string;
  tag?: string;
  description: string;
  badgeUrl?: string;
  isPublic?: boolean;
  reputationScore?: number;
  createdAt?: string;
  leader?: {
    id: string;
    username: string;
    avatarUrl?: string;
    level?: number;
  };
  leaderId?: string;
  members?: GuildMember[];
  _count?: { members: number };
}

export interface GuildMember {
  id: string;
  guildId: string;
  userId: string;
  role: 'LEADER' | 'OFFICER' | 'MEMBER';
  joinedAt: string;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
    level: number;
    adventurerClass?: string;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  achievement: Achievement;
}

export interface Milestone {
  id: string;
  questId: string;
  title: string;
  description: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'PAID';
  completedAt?: string | null;
}

export interface PaginatedResponse<T> {
  quests?: T[];
  guilds?: T[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardData {
  activeQuests: Quest[];
  postedQuests: Quest[];
  recentActivity: { type: string; description: string; createdAt: string }[];
  stats: { totalEarned: number; questsCompleted: number; applicationsSubmitted: number };
}

export type QuestCategory = 'WEB_DEVELOPMENT' | 'MOBILE_DEV' | 'DESIGN' | 'WRITING' | 'MARKETING' | 'DATA_SCIENCE' | 'OTHER';
export type QuestDifficulty = 'NOVICE' | 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'MASTER' | 'LEGENDARY';
export type QuestStatus = 'OPEN' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
export type RecurrenceCadence = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export type CredentialType =
  | 'LICENSE'
  | 'INSURANCE'
  | 'CERTIFICATION'
  | 'BOND'
  | 'BACKGROUND_CHECK'
  | 'TRADE_MEMBERSHIP'
  | 'OTHER';

export type CredentialStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

// Owner-facing credential shape (GET /users/me/credentials).
export interface ProfessionalCredential {
  id: string;
  type: CredentialType;
  title: string;
  issuer?: string | null;
  credentialNumber?: string | null;
  jurisdiction?: string | null;
  expirationDate?: string | null;
  proofUrl?: string | null;
  notes?: string | null;
  status: CredentialStatus;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Public credential shape (GET /users/:username/credentials) — verified only.
export interface PublicCredential {
  id: string;
  type: CredentialType;
  title: string;
  issuer?: string | null;
  jurisdiction?: string | null;
  expirationDate?: string | null;
  status: CredentialStatus;
  verifiedAt?: string | null;
}

// Code of Craft pledge status (GET/POST /users/me/pledge).
export interface PledgeStatus {
  pledged: boolean;
  pledgedAt?: string | null;
}

// Proof-of-work gallery item. Owner shape includes the `visible` flag; the
// public shape omits it (only visible items are ever returned publicly).
export interface ProofOfWorkItem {
  id: string;
  title: string;
  description?: string | null;
  imageUrls: string[];
  skillTags: string[];
  questId?: string | null;
  quest?: { id: string; title: string } | null;
  visible?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Service packages ─────────────────────────────────────────────────────────
// A repeatable local service listing a worker publishes. A package is a listing
// only — it never charges or holds money; payment happens later in the normal
// job → bid → worker-selection flow.
export type ServicePriceType = 'STARTING_AT' | 'FLAT_RATE' | 'HOURLY' | 'QUOTE_NEEDED';

export interface ServicePackage {
  id: string;
  userId: string;
  title: string;
  category: string;
  description?: string | null;
  priceType: ServicePriceType;
  // Prisma Decimal serializes to a string over the wire; coerce before math.
  startingPrice?: number | string | null;
  currency: string;
  includedScope?: string | null;
  addOns?: string | null;
  exclusions?: string | null;
  materialsPolicy?: string | null;
  serviceArea?: string | null;
  availability?: string | null;
  toolsProvided?: string | null;
  imageUrl?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Present on public (browse / profile / detail) responses.
  user?: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}

// Verified Pro checklist + eligibility (GET /users/:userId/verified-pro).
export interface VerifiedProCheckItem {
  key: string;
  label: string;
  met: boolean;
  detail: string;
}

export interface VerifiedProStatus {
  eligible: boolean;
  metCount: number;
  totalCount: number;
  checklist: VerifiedProCheckItem[];
}

// Worker Passport — a public, real-data trust snapshot (see backend
// workerPassportService). Every figure is derived from the worker's actual
// track record; `available` lets the UI hide signals that can't be shown
// honestly instead of rendering a misleading zero.
export interface PassportStat {
  key: string;
  label: string;
  value: string;
  available: boolean;
}

export interface WorkerPassport {
  memberSince: string;
  completedJobs: number;
  applicationsSubmitted: number;
  activeServicePackages: number;
  repeatCustomers: number;
  ratingCount: number;
  averageRating: number | null;
  codeOfCraftPledged: boolean;
  payoutAccountConnected: boolean;
  verifiedCredentials: number;
  pendingCredentials: number;
  guildPath: string | null;
  stats: PassportStat[];
}
