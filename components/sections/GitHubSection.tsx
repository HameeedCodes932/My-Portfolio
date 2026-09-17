import { github, profile } from "@/lib/content";
import { loadGithubData } from "@/lib/github";
import { getSectionById } from "@/lib/sections";
import SectionShell from "@/components/ui/SectionShell";
import Reveal from "@/components/ui/Reveal";
import PlaceholderText, {
  isPlaceholder,
} from "@/components/ui/PlaceholderText";

const section = getSectionById("github");

const WEEKS = 52;
const DAYS = 7;

const OPACITIES = [0.06, 0.2, 0.42, 0.68, 1];

function PendingCells() {
  const rows: number[][] = [];
  for (let day = 0; day < DAYS; day += 1) {
    const cells: number[] = [];
    for (let week = 0; week < WEEKS; week += 1) {
      const v = Math.sin(week * 12.9898 + day * 78.233) * 43758.5453;
      cells.push(v - Math.floor(v));
    }
    rows.push(cells);
  }
  return rows;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

export default async function GitHubSection() {
  const data = await loadGithubData(profile.githubUsername);

  const realMetrics = data.publicRepos !== null || data.calendar !== null;
  const metrics = realMetrics
    ? [
        {
          label: "Repositories",
          value:
            data.publicRepos !== null ? String(data.publicRepos) : "[—]",
        },
        {
          label: "Contributions (12 months)",
          value: data.calendar
            ? formatNumber(data.calendar.total)
            : "[—]",
        },
        {
          label: "Current streak",
          value: data.calendar
            ? `${data.calendar.streak} day${data.calendar.streak === 1 ? "" : "s"}`
            : "[—]",
        },
      ]
    : github.metrics;

  const weeks = data.calendar?.weeks ?? null;
  const pinnedRepos =
    data.repos.length > 0
      ? data.repos.map((r) => ({
          name: r.name,
          desc: r.description || "[—]",
          languages: [r.language, r.stars > 0 ? `★ ${r.stars}` : ""]
            .filter(Boolean)
            .join(" · ") || "[—]",
          href: r.url,
        }))
      : github.repos.map((r) => ({
          name: r.name,
          desc: r.desc,
          languages: r.languages,
          href: null as string | null,
        }));

  return (
    <SectionShell
      section={section}
      title="GitHub / Activity"
      lead="The open loop — repositories, rhythm, and reach."
      note={github.note}
    >
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Reveal>
            <p className="caption-mono text-fog">IDENTITY</p>
            <p className="mt-2 font-display text-2xl text-ivory">
              {isPlaceholder(profile.githubUsername) ? (
                <PlaceholderText value={`@${profile.githubUsername}`} />
              ) : (
                <a
                  href={`https://github.com/${profile.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-sweep underline-offset-4"
                >
                  @{profile.githubUsername}
                </a>
              )}
            </p>
          </Reveal>
          <div className="mt-8 space-y-2">
            {metrics.map((metric, i) => (
              <Reveal key={metric.label} delay={i * 50}>
                <div className="flex items-baseline justify-between border-b border-hairline py-3">
                  <span className="caption-mono text-fog">
                    {metric.label}
                  </span>
                  <span className="font-display text-xl italic text-brass">
                    <PlaceholderText value={metric.value} />
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8">
          <Reveal delay={100}>
            <div className="stage-frame aspect-[16/7] w-full p-4 sm:p-8">
              <p className="caption-mono mb-5 text-fog">
                {weeks
                  ? `Contribution calendar — last 12 months${data.calendar?.total != null ? ` · ${formatNumber(data.calendar.total)} contributions` : ""}`
                  : github.heatmapLabel}
              </p>
              <div className="flex flex-col gap-[3px]" aria-hidden="true">
                {(weeks ?? PendingCells()).map((row, day) => (
                  <div key={day} className="flex gap-[3px]">
                    {(weeks
                      ? row
                      : (PendingCells()[day] ?? [])
                    ).map((raw, week) => {
                      const level = weeks
                        ? (raw as number)
                        : raw > 0.55
                          ? 4
                          : 0;
                      const opacity = OPACITIES[level] ?? 0.06;
                      return (
                        <span
                          key={week}
                          className="aspect-square min-w-[2px] flex-1 basis-0"
                          style={{
                            background: `rgba(204, 169, 106, ${opacity})`,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              {!weeks ? (
                <p className="caption-mono mt-5 text-fog">
                  Pending — set GITHUB_TOKEN in .env.local to populate the
                  contribution calendar at build time.
                </p>
              ) : null}
            </div>
          </Reveal>

          <div className="mt-10">
            <Reveal>
              <p className="caption-mono mb-4 text-fog">PINNED REPOSITORIES</p>
            </Reveal>
            {pinnedRepos.map((repo, i) => (
              <Reveal key={i} delay={i * 50}>
                <div className="grid gap-2 border-b border-hairline py-4 sm:grid-cols-2">
                  <span className="font-display text-lg text-ivory italic">
                    {"href" in repo && repo.href ? (
                      <a
                        href={repo.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-sweep underline-offset-4"
                      >
                        {repo.name}
                      </a>
                    ) : (
                      <PlaceholderText value={repo.name} />
                    )}
                  </span>
                  <div className="text-sm">
                    <p className="text-bone italic">
                      <PlaceholderText value={repo.desc} />
                    </p>
                    <p className="mt-1 text-fog">
                      <PlaceholderText value={repo.languages} />
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
