import { journey } from "@/lib/content";
import { getSectionById } from "@/lib/sections";
import SectionShell from "@/components/ui/SectionShell";
import VrtTimeline from "@/components/ui/VrtTimeline";

const section = getSectionById("journey");

/**
 * My Journey — a narrative rail, not a résumé. The spine draws as you scroll,
 * and the six milestones trace the arc from BSCS to the current applied-AI
 * direction.
 */
export default function JourneySection() {
  return (
    <SectionShell
      section={section}
      title="My Journey"
      lead="From BSCS to applied AI — a rail through the work, told in chapters."
      note={journey.note}
    >
      <VrtTimeline items={journey.milestones} currentLabel="NOW" />
    </SectionShell>
  );
}