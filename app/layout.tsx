import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NIGHT TRAIN — Rentrez chez vous",
  description: "Un jeu narratif de décisions et de conséquences retardées dans un train de nuit.",
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
  themeColor: "#05070b"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
