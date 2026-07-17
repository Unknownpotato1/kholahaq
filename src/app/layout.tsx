import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gomen.example.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Gomen — Search & Unlock Encrypted Accounts",
    template: "%s · Gomen",
  },
  description:
    "Gomen lets you search for accounts by username and securely unlock their current password after a verified Razorpay payment. AES-256-GCM encrypted at rest.",
  keywords: [
    "Gomen",
    "account marketplace",
    "encrypted accounts",
    "Razorpay",
    "secure unlock",
    "Firebase",
  ],
  authors: [{ name: "Gomen" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png" }],
  },
  openGraph: {
    title: "Gomen — Search & Unlock Encrypted Accounts",
    description:
      "Search usernames, see public preview, pay securely, and reveal the current password behind AES-256-GCM encryption.",
    url: SITE_URL,
    siteName: "Gomen",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gomen — Encrypted Account Marketplace",
    description:
      "Search by username, pay with Razorpay, unlock the current password via a one-time token.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
          <Toaster position="top-center" richColors closeButton />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
