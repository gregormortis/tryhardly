-- Add two Guild Path options to the UserClass enum: HAULER and FIXER.
--
-- Fully additive and backward-compatible:
--   * ALTER TYPE ... ADD VALUE only appends new enum members; existing rows and
--     their stored values (WARRIOR/MAGE/ROGUE/CLERIC) are untouched.
--   * No column defaults change, so existing accounts keep their current path.

-- AlterEnum
ALTER TYPE "UserClass" ADD VALUE 'HAULER';
ALTER TYPE "UserClass" ADD VALUE 'FIXER';
