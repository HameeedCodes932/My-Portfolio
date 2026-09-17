import { SECTIONS, TOTAL_SECTIONS } from "@/lib/sections";
import { profile } from "@/lib/content";
import ScrollTop from "@/components/ui/ScrollTop";

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="caption-mono text-fog">IDENTITY</p>
            <p className="mt-2 text-sm text-ivory">{profile.name}</p>
            <p className="text-sm text-bone">{profile.role}</p>
            <p className="mt-1 text-sm text-fog">{profile.focus}</p>
          </div>
          <div>
            <p className="caption-mono text-fog">INDEX</p>
            <p className="mt-2 text-sm text-bone">
              {TOTAL_SECTIONS} sections, one experience
            </p>
            <p className="text-sm text-bone">
              {SECTIONS[1]?.label} — {SECTIONS[SECTIONS.length - 1]?.label}
            </p>
          </div>
          <div>
            <p className="caption-mono text-fog">MACHINERY</p>
            <p className="mt-2 text-sm text-bone">
              Next.js · Three.js · React Three Fiber · GSAP
            </p>
            <p className="text-sm text-bone">Tailwind · TypeScript</p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <div>
              <p className="caption-mono text-fog">STATE</p>
              <p className="mt-2 text-sm text-bone">
                © {year} {profile.name}
              </p>
            </div>
            <ScrollTop />
          </div>
        </div>
      </div>
    </footer>
  );
}
