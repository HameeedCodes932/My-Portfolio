/**
 * Server-side GitHub data loader — called once at build time.
 *
 * Uses the unauthenticated GitHub REST API for repositories and an optional
 * tokenless contributions scrape.  When a GITHUB_TOKEN is provided the
 * authenticated GraphQL endpoint is preferred for contribution data.
 *
 * If any fetch fails the error is swallowed and the caller receives null
 * values so the build never breaks on a network blip.
 *
 * .env.example documents exactly how to supply a personal access token
 * with public_repo + read:user scopes.
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export interface GithubRepo {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  updatedAt: string;
  url: string;
}

export interface ContributionCalendar {
  /** 52 weeks; each week is 7 levels (Sun → Sat). */
  weeks: ContributionLevel[][];
  /** Contributions in the last 12 months. */
  total: number;
  /** Streak of consecutive contribution days ending today / yesterday. */
  streak: number;
}

export interface GithubData {
  publicRepos: number | null;
  repos: GithubRepo[];
  calendar: ContributionCalendar | null;
}

interface GhUser {
  public_repos?: number;
}

interface GhRepo {
  fork?: boolean;
  archived?: boolean;
  pushed_at?: string;
  name?: string;
  description?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  html_url?: string;
}

interface GqlContributionDay {
  date: string;
  contributionCount: number;
}

interface GqlWeek {
  contributionDays: GqlContributionDay[];
}

interface GqlContributions {
  totalContributions: number;
  totalCount: number;
  weeks: GqlWeek[];
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const UA: Record<string, string> = {
  "User-Agent": "fazalhameed-portfolio-build",
  Accept: "application/vnd.github+json",
};

const TIMEOUT = { timeout: 8_000 } as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { ...UA, Authorization: `Bearer ${token}` } : UA;
}

function mapLevel(count: number): ContributionLevel {
  if (count <= 0) return 0;
  if (count < 2) return 1;
  if (count < 4) return 2;
  if (count < 8) return 3;
  return 4;
}

function padWeeks(weeks: ContributionLevel[][]): ContributionLevel[][] {
  const trimmed = weeks.filter((w) => w.length > 0).slice(-52);
  while (trimmed.length < 52) trimmed.unshift([0, 0, 0, 0, 0, 0, 0]);
  return trimmed;
}

function streakFromWeeks(weeks: ContributionLevel[][]): number {
  let streak = 0;
  for (let w = weeks.length - 1; w >= 0; w--) {
    const week = weeks[w];
    for (let d = week.length - 1; d >= 0; d--) {
      if (week[d] > 0) {
        streak += 1;
      } else {
        if (w === weeks.length - 1 && d === week.length - 1) continue;
        return streak;
      }
    }
  }
  return streak;
}

/* -------------------------------------------------------------------------- */
/*  REST — user & repos                                                       */
/* -------------------------------------------------------------------------- */

async function fetchUser(
  username: string
): Promise<{ publicRepos: number } | null> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${username}`,
      { headers: authHeaders(), ...TIMEOUT, next: { revalidate: 86400 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as GhUser;
    return { publicRepos: data.public_repos ?? 0 };
  } catch {
    return null;
  }
}

async function fetchRepos(username: string): Promise<GithubRepo[]> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=100`,
      { headers: authHeaders(), ...TIMEOUT, next: { revalidate: 86400 } }
    );
    if (!res.ok) return [];
    const list = (await res.json()) as GhRepo[];
    return list
      .filter((r) => !r.fork && !r.archived)
      .sort(
        (a, b) =>
          new Date(b.pushed_at ?? 0).getTime() -
          new Date(a.pushed_at ?? 0).getTime()
      )
      .slice(0, 6)
      .map((r) => ({
        name: r.name ?? "",
        description: r.description ?? "",
        language: r.language ?? "",
        stars: r.stargazers_count ?? 0,
        forks: r.forks_count ?? 0,
        updatedAt: r.pushed_at ?? "",
        url: r.html_url ?? "",
      }));
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*  Contributions — GraphQL (authenticated)                                   */
/* -------------------------------------------------------------------------- */

const GQL_QUERY = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalContributions
      contributionCalendar {
        totalCount
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

async function fetchContributionsGraphQL(
  username: string
): Promise<ContributionCalendar | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { ...UA, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: GQL_QUERY, variables: { login: username } }),
      ...TIMEOUT,
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      data?: {
        user?: {
          contributionsCollection?: {
            contributionCalendar?: GqlContributions;
          };
        };
      };
    };
    const cal =
      json?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!cal) return null;

    const weeks: ContributionLevel[][] = cal.weeks.map(
      (w) =>
        w.contributionDays.map((d) =>
          mapLevel(d.contributionCount)
        ) as ContributionLevel[]
    );

    return {
      weeks: padWeeks(weeks),
      total: cal.totalCount,
      streak: streakFromWeeks(padWeeks(weeks)),
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Contributions — tokenless scrape                                          */
/* -------------------------------------------------------------------------- */

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return m ? m[1] : null;
}

async function fetchContributionsScrape(
  username: string
): Promise<ContributionCalendar | null> {
  try {
    const res = await fetch(
      `https://github.com/users/${username}/contributions`,
      { headers: UA, ...TIMEOUT }
    );
    if (!res.ok) return null;
    const html = await res.text();

    const totalMatch = html.match(
      /([\d,]+)\s+contributions in the last year/
    );
    const total = totalMatch
      ? parseInt(totalMatch[1].replace(/,/g, ""), 10)
      : 0;

    const rects = (html.match(/<rect[^>]*>/g) ?? []).filter((tag) =>
      attr(tag, "data-date")
    );

    const cols = new Map<number, { day: number; level: number }[]>();
    for (const tag of rects) {
      const x = Number(attr(tag, "x"));
      const y = Number(attr(tag, "y"));
      const level = Number(attr(tag, "data-level") ?? "0");
      if (isNaN(x) || isNaN(y)) continue;
      if (!cols.has(x)) cols.set(x, []);
      cols.get(x)!.push({ day: y, level: level as ContributionLevel });
    }

    const sortedX = [...cols.keys()].sort((a, b) => a - b);
    const weeks: ContributionLevel[][] = [];
    for (const x of sortedX.slice(-52)) {
      const entries = cols.get(x)!.sort((a, b) => a.day - b.day);
      const week: ContributionLevel[] = [0, 0, 0, 0, 0, 0, 0];
      for (const e of entries) {
        const idx = Math.round(e.day / 10);
        if (idx >= 0 && idx < 7) week[idx] = e.level as ContributionLevel;
      }
      weeks.push(week);
    }

    return {
      weeks: padWeeks(weeks),
      total,
      streak: streakFromWeeks(padWeeks(weeks)),
    };
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Public loader                                                             */
/* -------------------------------------------------------------------------- */

export async function loadGithubData(username: string): Promise<GithubData> {
  const [user, repos, calendar] = await Promise.all([
    fetchUser(username),
    fetchRepos(username),
    fetchContributionsGraphQL(username).then((g) =>
      g ?? fetchContributionsScrape(username)
    ),
  ]);

  return {
    publicRepos: user?.publicRepos ?? null,
    repos,
    calendar,
  };
}
