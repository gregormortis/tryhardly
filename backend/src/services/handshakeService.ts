import { prisma } from '../lib/prisma';

// Handshake state transitions that are driven by other parts of the system
// rather than by a direct user action on the handshake itself.
//
// Kept out of the controller deliberately: completionController needs this,
// and a controller importing another controller creates an import cycle that
// leaves route handlers undefined at module load.

/**
 * Mark the live AGREED handshake as honored. Called from completion
 * confirmation rather than exposed as its own endpoint, so "honored" always
 * means the poster actually confirmed the work.
 *
 * Best-effort by design: a job with no handshake simply has nothing to mark,
 * and a failure here must never block completion.
 */
export async function honorHandshakeForQuest(questId: string): Promise<boolean> {
  try {
    const live = await prisma.handshake.findFirst({
      where: { questId, status: 'AGREED' },
      orderBy: { createdAt: 'desc' },
    });
    if (!live) return false;
    await prisma.handshake.update({
      where: { id: live.id },
      data: { status: 'HONORED', honoredAt: new Date() },
    });
    return true;
  } catch (err) {
    console.error('honorHandshakeForQuest error:', err);
    return false;
  }
}
