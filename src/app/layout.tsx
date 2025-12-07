import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ApexVision | Pro FPS Visual Training",
  description: "The ultimate visual performance gym for competitive gamers. Warm up your aim, track eye speed, and get personalized drill recommendations.",
  manifest: "/manifest.json",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://apex-vision.vercel.app'),
  openGraph: {
    title: "ApexVision | Pro FPS Visual Training",
    description: "The ultimate visual performance gym for competitive gamers. Warm up your aim, track eye speed, and get personalized drill recommendations.",
    url: "/",
    siteName: "ApexVision",
    images: [
      {
        url: "/og-image.png", // Ensure this image exists or Vercel will generate a default if using vercel/og
        width: 1200,
        height: 630,
        alt: "ApexVision Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ApexVision | Pro FPS Visual Training",
    description: "The ultimate visual performance gym for competitive gamers.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ApexVision",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}
