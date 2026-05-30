import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
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
      },
    });
  } catch (error) {
    console.error('createNotification error:', error);
  }
}
