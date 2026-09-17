import { getSectionById } from "@/lib/sections";
import SectionShell from "@/components/ui/SectionShell";
import ProjectLedger from "@/components/projects/ProjectLedger";

const section = getSectionById("projects");

/**
 * Featured Projects — the Ledger of Work. A single interactive case-study
 * browser with LexBot as the flagship; all facts/links remain placeholders.
 */
export default function ProjectsSection() {
  return (
    <SectionShell
      section={section}
      title="The Ledger of Work"
      lead="Five investigations, one ledger. Browse them as cases — LexBot leads, followed by four open dossiers."
      note="Selected AI systems, product builds, and case-study work."
    >
      <ProjectLedger />
    </SectionShell>
  );
}
