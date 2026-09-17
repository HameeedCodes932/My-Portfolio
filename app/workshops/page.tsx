import type { Metadata } from "next";
import WorkshopsSection from "@/components/sections/WorkshopsSection";

export const metadata: Metadata = {
  title: "Workshops — Fazal Hameed",
  description: "Workshops and programs.",
};

export default function Page() {
  return <WorkshopsSection />;
}