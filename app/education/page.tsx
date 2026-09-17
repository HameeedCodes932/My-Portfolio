import type { Metadata } from "next";
import EducationSection from "@/components/sections/EducationSection";

export const metadata: Metadata = {
  title: "Education — Fazal Hameed",
  description: "Formal study and credentials.",
};

export default function Page() {
  return <EducationSection />;
}