/**
 * Unit tests for escrowService — prisma and stripeService are mocked, so no DB
 * or live Stripe access is required.
 */

const mockPrisma = {
  user: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  quest: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
  milestone: { findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
};

jest.mock('../../app', () => ({ prisma: mockPrisma }));

jest.mock('../stripeService', () => ({
  PLATFORM_FEE_PERCENT: 12,
  createCustomer: jest.fn(),
  createEscrowPayment: jest.fn(),
  capturePayment: jest.fn(),
  releaseMilestonePayment: jest.fn(),
  refundEscrow: jest.fn(),
  cancelPaymentIntent: jest.fn(),
  getPaymentIntent: jest.fn(),
}));

import * as escrowService from '../escrowService';
import * as stripeService from '../stripeService';

describe('escrowService.initializeEscrow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a default full-budget milestone when the quest has none', async () => {
    mockPrisma.quest.findUniqueOrThrow.mockResolvedValue({
      id: 'quest-1',
      reward: 100,
      questGiverId: 'giver-1',
      assignedAdventurerId: 'adv-1',
      assignedAdventurer: { id: 'adv-1', stripeAccountId: 'acct_adv' },
      escrowStatus: 'NONE',
      milestones: [],
    });
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'giver-1',
      email: 'g@example.com',
      stripeCustomerId: 'cus_1',
    });
    (stripeService.createEscrowPayment as jest.Mock).mockResolvedValue({
      id: 'pi_1',
      client_secret: 'cs_1',
    });

    const res = await escrowService.initializeEscrow('quest-1');

    expect(mockPrisma.milestone.create).toHaveBeenCalledTimes(1);
    const created = mockPrisma.milestone.create.mock.calls[0][0].data;
    expect(created.questId).toBe('quest-1');
    expect(created.amount).toBe(100);
    expect(res).toEqual({ paymentIntentId: 'pi_1', clientSecret: 'cs_1' });
  });

  it('does NOT create a default milestone when milestones already exist', async () => {
    mockPrisma.quest.findUniqueOrThrow.mockResolvedValue({
      id: 'quest-2',
      reward: 100,
      questGiverId: 'giver-1',
      assignedAdventurerId: 'adv-1',
      assignedAdventurer: { id: 'adv-1', stripeAccountId: 'acct_adv' },
      escrowStatus: 'NONE',
      milestones: [{ id: 'ms-1', amount: 100, status: 'PENDING' }],
    });
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'giver-1',
      email: 'g@example.com',
      stripeCustomerId: 'cus_1',
    });
    (stripeService.createEscrowPayment as jest.Mock).mockResolvedValue({
      id: 'pi_2',
      client_secret: 'cs_2',
    });

    await escrowService.initializeEscrow('quest-2');

    expect(mockPrisma.milestone.create).not.toHaveBeenCalled();
  });

  it('rejects when escrow is already initialized', async () => {
    mockPrisma.quest.findUniqueOrThrow.mockResolvedValue({
      id: 'quest-3',
      reward: 100,
      questGiverId: 'giver-1',
      assignedAdventurerId: 'adv-1',
      assignedAdventurer: { id: 'adv-1', stripeAccountId: 'acct_adv' },
      escrowStatus: 'FUNDED',
      milestones: [],
    });

    await expect(escrowService.initializeEscrow('quest-3')).rejects.toThrow(
      'already initialized'
    );
  });
});

describe('escrowService.completeQuest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('captures then transfers each unpaid milestone using the charge id', async () => {
    mockPrisma.quest.findUniqueOrThrow.mockResolvedValue({
      id: 'quest-1',
      questGiverId: 'giver-1',
      assignedAdventurerId: 'adv-1',
      paymentIntentId: 'pi_1',
      escrowStatus: 'PENDING',
      milestones: [{ id: 'ms-1', amount: 100, status: 'PENDING' }],
    });
    mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'adv-1',
      stripeAccountId: 'acct_adv',
    });
    (stripeService.getPaymentIntent as jest.Mock).mockResolvedValue({
      id: 'pi_1',
      latest_charge: 'ch_1',
    });
    (stripeService.releaseMilestonePayment as jest.Mock).mockResolvedValue({ id: 'tr_1' });

    const res = await escrowService.completeQuest('quest-1', 'giver-1');

    expect(stripeService.capturePayment).toHaveBeenCalledWith('pi_1');
    expect(stripeService.releaseMilestonePayment).toHaveBeenCalledWith(
      'ms-1',
      10000,
      'acct_adv',
      'ch_1'
    );
    expect(res.status).toBe('RELEASED');
  });

  it('refuses to complete when there are no unpaid milestones (prevents $0 payout)', async () => {
    mockPrisma.quest.findUniqueOrThrow.mockResolvedValue({
      id: 'quest-1',
      questGiverId: 'giver-1',
      assignedAdventurerId: 'adv-1',
      paymentIntentId: 'pi_1',
      escrowStatus: 'FUNDED',
      milestones: [{ id: 'ms-1', amount: 100, status: 'PAID' }],
    });

    await expect(escrowService.completeQuest('quest-1', 'giver-1')).rejects.toThrow(
      'no unpaid milestones'
    );
    expect(stripeService.capturePayment).not.toHaveBeenCalled();
  });

  it('rejects a non quest-giver', async () => {
    mockPrisma.quest.findUniqueOrThrow.mockResolvedValue({
      id: 'quest-1',
      questGiverId: 'giver-1',
      milestones: [],
    });

    await expect(escrowService.completeQuest('quest-1', 'someone-else')).rejects.toThrow(
      'Only the quest giver'
    );
  });
});
