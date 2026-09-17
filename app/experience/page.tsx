import type { Metadata } from "next";
import ExperienceSection from "@/components/sections/ExperienceSection";

export const metadata: Metadata = {
  title: "Experience — Fazal Hameed",
  description: "Experience and leadership.",
};

export default function Page() {
  return <ExperienceSection />;
}