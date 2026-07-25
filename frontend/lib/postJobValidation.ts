// Field-level validation for the post-a-job flow. Kept out of the form
// component so each rule is unit-testable and so an error can be attached to
// the field that caused it (the form renders issues inline, not just as a list).

export type PostJobField =
  | 'title'
  | 'category'
  | 'areaZip'
  | 'state'
  | 'description'
  | 'reward'
  | 'deadline'
  | 'photoUrl';

export interface PostJobIssue {
  field: PostJobField;
  message: string;
}

export interface PostJobDraft {
  title: string;
  category: string;
  areaZip: string;
  state: string;
  description: string;
  reward: string;
  budgetMode: 'fixed' | 'quote';
  deadline: string;
  photoUrl: string;
}

export const MIN_TITLE_LENGTH = 10;
export const MIN_DESCRIPTION_LENGTH = 30;
export const MIN_BUDGET = 10;

export function isValidPhotoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Location is collected as area code / ZIP only, so accept exactly the two
// shapes a poster can mean: a 3-digit area code or a 5-digit ZIP.
function isValidAreaOrZip(value: string): boolean {
  return /^\d{3}$/.test(value) || /^\d{5}$/.test(value);
}

// `minDeadline` is passed in as a YYYY-MM-DD string so the caller owns "today"
// and tests stay deterministic. ISO dates compare correctly as strings.
export function validatePostJobStep(
  step: number,
  data: PostJobDraft,
  minDeadline: string,
): PostJobIssue[] {
  const issues: PostJobIssue[] = [];

  if (step === 1) {
    if (data.title.trim().length < MIN_TITLE_LENGTH) {
      issues.push({
        field: 'title',
        message: `Add a job title of at least ${MIN_TITLE_LENGTH} characters, like "Mow front and back lawn".`,
      });
    }
    if (!data.category) {
      issues.push({ field: 'category', message: 'Pick the category that best matches the work.' });
    }
    if (!isValidAreaOrZip(data.areaZip.trim())) {
      issues.push({
        field: 'areaZip',
        message: 'Enter a 3-digit area code (916) or a 5-digit ZIP (95677).',
      });
    }
    if (!/^[A-Za-z]{2}$/.test(data.state.trim())) {
      issues.push({ field: 'state', message: 'Use the 2-letter state code, like CA.' });
    }
  }

  if (step === 2) {
    if (data.description.trim().length < MIN_DESCRIPTION_LENGTH) {
      issues.push({
        field: 'description',
        message: `Add at least ${MIN_DESCRIPTION_LENGTH} characters of detail so workers can bid accurately.`,
      });
    }
    // A fixed budget must be a real number. In quote mode the poster doesn't
    // name a price, so we skip the check — workers bid with their own estimate.
    if (data.budgetMode === 'fixed') {
      const amount = parseFloat(data.reward);
      if (!data.reward || isNaN(amount) || amount < MIN_BUDGET) {
        issues.push({
          field: 'reward',
          message: `Enter a budget of at least $${MIN_BUDGET}. Workers bid from this starting point.`,
        });
      }
    }
    if (!data.deadline) {
      issues.push({ field: 'deadline', message: 'Tell us when you need this done.' });
    } else if (data.deadline < minDeadline) {
      issues.push({
        field: 'deadline',
        message: 'Pick a date at least 2 days out so workers have time to bid.',
      });
    }
    if (data.photoUrl.trim() && !isValidPhotoUrl(data.photoUrl.trim())) {
      issues.push({ field: 'photoUrl', message: 'Photo link must start with http:// or https://.' });
    }
  }

  return issues;
}
