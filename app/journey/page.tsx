import type { Metadata } from "next";
import JourneySection from "@/components/sections/JourneySection";

export const metadata: Metadata = {
  title: "Journey — Fazal Hameed",
  description: "The story so far.",
};

export default function Page() {
  return <JourneySection />;
}