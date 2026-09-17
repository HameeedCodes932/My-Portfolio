import type { Metadata } from "next";
import GitHubSection from "@/components/sections/GitHubSection";

export const metadata: Metadata = {
  title: "GitHub — Fazal Hameed",
  description: "Activity and repositories.",
};

export default function Page() {
  return <GitHubSection />;
}