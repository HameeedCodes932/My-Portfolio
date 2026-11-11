import type { Metadata } from "next";
import { Fraunces, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import Scene from "@/components/scene/Scene";
import RobotDirector from "@/components/scene/RobotDirector";
import TransitionProvider from "@/components/transition/TransitionProvider";
import "./globals.css";
import Script from "next/script";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["300", "400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fazal Hameed - Software Developer",
  description:
    "An interactive 3D portfolio for Fazal Hameed. Cinematic, robot-navigated, and built for one person.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${spaceGrotesk.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <RobotDirector>
          <div className="fixed inset-0 z-[80] pointer-events-none">
            <Scene />
          </div>

          <div className="screen-dim" aria-hidden="true" />

          <TransitionProvider>{children}</TransitionProvider>

          <div className="grain-overlay" aria-hidden="true" />
        </RobotDirector>

        <noscript>
          <style>{`.transition-all{opacity:1!important;transform:none!important;filter:none!important}`}</style>
        </noscript>
               <Script
          src="https://chatsink.com/widget.js?v=20261002"
          data-widget-key="Ypk_live_FDbcEU5vwvDw51VrBwuqfb_9Ro-fcZxx"
          data-api="https://api.chatsink.com"
          data-position="bottom-right"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
