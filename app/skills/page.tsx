import type { Metadata } from "next";
import SkillsSection from "@/components/sections/SkillsSection";

export const metadata: Metadata = {
  title: "Skills — Fazal Hameed",
  description: "Skills and technologies behind the work.",
};

export default function Page() {
  return <SkillsSection />;
}