import type { Metadata } from "next";
import ProjectsSection from "@/components/sections/ProjectsSection";

export const metadata: Metadata = {
  title: "Projects — Fazal Hameed",
  description: "Five project dossiers. LexBot is the flagship.",
};

export default function Page() {
  return <ProjectsSection />;
}