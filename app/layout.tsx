import type { Metadata, Viewport } from "next";
import { defaultPortfolioContent } from "./content";
import "./globals.css";

const siteUrl = "https://hieunt210703.github.io/Qa-Portfolio";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: defaultPortfolioContent.settings.siteTitle,
  description: defaultPortfolioContent.settings.siteDescription,
  applicationName: defaultPortfolioContent.settings.siteTitle,
  authors: [{ name: defaultPortfolioContent.settings.ownerName }],
  openGraph: {
    title: defaultPortfolioContent.settings.siteTitle,
    description: defaultPortfolioContent.settings.siteDescription,
    url: siteUrl,
    siteName: defaultPortfolioContent.settings.siteTitle,
    type: "website",
    images: [
      {
        url: "https://hieunt210703.github.io/Qa-Portfolio/og-light.png",
        width: 1732,
        height: 908,
        alt: "Hieu NT QA Portfolio — Quality you can verify.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultPortfolioContent.settings.siteTitle,
    description: defaultPortfolioContent.settings.siteDescription,
    images: ["https://hieunt210703.github.io/Qa-Portfolio/og-light.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
