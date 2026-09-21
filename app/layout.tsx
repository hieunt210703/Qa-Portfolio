import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://hieunt210703.github.io/Qa-Portfolio";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Hieu NT — QA Portfolio",
  description:
    "A practical QA portfolio covering test strategy, manual test cases, execution results, and defect reporting.",
  applicationName: "Hieu NT QA Portfolio",
  authors: [{ name: "Hieu NT" }],
  openGraph: {
    title: "Hieu NT — QA Portfolio",
    description:
      "Test strategy, execution evidence, and defect reporting in one focused QA case study.",
    url: siteUrl,
    siteName: "Hieu NT QA Portfolio",
    type: "website",
    images: [
      {
        url: "https://hieunt210703.github.io/Qa-Portfolio/og.png",
        width: 1730,
        height: 909,
        alt: "Hieu NT QA Portfolio — I test what users actually do.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hieu NT — QA Portfolio",
    description: "A practical, evidence-led manual QA portfolio.",
    images: ["https://hieunt210703.github.io/Qa-Portfolio/og.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: "#08110f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
