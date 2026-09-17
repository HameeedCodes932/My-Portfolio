import { education } from "@/lib/content";
import { getSectionById } from "@/lib/sections";
import SectionShell from "@/components/ui/SectionShell";
import Reveal from "@/components/ui/Reveal";
import TimelineEntry from "@/components/ui/TimelineEntry";

const section = getSectionById("education");

export default function EducationSection() {
  return (
    <SectionShell
      section={section}
      title="Education"
      lead="Formal study and credentials — presented as an index rather than a sheet of bars."
      note={education.note}
    >
      <div className="mx-auto max-w-3xl">
        {education.entries.map((entry, i) => (
          <Reveal key={i} delay={i * 70}>
            <TimelineEntry
              period={entry.period}
              title={entry.degree}
              org={entry.institution}
              detail={entry.detail}
            />
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}