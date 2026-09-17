import type { Metadata } from "next";
import HeroSection from "@/components/sections/HeroSection";

export const metadata: Metadata = {
  title: "Fazal Hameed — Software Developer",
  description:
    "An interactive 3D portfolio for Fazal Hameed. Cinematic, robot-navigated, and built for one person.",
};

export default function Page() {
  return <HeroSection />;
}