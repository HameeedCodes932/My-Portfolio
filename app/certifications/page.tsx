import type { Metadata } from "next";
import CertificationsSection from "@/components/sections/CertificationsSection";

export const metadata: Metadata = {
  title: "Certifications — Fazal Hameed",
  description: "Certifications and licences.",
};

export default function Page() {
  return <CertificationsSection />;
}