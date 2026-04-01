# Gamification Engine — Schema Additions

This document lists Prisma schema fields and models required by the gamification engine that **may not already exist** in `schema.prisma`. Review against the current schema and add any missing pieces.

---

## Existing Fields Used (verify present)

The gamification services depend on these fields already being in the schema:

### `User` model
| Field | Type | Default | Notes |
|---|---|---|---|
| `level` | `Int` | `1` | User's current level |
| `xp` | `Int` | `0` | Total accumulated XP |
| `adventurerClass` | `UserClass` enum | `WARRIOR` | May be named `class` in schema — services use `adventurerClass` |
| `reputationScore` | `Int` | `0` | May be named `reputation` — services use `reputationScore` |
| `totalQuestsCompleted` | `Int` | `0` | May be named `questsCompleted` — services use `totalQuestsCompleted` |
| `questsPosted` | `Int` | `0` | Number of quests the user has posted |
| `guildId` | `String?` | `null` | FK to current guild (used for Team Player achievement) |

### `Quest` model
| Field | Type | Notes |
|---|---|---|
| `difficulty` | `QuestDifficulty` enum | Required |
| `xpReward` | `Int` | XP awarded on completion |
| `deadline` | `DateTime?` | For speed bonus / Speed Runner |
| `completedAt` | `DateTime?` | When quest was completed |
| `questGiverId` | `String` | FK to User (poster) |
| `assignedAdventurerId` | `String?` | FK to User (taker) |
| `reward` | `Decimal` | Budget/payment amount |
| `status` | `QuestStatus` enum | Includes COMPLETED, CANCELLED |
| `category` | `QuestCategory` enum | For Jack of All Trades / Specialist |

### `Application` model
| Field | Type | Notes |
|---|---|---|
| `adventurerId` | `String` | FK to User (applicant) |
| `appliedAt` | `DateTime` | `@default(now())` — when application was submitted |

### `Review` model
| Field | Type | Notes |
|---|---|---|
| `rating` | `Int` | 1-5 star rating |
| `questId` | `String` | FK to Quest |

### `Achievement` model
| Field | Type | Notes |
|---|---|---|
| `name` | `String` | `@unique` — used as lookup key |
| `description` | `String` | |
| `icon` | `String` | Emoji icon |
| `xpReward` | `Int` | Bonus XP awarded on unlock |

### `UserAchievement` model
| Field | Type | Notes |
|---|---|---|
| `userId` | `String` | FK to User |
| `achievementId` | `String` | FK to Achievement |
| `unlockedAt` | `DateTime` | `@default(now())` |
| | | `@@unique([userId, achievementId])` |

### `Notification` model
| Field | Type | Notes |
|---|---|---|
| `userId` | `String` | FK to User |
| `type` | `NotificationType` enum | Must include `ACHIEVEMENT_UNLOCKED`, `LEVEL_UP` |
| `title` | `String` | |
| `message` | `String` | |

---

## Potential Mismatches to Resolve

The existing `schema.prisma` may use different field names than what the controllers and services expect. Known discrepancies:

1. **`User.class`** vs **`User.adventurerClass`** — Controllers use `adventurerClass`. If schema has `class`, add `@map("class")` or rename.
2. **`User.reputation`** vs **`User.reputationScore`** — Controllers use `reputationScore`. Rename or map.
3. **`User.questsCompleted`** vs **`User.totalQuestsCompleted`** — Controllers use `totalQuestsCompleted`.
4. **`Quest.posterId`** vs **`Quest.questGiverId`** — Controllers use `questGiverId`.
5. **`Quest.takerId`** vs **`Quest.assignedAdventurerId`** — Controllers use `assignedAdventurerId`.
6. **`Quest.budget`** vs **`Quest.reward`** — Controllers use `reward`.
7. **`Application.applicantId`** vs **`Application.adventurerId`** — Controllers use `adventurerId`.
8. **`Application.createdAt`** vs **`Application.appliedAt`** — Controllers use `appliedAt`.
9. **`User.avatar`** vs **`User.avatarUrl`** — Controllers use `avatarUrl`.
10. **`User.guildId`** — Not in original schema. Needed for Team Player achievement check.

**Recommendation:** Update `schema.prisma` to match the field names used throughout the controllers and services (the "runtime" names listed above), since those are the names the Prisma client will generate.

---

## Optional Additions (Not Required but Recommended)

### XP Ledger (audit trail)

```prisma
model XPTransaction {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  amount    Int
  reason    String
  createdAt DateTime @default(now())

  @@index([userId])
}
```

This would allow tracking every XP award with a reason (quest completion, achievement bonus, etc.) for auditing and display in a user's activity feed.

### Reputation History

```prisma
model ReputationTransaction {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  questId   String
  quest     Quest    @relation(fields: [questId], references: [id])
  amount    Int
  rating    Int
  createdAt DateTime @default(now())

  @@index([userId])
}
```

Tracks each reputation change with context for transparency.

---

## Enums to Verify

```prisma
enum NotificationType {
  QUEST_APPLICATION
  QUEST_ACCEPTED
  QUEST_COMPLETED
  MILESTONE_COMPLETED
  NEW_MESSAGE
  ACHIEVEMENT_UNLOCKED  // ← Required by gamification
  LEVEL_UP              // ← Required by gamification
}

enum QuestDifficulty {
  NOVICE
  APPRENTICE
  JOURNEYMAN
  EXPERT
  MASTER
  LEGENDARY
}

enum QuestStatus {
  OPEN
  IN_PROGRESS
  IN_REVIEW
  COMPLETED
  CANCELLED
}
```

All appear to be present in the current schema. ✅
