import type { Metadata } from "next";
import ContactSection from "@/components/sections/ContactSection";

export const metadata: Metadata = {
  title: "Contact — Fazal Hameed",
  description: "Open channels.",
};

export default function Page() {
  return <ContactSection />;
}