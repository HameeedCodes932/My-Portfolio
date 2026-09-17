import { about } from "@/lib/content";
import { getSectionById } from "@/lib/sections";
import SectionShell from "@/components/ui/SectionShell";
import Reveal from "@/components/ui/Reveal";
import Field from "@/components/ui/Field";
import PlaceholderText from "@/components/ui/PlaceholderText";

const section = getSectionById("about");

export default function AboutSection() {
  return (
    <SectionShell
      section={section}
      title="About"
      lead="Who is behind the interface."
      note="Bio details pending where bracketed."
    >
      <div className="grid gap-14 lg:grid-cols-12">
        {/* Left — statement + body */}
        <div className="lg:col-span-7">
          <Reveal>
            <blockquote className="border-l-2 border-brass pl-6">
              <p className="font-display text-2xl italic leading-snug text-ivory sm:text-3xl">
                {about.statement}
              </p>
            </blockquote>
          </Reveal>

          <div className="mt-10 space-y-6">
            {about.paragraphs.map((paragraph, i) => (
              <Reveal key={i} delay={i * 60}>
                <p className="leading-relaxed text-bone">
                  <PlaceholderText value={paragraph} />
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Right — fact sheet */}
        <div className="lg:col-span-5 lg:pl-10">
          <Reveal delay={120}>
            <p className="caption-mono mb-4 text-fog">FACT SHEET — 03</p>
            <div>
              {about.facts.map((fact) => (
                <Field key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}