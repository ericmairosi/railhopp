import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Railhopp - Live UK Train Times & Journey Planning",
    template: "%s | Railhopp"
  },
  description: "Real-time UK train departures, arrivals, and delays. Plan your journey with live updates from National Rail. Fast, accurate, and always up-to-date train information.",
  keywords: ["train times", "UK trains", "National Rail", "live departures", "journey planner", "real-time trains", "railway", "timetable"],
  authors: [{ name: "Railhopp Team" }],
  creator: "Railhopp",
  publisher: "Railhopp",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "/",
    title: "Railhopp - Live UK Train Times & Journey Planning",
    description: "Real-time UK train departures, arrivals, and delays. Plan your journey with live updates from National Rail.",
    siteName: "Railhopp",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Railhopp - Live UK Train Times",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Railhopp - Live UK Train Times & Journey Planning",
    description: "Real-time UK train departures, arrivals, and delays. Plan your journey with live updates from National Rail.",
    images: ["/og-image.jpg"],
    creator: "@railhopp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
