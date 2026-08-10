/**
 * A standing guard against the most expensive mistake this codebase could make.
 *
 * California Penal Code 290.46(j)(2)(H) makes it a PROHIBITED USE to apply sex
 * offender registry information to "benefits, privileges, or services provided
 * by any business establishment". Exposure is treble actual damages, attorney's
 * fees, exemplary damages, a civil penalty up to $25,000, and injunctive relief
 * for a "pattern or practice" of misuse - which is precisely what an automated
 * screening feature would be. The Attorney General, any district attorney, any
 * city attorney, or any aggrieved person may bring it.
 *
 * There is also no lawful technical route: neither meganslaw.ca.gov nor the
 * federal NSOPW publishes an API, and NSOPW's conditions of use expressly bar
 * automated searching.
 *
 * So the rule is absolute: the SERVER never fetches, queries, parses, or stores
 * registry data. The parent is shown the address and a link, and does the check
 * themselves - the statute's authorized use, "to protect a person at risk".
 *
 * This test fails if anyone ever adds a server-side lookup, including with good
 * intentions during an incident.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..', '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') return [];
      return walk(full);
    }
    return full.endsWith('.ts') ? [full] : [];
  });
}

// Hosts the server must never contact.
const FORBIDDEN_HOSTS = ['meganslaw.ca.gov', 'nsopw.gov', 'familywatchdog', 'offenderradar'];

describe('no server-side sex offender registry lookups', () => {
  const files = walk(SRC);

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  // Comments discuss the registry at length on purpose - the reasoning has to
  // live next to the code. Only executable lines are scanned.
  function codeLines(text: string): string[] {
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//') && !l.startsWith('*') && !l.startsWith('/*'));
  }

  it('never fetches a registry host from the server', () => {
    const offenders: string[] = [];
    const FETCHERS = /\b(fetch|axios|got|request|https?\.get|puppeteer|playwright|curl)\b/i;

    for (const file of files) {
      const lines = codeLines(readFileSync(file, 'utf8'));
      for (const line of lines) {
        const host = FORBIDDEN_HOSTS.find((h) => line.toLowerCase().includes(h.toLowerCase()));
        if (!host) continue;

        // youthPolicy.ts legitimately holds the URL as a constant that is handed
        // to the browser for the PARENT to open. That is the design. A host
        // named anywhere else, or on a line that also calls an HTTP client, is a
        // violation.
        const isPolicyConstant =
          file.endsWith(join('config', 'youthPolicy.ts')) &&
          line.includes('CA_REGISTRY_PARENT_URL');

        if (!isPolicyConstant || FETCHERS.test(line)) {
          offenders.push(`${file}: ${line.slice(0, 80)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('stores no registry result anywhere in the schema', () => {
    const schema = readFileSync(join(SRC, '..', 'prisma', 'schema.prisma'), 'utf8').toLowerCase();
    // safetyInfoShownAt records only that the parent was SHOWN the link. A
    // field holding an outcome would mean we acted on registry data.
    for (const banned of [
      'registrymatch',
      'registryresult',
      'offendermatch',
      'issexoffender',
      'registrystatus',
      'registrycheckresult',
    ]) {
      expect(schema).not.toContain(banned);
    }
  });
});
