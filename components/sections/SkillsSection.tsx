import { skills } from "@/lib/content";
import { getSectionById } from "@/lib/sections";
import SectionShell from "@/components/ui/SectionShell";
import Reveal from "@/components/ui/Reveal";
import PlaceholderText from "@/components/ui/PlaceholderText";

const section = getSectionById("skills");

export default function SkillsSection() {
  return (
    <SectionShell
      section={section}
      title="Skills & Technologies"
      lead="The tools behind the work — grouped, not ranked."
      note={skills.note}
    >
      <div className="grid gap-14 lg:grid-cols-12">
        {/* Left — sticky statement */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-44">
            <Reveal>
              <p className="font-display text-3xl italic leading-snug text-bone sm:text-4xl">
                “Skill is a pile of small, well-spent decisions.”
              </p>
            </Reveal>
            <Reveal delay={80}>
              <p className="mt-6 max-w-sm leading-relaxed text-fog">
                Every entry below is a candidate — none are confirmed. The
                structure ships so content can be dropped in later without
                redesigning the page.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Right — grouped inventory */}
        <div className="lg:col-span-7">
          {skills.groups.map((group, g) => (
            <Reveal key={group.category} delay={g * 60}>
              <div className="border-t border-hairline py-6 last:border-b">
                <div className="grid gap-3 sm:grid-cols-[12rem_1fr] sm:items-center">
                  <span className="caption-mono text-brass">
                    {`0${g + 1} — ${group.category.toUpperCase()}`}
                  </span>
                  <ul className="flex flex-wrap gap-x-3 gap-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="group/item text-sm text-bone transition-colors duration-300 hover:text-ivory motion-reduce:transition-none"
                      >
                        <PlaceholderText value={item} />
                        <span className="ml-3 inline-block text-fog/40 transition-colors duration-300 group-hover/item:text-brass motion-reduce:transition-none">
                          /
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}