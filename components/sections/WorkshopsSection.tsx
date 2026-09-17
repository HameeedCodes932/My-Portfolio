import { workshops } from "@/lib/content";
import { getSectionById } from "@/lib/sections";
import SectionShell from "@/components/ui/SectionShell";
import Reveal from "@/components/ui/Reveal";
import TimelineEntry from "@/components/ui/TimelineEntry";

const section = getSectionById("workshops");

export default function WorkshopsSection() {
  return (
    <SectionShell
      section={section}
      title="Workshops & Programs"
      lead="Programs, cohorts, and workshops that shaped the practice."
      note={workshops.note}
    >
      <div className="mx-auto max-w-3xl">
        {workshops.entries.map((entry, i) => (
          <Reveal key={i} delay={i * 70}>
            <TimelineEntry
              period={entry.period}
              title={entry.title}
              org={entry.org}
              detail={entry.detail}
            />
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}