import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FrigoAi — Planificateur de repas anti-gaspillage",
  description:
    "FrigoAi optimise vos repas selon la péremption de votre frigo : 0% de perte, budget minimal et nutrition équilibrée.",
  keywords: [
    "FrigoAi",
    "anti-gaspillage",
    "planificateur de repas",
    "frigo intelligent",
    "listes de courses",
    "IA culinaire",
  ],
  authors: [{ name: "FrigoAi" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FrigoAi",
  },
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "FrigoAi — Planificateur de repas anti-gaspillage",
    description:
      "Chaque repas est agencé par ordre de péremption de votre frigo : 0% de perte, budget minimal et nutrition équilibrée.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0f0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
