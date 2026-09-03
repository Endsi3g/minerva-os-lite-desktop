import { JetBrains_Mono, Plus_Jakarta_Sans, Playfair_Display } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/lib/language-context"
import { PageTransition } from "@/components/page-transition"
import { CapacitorInit } from "@/components/capacitor-init"
import { ChunkErrorRecovery } from "@/components/chunk-error-recovery"
import { GlobalErrorReporter } from "@/components/global-error-reporter"
import { cn } from "@/lib/utils"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Toaster } from "sonner"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import type { Metadata, Viewport } from "next"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
})

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
})

export const metadata: Metadata = {
  title: {
    template: "%s — Minerva",
    default: "Minerva",
  },
  description: "AI-powered sales prospecting and workspace management",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Minerva OS Lite",
  },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fr"
      data-theme="light"
      suppressHydrationWarning
      className={cn("light", "antialiased", fontMono.variable, "font-sans", plusJakartaSans.variable, playfairDisplay.variable)}
    >
      <head>
        {/* Critical resource hints — establish connections before scripts parse */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
          <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        ) : null}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-title" content="Minerva" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body>
        <CapacitorInit />
        <ChunkErrorRecovery />
        <GlobalErrorReporter />
        <NuqsAdapter>
          <ThemeProvider>
            <LanguageProvider>
              <PageTransition>
                {children}
              </PageTransition>
            </LanguageProvider>
          </ThemeProvider>
        </NuqsAdapter>
        <Toaster position="bottom-right" richColors closeButton />
        {process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED === 'true' && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  )
}
