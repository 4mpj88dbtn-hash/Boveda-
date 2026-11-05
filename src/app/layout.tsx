import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { InlineScript } from "@/components/inline-script";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { LOAD_SEQUENCE_SCRIPT } from "@/modules/command-center/load-sequence";
import "./globals.css";

// Fuentes auto-alojadas (licencia OFL en src/app/fonts).
const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-cormorant",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const plex = localFont({
  src: "./fonts/ibm-plex-sans-latin-wght-normal.woff2",
  weight: "100 700",
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Bóveda", template: "%s · Bóveda" },
  description: "Tus finanzas, tu inversión y los mercados en un solo lugar.",
  applicationName: "Bóveda",
  appleWebApp: { capable: true, title: "Bóveda", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0d0f12",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${cormorant.variable} ${plex.variable}`} suppressHydrationWarning>
      <body>
        <InlineScript html={LOAD_SEQUENCE_SCRIPT} />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
