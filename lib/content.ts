/**
 * Single source of truth for portfolio content.
 *
 * PLACEHOLDER POLICY: anything not confirmed by the project owner is written
 * as `[text — pending]`. Bracketed values render dimmed + italic across the UI
 * so every "to be filled" spot is visually obvious. Never guess figures,
 * dates, IDs, URLs, employers or achievements.
 *
 * Fill a value in and the whole site updates — one place, no component edits.
 */

export const profile = {
  name: "Fazal Hameed",
  role: "Software Developer",
  focus: "AI-driven products — conversational systems in particular",
  heroLine: "Software Developer, building AI-driven products.",
  email: "fazlihameed932@gmail.com",
  location: "Swat District, Khyber Pakhtunkhwa, Pakistan",
  githubUsername: "HameeedCodes932",
  availability:
    "Open to opportunities in AI/ML, software development, and intelligent automation.",
  intro:
    "I’m a Software Developer focused on building AI-driven products, intelligent automation, and conversational systems. I work across AI/ML, RAG, LLM applications, computer vision, and modern web technologies to turn practical problems into usable software.",
};

export const about = {
  statement:
    "A developer who cares about the feeling of software as much as its function — how it enters a room, how it answers, how it moves.",
  paragraphs: [
    "Fazal Hameed is a software developer focused on AI-driven products. He builds retrieval-augmented and conversational AI systems, works with computer vision and machine-learning workflows, and builds full-stack applications around AI systems — turning practical problems into usable software.",
    "His work sits between engineering and presentation: clear interfaces, useful AI behavior, and systems that feel deliberate from the first interaction to the final handoff.",
  ],
  facts: [
    { label: "Name", value: profile.name },
    { label: "Role", value: profile.role },
    { label: "Focus", value: profile.focus },
    { label: "Based", value: profile.location },
    { label: "Currently", value: profile.availability },
  ],
};

export interface ProjectLink {
  kind: "github" | "live" | "docs";
  label: string;
  /** null => no real URL yet, link renders as an inert placeholder */
  href: string | null;
}

export interface Project {
  numeral: string;
  name: string;
  classification: string;
  category: string;
  oneLiner: string;
  status: string;
  problem: string;
  solution: string;
  stack: string[];
  highlights: string[];
  links: ProjectLink[];
}

export const lexbot: Project = {
  numeral: "01",
  name: "LexBot",
  classification: "AI / RAG / Conversational AI",
  category: "Conversational AI",
  oneLiner:
    "A multi-tenant retrieval-augmented conversational agent for automated legal document analysis and workflow automation in law firms.",
  status: "In development",
  problem:
    "Legal professionals often need to search, compare, interpret, and work with large collections of legal documents, making document analysis and retrieval time-consuming and difficult to manage efficiently.",
  solution:
    "LexBot combines retrieval-augmented generation with conversational AI to let users upload and work with legal documents, retrieve relevant clauses and information, compare content, and interact with an intelligent document-focused agent.",
  stack: [
    "Python",
    "FastAPI",
    "React / Vite",
    "LangChain",
    "Groq",
    "ChromaDB",
    "PostgreSQL",
    "Supabase",
    "pgvector",
  ],
  highlights: [
    "Legal document upload and analysis",
    "Retrieval-augmented conversational question answering",
    "Clause search and document library",
    "Clause comparison",
    "AI agent for legal-document workflows",
    "Multi-tenant organization architecture",
    "Conversational memory",
    "PostgreSQL / pgvector-based retrieval in the newer architecture",
    "Billing architecture",
  ],
  links: [
    {
      kind: "github",
      label: "Repository",
      href: "https://github.com/HameeedCodes932/LexBot",
    },
    { kind: "live", label: "Live deployment", href: null },
    { kind: "docs", label: "Documentation", href: null },
  ],
};

export const otherProjects: Project[] = [
  {
    numeral: "02",
    name: "ZYRA",
    classification: "Investigation",
    category: "Computer Vision / AI Monitoring",
    oneLiner:
      "An AI-assisted examination monitoring system designed to detect suspicious or prohibited activities during online or computer-based examinations.",
    status: "Academic project / prototype",
    problem:
      "Monitoring many students simultaneously during examinations is difficult for human invigilators, especially when students are distributed across multiple webcams or IP-camera feeds.",
    solution:
      "ZYRA uses computer vision and pose-based analysis to monitor multiple student feeds and identify potentially suspicious behaviors such as phone usage, unusual movement, gaze changes, or other predefined examination violations.",
    stack: [
      "Python",
      "YOLOv8 / YOLOv11",
      "Computer Vision",
      "Roboflow",
      "Google Colab",
      "Pose estimation",
      "17-keypoint human pose analysis",
    ],
    highlights: [
      "Multi-student webcam/IP-camera monitoring",
      "Human detection",
      "Pose/keypoint analysis",
      "Gaze and movement analysis",
      "Phone detection",
      "Suspicious-activity alerts",
      "Designed for monitoring up to approximately 40 students",
    ],
    links: [
      {
        kind: "github",
        label: "Repository",
        href: "https://github.com/HameeedCodes932/Zyra",
      },
      { kind: "live", label: "Live deployment", href: null },
    ],
  },
  {
    numeral: "03",
    name: "OmniLayer AI",
    classification: "Investigation",
    category: "AI Developer Tool / Intelligent Interface",
    oneLiner:
      "An AI-powered Chrome extension that acts as a universal interface layer for interacting with web content and external services through intelligent AI workflows.",
    status: "Prototype / development",
    problem:
      "Users often need to manually move information between websites, tools, APIs, and AI systems, creating repetitive workflows and fragmented interactions.",
    solution:
      "OmniLayer AI provides an AI-driven interface layer that connects web interactions with backend services and external integrations, enabling more flexible AI-assisted workflows.",
    stack: [
      "JavaScript",
      "Chrome Extension APIs",
      "Python",
      "FastAPI",
      "Groq",
      "GitHub integrations",
      "YouTube integrations",
      "Generic plugin/integration architecture",
    ],
    highlights: [
      "Chrome extension interface",
      "AI-assisted interaction layer",
      "FastAPI backend",
      "GitHub integration",
      "YouTube integration",
      "Generic plugin architecture",
      "Groq-powered AI workflows",
    ],
    links: [
      { kind: "github", label: "Repository", href: null },
      { kind: "docs", label: "Documentation", href: null },
    ],
  },
  {
    numeral: "04",
    name: "Restaurant Chatbot",
    classification: "Investigation",
    category: "Conversational AI",
    oneLiner:
      "A conversational AI system designed to help users interact with restaurant information and services through natural-language conversations.",
    status: "Prototype / academic project",
    problem:
      "Customers often need to navigate menus and restaurant information manually instead of being able to ask questions naturally.",
    solution:
      "A conversational interface allows users to interact with restaurant information using natural language rather than relying entirely on traditional menus or navigation.",
    stack: ["Python", "Conversational AI", "NLP"],
    highlights: [
      "Natural-language interaction",
      "Restaurant information queries",
      "Conversational interface",
      "AI-assisted user interaction",
    ],
    links: [{ kind: "github", label: "Repository", href: null }],
  },
  {
    numeral: "05",
    name: "Food / Ration Redistribution Platform",
    classification: "Investigation",
    category: "Social Impact / Platform",
    oneLiner:
      "A digital platform concept designed to help redistribute available food and ration resources to people or communities that need them.",
    status: "Prototype / academic project",
    problem:
      "Usable food and ration resources can remain disconnected from people and communities who need them.",
    solution:
      "The platform aims to connect available food/ration resources with recipients through a structured digital platform.",
    stack: ["[stack — pending]"],
    highlights: [
      "Food/ration resource listing",
      "Resource redistribution concept",
      "Recipient/provider connection",
      "Social-impact focused platform",
    ],
    links: [
      { kind: "github", label: "Repository", href: null },
      { kind: "live", label: "Live deployment", href: null },
    ],
  },
];

export const skills = {
  note: "Skills inventory — confirmed for the current practice.",
  groups: [
    {
      category: "Languages",
      items: ["Python", "JavaScript", "PHP", "C++", "C", "HTML", "CSS", "Java"],
    },
    {
      category: "AI / ML",
      items: [
        "Machine Learning",
        "Deep Learning",
        "Natural Language Processing",
        "Computer Vision",
        "Neural Networks",
        "RAG",
        "LLM Applications",
        "AI Agents",
        "YOLO",
      ],
    },
    {
      category: "Frameworks & Libraries",
      items: [
        "FastAPI",
        "React",
        "Node.js",
        "Express",
        "LangChain",
        "scikit-learn",
        "Pandas",
        "NumPy",
      ],
    },
    {
      category: "Databases & Retrieval",
      items: ["PostgreSQL", "Supabase", "ChromaDB", "pgvector"],
    },
    {
      category: "Tools & Platforms",
      items: ["Git", "GitHub", "Docker", "VS Code", "Azure AI", "XAMPP", "Linux"],
    },
  ],
};

export const education = {
  note: "Education — confirmed, completed degree.",
  entries: [
    {
      period: "October 2022 — August 2026",
      degree: "BS Computer Science",
      institution: "Government Degree College Thana, affiliated with University of Malakand",
      detail:
        "Started the BS Computer Science journey in October 2022, studying core computing subjects including C++, data structures, mathematics and software fundamentals. The later part of the degree developed into a focused AI/ML journey.",
    },
  ],
};

export interface Certification {
  code: string;
  title: string;
  issuer: string;
  year: string;
  detail?: string;
  /** Public verification URL when the issuing system provides one. */
  verify?: string;
}

export const certifications: {
  note: string;
  entries: Certification[];
} = {
  note:
    "Two programs fully confirmed; additional programmes pending exact certificate titles, IDs, and issuer wording.",
  entries: [
    {
      code: "[ID — pending]",
      title: "NAVTTC AI–ML–DL Training (PM Hunarmand Pakistan)",
      issuer: "AI SkillBridge Center, Islamabad",
      year: "2026",
      detail:
        "NAVTTC-sponsored AI course at AI SkillBridge Center, Islamabad. 3 months — approximately February to May 2026. Areas: Python / OOP, NumPy, Pandas, data visualization, statistics, linear and logistic regression, decision trees, SVM, ANN, CNN (CIFAR-10), RNN / LSTM, NLP, and Azure AI.",
    },
    {
      code: "ACTAI-C1-2026-01456-G8HZ",
      title: "ACT AI — National AI Training Programme",
      issuer: "AI SkillBridge",
      year: "2026",
      detail:
        "Cycle 1, completed 8 June — 29 July 2026. An 8-week national programme run by AI SkillBridge, under the Higher Education Commission (HEC), NAVTTC, and the Prime Minister’s Youth Programme, at HEC Central Studio, Islamabad. Covered AI Foundations, Generative AI, Agentic AI, AI Tools & Productivity, and Freelancing with AI. Successfully completed all programme requirements including attendance, a nationally proctored midterm, final assessment, and the Final Course Project. Issue date: 29 July 2026. Certificate: Certificate of Completion.",
      verify: "https://actai.aiskillbridge.pk/verify",
    },
    {
      code: "[ID — pending]",
      title: "Additional programmes — titles pending",
      issuer: "[Issuer — pending]",
      year: "[Year — pending]",
      detail:
        "Climate Change / British Council / Education Above All work, Youth Empowerment (EU / SPADO), and Conflict Resolution programmes. Exact certificate titles, issuer wording, years, and IDs pending.",
    },
  ],
};

export const workshops = {
  note: "Workshops and programs.",
  entries: [
    {
      period: "2026",
      title: "NAVTTC AI–ML–DL Training",
      org: "AI SkillBridge / NAVTTC PM Hunarmand Pakistan",
      detail:
        "Intensive practical training covering Python, data analysis, classical machine learning, deep learning, NLP, computer vision, and Azure AI.",
    },
    {
      period: "8 June — 29 July 2026",
      title: "ACT AI — National AI Training Programme",
      org: "AI SkillBridge / HEC + NAVTTC",
      detail:
        "8-week national AI programme (Cycle 1) covering AI Foundations, Generative AI, Agentic AI, AI Tools & Productivity, and Freelancing with AI.",
    },
  ],
};

export const experience = {
  note: "Independent development work — not conventional corporate employment.",
  roles: [
    {
      period: "2024 — Present",
      role: "Independent AI / Software Developer",
      org: "Independent / Personal Projects",
      highlights: [
        "Building AI-driven software products and prototypes",
        "Developing RAG and conversational AI systems",
        "Working with computer vision and machine-learning workflows",
        "Building full-stack applications around AI systems",
      ],
    },
  ],
  leadership: [
    {
      period: "6th Semester",
      role: "Climate Change & Awareness",
      org: "SPADO / British Council + Education Above All",
      highlights: [
        "Climate change workshop and awareness activities sponsored by the British Council and Education Above All",
        "Awareness sessions in schools",
        "Plant distribution",
        "Environmental awareness activities",
      ],
    },
    {
      period: "7th Semester",
      role: "Youth Empowerment Workshop",
      org: "SPADO — sponsored by the European Union",
      highlights: [
        "Youth Empowerment Workshop in Peshawar",
        "Leadership and conflict resolution",
        "Projects and seminars in different colleges",
        "Tree plantation",
        "Solid waste management",
      ],
    },
    {
      period: "2025–2026",
      role: "Community / Project Leader",
      org: "Eco Warriors / PYLI",
      highlights: [
        "Led a team of approximately 10 members",
        "Worked with British Council, Education Above All, and SPADO-linked initiatives",
        "Engaged 100+ students",
        "Supported plantation and environmental activities",
        "Participated in initiatives involving 100+ plants",
        "Coordinated volunteer/community activities involving approximately 50 volunteers",
      ],
    },
    {
      period: "2026",
      role: "Community / Plantation Initiative",
      org: "Future Builders / local community initiative, Thana Malakand",
      highlights: [
        "Participated in/led plantation activity involving 1000+ plants",
        "Supported environmental awareness and community participation",
      ],
    },
    {
      period: "[period — pending]",
      role: "Community / Environmental Initiative",
      org: "TMA Malakand / community initiative",
      highlights: [
        "Participated in solid-waste management/community environmental activities",
      ],
    },
  ],
};

export const github = {
  note:
    "Live GitHub data fetched from the public API at build time. Contribution counts and calendar require a GITHUB_TOKEN (see .env.example); without one the calendar stays labelled pending rather than displaying fabricated data.",
  metrics: [
    { label: "Repositories", value: "[— pending]" },
    { label: "Contributions (12 months)", value: "[— pending]" },
    { label: "Current streak", value: "[— pending]" },
  ],
  heatmapLabel:
    "Contribution calendar — real data at build time when available. Without a token the calendar is shown as pending.",
  repos: [
    {
      name: "LexBot",
      desc: "Multi-tenant retrieval-augmented conversational agent for legal document analysis and workflow automation.",
      languages: "Python",
    },
    {
      name: "Zyra",
      desc: "AI-assisted examination monitoring system using computer vision and pose analysis.",
      languages: "Python",
    },
    {
      name: "RAG-ChatBot",
      desc: "RAG chatbot powered by LangChain, Groq (Llama 3.1 8B), and a FAISS vector store.",
      languages: "CSS",
    },
  ],
};

export const journey = {
  note:
    "The arc — from BSCS to applied AI. Titles, periods, and chapters are confirmed.",
  /** The spine of the story: the arc from study to the current direction. */
  milestones: [
    {
      num: "01",
      phase: "Oct 2022 — Aug 2026",
      title: "BS Computer Science",
      body: "Started my BS Computer Science journey with programming, data structures, mathematics and the foundations of software development. C++ and core computing subjects established the foundation for what came next.",
    },
    {
      num: "02",
      phase: "5th Semester",
      title: "The AI / ML Shift",
      body: "During the fifth semester, my focus moved toward Python, Artificial Intelligence and Machine Learning. This became the point where software development began evolving into an interest in intelligent systems.",
    },
    {
      num: "03",
      phase: "6th–7th Semesters",
      title: "Community, Leadership & Impact",
      body: "Alongside university studies, I participated in climate awareness, youth empowerment, leadership and community initiatives. This included school awareness sessions, plantation activities, seminars, conflict-resolution work and solid-waste management initiatives.",
    },
    {
      num: "04",
      phase: "Feb — May 2026",
      title: "NAVTTC AI Training",
      body: "Selected for a NAVTTC-sponsored Artificial Intelligence training programme at AI SkillBridge in Islamabad. The training covered Python, data libraries, classical machine learning, deep learning, NLP, computer vision and practical AI projects.",
    },
    {
      num: "05",
      phase: "8 Jun — 29 Jul 2026",
      title: "ACT AI",
      body: "Successfully completed ACT AI — National AI Training Programme, Cycle 1, an eight-week national programme focused on AI Foundations, Generative AI, Agentic AI, AI Tools & Productivity, and Freelancing with AI.",
    },
    {
      num: "06",
      phase: "2026 — Present",
      title: "Building AI Products",
      body: "Now focused on building practical AI-driven products across RAG, conversational AI, LLM applications, computer vision and intelligent automation, while pursuing opportunities in AI and software development.",
    },
  ],
};

export const contact = {
  headline: "The channels are open.",
  body:
    "Open to opportunities in AI/ML, software development, intelligent automation, and related roles.",
  channels: [
    {
      label: "Email",
      value: profile.email,
      href: `mailto:${profile.email}`,
    },
    {
      label: "GitHub",
      value: `github.com/${profile.githubUsername}`,
      href: `https://github.com/${profile.githubUsername}`,
    },
    {
      label: "LinkedIn",
      value: "linkedin.com/in/fazal-hameed-097891265/",
      href: "https://www.linkedin.com/in/fazal-hameed-097891265/",
    },
    {
      label: "Location",
      value: profile.location,
      href: null,
    },
  ],
};