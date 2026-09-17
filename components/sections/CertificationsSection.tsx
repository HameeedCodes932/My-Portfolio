import { certifications } from "@/lib/content";
import { getSectionById } from "@/lib/sections";
import SectionShell from "@/components/ui/SectionShell";
import Reveal from "@/components/ui/Reveal";
import CertArchive from "@/components/certs/CertArchive";

const section = getSectionById("certifications");

export default function CertificationsSection() {
  return (
    <SectionShell
      section={section}
      title="Certifications & Licences"
      lead="The credential archive. Nothing is claimed until the owner supplies the ID, issuer, and year."
      note={certifications.note}
    >
      <Reveal>
        <CertArchive />
      </Reveal>
    </SectionShell>
  );
}