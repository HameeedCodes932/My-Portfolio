export type SectionId =
  | "home"
  | "projects"
  | "about"
  | "skills"
  | "education"
  | "certifications"
  | "workshops"
  | "experience"
  | "github"
  | "journey"
  | "contact";

export interface Section {
  id: SectionId;
  /** Numbered index label, e.g. "01" */
  index: string;
  /** Short nav label, e.g. "Projects" */
  label: string;
  /** Route path this section lives at, e.g. "/projects" */
  href: string;
  /** One-line descriptive sub for index lists */
  short: string;
}

export const SECTIONS: Section[] = [
  {
    id: "home",
    index: "01",
    label: "Hero",
    href: "/",
    short: "The landing index",
  },
  {
    id: "projects",
    index: "02",
    label: "Projects",
    href: "/projects",
    short: "Selected work — five dossiers",
  },
  {
    id: "about",
    index: "03",
    label: "About",
    href: "/about",
    short: "The person behind the work",
  },
  {
    id: "skills",
    index: "04",
    label: "Skills",
    href: "/skills",
    short: "Skills & technologies",
  },
  {
    id: "education",
    index: "05",
    label: "Education",
    href: "/education",
    short: "Formal study & credentials",
  },
  {
    id: "certifications",
    index: "06",
    label: "Certifications",
    href: "/certifications",
    short: "Certifications & licences",
  },
  {
    id: "workshops",
    index: "07",
    label: "Workshops",
    href: "/workshops",
    short: "Workshops & programs",
  },
  {
    id: "experience",
    index: "08",
    label: "Experience",
    href: "/experience",
    short: "Experience & leadership",
  },
  {
    id: "github",
    index: "09",
    label: "GitHub",
    href: "/github",
    short: "Activity & repositories",
  },
  {
    id: "journey",
    index: "10",
    label: "Journey",
    href: "/journey",
    short: "The story so far",
  },
  {
    id: "contact",
    index: "11",
    label: "Contact",
    href: "/contact",
    short: "Open channels",
  },
];

const byId = new Map(SECTIONS.map((section) => [section.id, section]));
const byHref = new Map(SECTIONS.map((section) => [section.href, section]));

export function getSectionById(id: SectionId): Section {
  const section = byId.get(id);
  if (!section) throw new Error(`Unknown section id: ${id}`);
  return section;
}

export function getSectionByHref(href: string): Section | undefined {
  return byHref.get(href);
}

export const TOTAL_SECTIONS = SECTIONS.length;