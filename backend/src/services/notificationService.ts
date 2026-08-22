import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /**
   * Optional in-app destination, as a root-relative path ("/job/<id>").
   * Anything that is not a root-relative path is dropped rather than stored,
   * so a notification can never be turned into an off-site redirect.
   */
  linkUrl?: string;
}

// Only same-origin, root-relative paths are storable. "//evil.example" is a
// protocol-relative absolute URL despite starting with "/", so it is rejected.
function safeLinkUrl(linkUrl: string | undefined): string | null {
  if (typeof linkUrl !== 'string') return null;
  const trimmed = linkUrl.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.length > 500) return null;
  return trimmed;
}

// Fire-and-forget notification creation. Notifications are a non-critical
// side effect — a failure here must never break the primary action (applying,
// accepting, messaging), so callers should not await-throw on it.
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        linkUrl: safeLinkUrl(input.linkUrl),
      },
    });
  } catch (error) {
    console.error('createNotification error:', error);
  }
}
