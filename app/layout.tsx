import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NIGHT TRAIN — Rentrez chez vous",
  description: "Un jeu de décisions dans un train où les conséquences arrivent parfois plusieurs tours plus tard.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "NIGHT TRAIN",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#07090d"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}