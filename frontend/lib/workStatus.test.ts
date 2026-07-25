import { countActiveQuests, isActiveAssignment, isActivePostedQuest } from './workStatus';

describe('isActivePostedQuest', () => {
  it('counts a posted job only once it has left the public board', () => {
    expect(isActivePostedQuest({ status: 'OPEN' })).toBe(false);
    expect(isActivePostedQuest({ status: 'IN_PROGRESS' })).toBe(true);
    expect(isActivePostedQuest({ status: 'IN_REVIEW' })).toBe(true);
    expect(isActivePostedQuest({ status: 'COMPLETED' })).toBe(false);
    expect(isActivePostedQuest({ status: 'CANCELLED' })).toBe(false);
  });
});

describe('isActiveAssignment', () => {
  it('counts only won bids whose job still has work left', () => {
    expect(
      isActiveAssignment({ status: 'ACCEPTED', quest: { id: 'q1', status: 'IN_PROGRESS' } })
    ).toBe(true);
    expect(
      isActiveAssignment({ status: 'PENDING', quest: { id: 'q1', status: 'IN_PROGRESS' } })
    ).toBe(false);
    expect(
      isActiveAssignment({ status: 'ACCEPTED', quest: { id: 'q1', status: 'COMPLETED' } })
    ).toBe(false);
  });
});

describe('countActiveQuests', () => {
  // The reported bug: a poster whose job was in progress saw 0, because the
  // metric only ever looked at the viewer's own bids.
  it('counts a poster with an in-progress job and no bids of their own', () => {
    expect(countActiveQuests([{ status: 'IN_PROGRESS' }], [])).toBe(1);
  });

  it('spans both sides of the marketplace', () => {
    const posted = [{ status: 'IN_PROGRESS' }, { status: 'OPEN' }, { status: 'COMPLETED' }];
    const applications = [
      { status: 'ACCEPTED', quest: { id: 'q9', status: 'IN_REVIEW' } },
      { status: 'REJECTED', quest: { id: 'q8', status: 'IN_PROGRESS' } },
    ];
    expect(countActiveQuests(posted, applications)).toBe(2);
  });

  it('is zero when nothing is under way', () => {
    expect(countActiveQuests([{ status: 'OPEN' }], [])).toBe(0);
    expect(countActiveQuests([], [])).toBe(0);
  });
});
