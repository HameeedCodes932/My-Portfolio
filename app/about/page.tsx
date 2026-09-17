import type { Metadata } from "next";
import AboutSection from "@/components/sections/AboutSection";

export const metadata: Metadata = {
  title: "About — Fazal Hameed",
  description: "Who is behind the interface.",
};

export default function Page() {
  return <AboutSection />;
}