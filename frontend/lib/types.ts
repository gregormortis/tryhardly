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

export interface Application {
  id: string;
  questId: string;
  adventurerId: string;
  coverLetter?: string;
  proposedRate?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  appliedAt: string;
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
