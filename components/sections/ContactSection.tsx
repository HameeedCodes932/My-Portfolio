import { contact, profile } from "@/lib/content";
import { getSectionById } from "@/lib/sections";
import SectionShell from "@/components/ui/SectionShell";
import Reveal from "@/components/ui/Reveal";
import PlaceholderText from "@/components/ui/PlaceholderText";
import { isPlaceholder } from "@/components/ui/PlaceholderText";

const section = getSectionById("contact");

export default function ContactSection() {
  return (
    <SectionShell
      section={section}
      title="Contact"
      lead={contact.body}
      note="Live channels — email, GitHub, and LinkedIn are active."
    >
      <div className="grid gap-14 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-5">
          <Reveal>
            <p className="font-display text-4xl italic leading-snug text-ivory sm:text-5xl">
              {contact.headline}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10 flex flex-wrap gap-4">
              <span className="caption-mono inline-flex items-center gap-2 rounded-full border border-brass/40 px-4 py-2 text-brass">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brass opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brass" />
                </span>
                <PlaceholderText value={profile.availability} />
              </span>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <a
              href="/assets/Fazal_Hameed_CV.pdf"
              download
              className="caption-mono mt-8 inline-flex items-center gap-3 border-b border-hairline pb-1 text-brass transition-colors hover:border-brass/60 hover:text-ivory"
            >
              DOWNLOAD CV — PDF ↗
            </a>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          {contact.channels.map((channel, i) => (
            <Reveal key={channel.label} delay={i * 50}>
              <div className="group grid grid-cols-[8rem_1fr] items-baseline gap-4 border-t border-hairline py-6 transition-colors duration-300 last:border-b hover:bg-ivory/[0.02] motion-reduce:transition-none sm:grid-cols-[10rem_1fr]">
                <span className="caption-mono text-fog">
                  {channel.label.toUpperCase()}
                </span>
                {channel.href ? (
                  <a
                    href={channel.href}
                    className="link-sweep font-display text-xl text-ivory underline-offset-8 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none sm:text-2xl"
                  >
                    {channel.value} ↗
                  </a>
                ) : (
                  <span className="flex items-center gap-3">
                    <span
                      className={`font-display text-xl transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none sm:text-2xl ${
                        isPlaceholder(channel.value)
                          ? "italic text-fog"
                          : "text-ivory"
                      }`}
                    >
                      {isPlaceholder(channel.value) ? (
                        <PlaceholderText value={channel.value} />
                      ) : (
                        channel.value
                      )}
                    </span>
                    {!isPlaceholder(channel.value) ? (
                      <span aria-hidden="true" className="text-brass opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none">
                        ↗
                      </span>
                    ) : null}
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}