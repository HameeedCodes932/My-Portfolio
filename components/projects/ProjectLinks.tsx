import type { Project } from "@/lib/content";

/**
 * Project action row. Live URLs open new tabs with a sweep underline; missing
 * URL slots render as inert, clearly-marked placeholders.
 */
export default function ProjectLinks({ project }: { project: Project }) {
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {project.links.map((link) =>
        link.href ? (
          <li key={link.kind}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="caption-mono link-sweep text-brass transition-colors hover:text-ivory"
            >
              {link.label} ↗
            </a>
          </li>
        ) : (
          <li
            key={link.kind}
            className="caption-mono italic text-fog"
            title="No URL supplied yet"
          >
            {link.label} — [pending]
          </li>
        )
      )}
    </ul>
  );
}