import { experience } from "@/lib/content";
import { getSectionById } from "@/lib/sections";
import SectionShell from "@/components/ui/SectionShell";
import Reveal from "@/components/ui/Reveal";
import TimelineEntry from "@/components/ui/TimelineEntry";

const section = getSectionById("experience");

function RoleGroup({
  heading,
  entries,
}: {
  heading: string;
  entries: typeof experience.roles;
}) {
  return (
    <div>
      <Reveal>
        <p className="caption-mono mb-8 text-brass">
          {heading.toUpperCase()}
        </p>
      </Reveal>
      {entries.map((entry, i) => (
        <Reveal key={i} delay={i * 60}>
          <TimelineEntry
            period={entry.period}
            title={entry.role}
            org={entry.org}
            items={entry.highlights}
          />
        </Reveal>
      ))}
    </div>
  );
}

export default function ExperienceSection() {
  return (
    <SectionShell
      section={section}
      title="Experience & Leadership"
      lead="The record of doing — building, leading, shipping."
      note={experience.note}
    >
      <div className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <RoleGroup heading="Experience" entries={experience.roles} />
        </div>
        <div className="lg:col-span-6">
          <RoleGroup heading="Leadership" entries={experience.leadership} />
        </div>
      </div>
    </SectionShell>
  );
}