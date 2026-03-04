import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "JUPA Digital",
    template: "%s | JUPA Digital",
  },
  description:
    "Plataforma educativa de JUPA Digital para evaluaciones de lectura comprensiva en primaria.",
  applicationName: "JUPA Digital",
  keywords: [
    "JUPA",
    "JUPA Digital",
    "lectura comprensiva",
    "evaluacion escolar",
    "educacion primaria",
  ],
  openGraph: {
    type: "website",
    locale: "es_PA",
    url: siteUrl,
    siteName: "JUPA Digital",
    title: "JUPA Digital",
    description:
      "Evaluaciones de lectura comprensiva para estudiantes de primaria en una experiencia simple y guiada.",
    images: [
      {
        url: "/LOGO-JUPA.png",
        width: 1200,
        height: 630,
        alt: "Logo JUPA Digital",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JUPA Digital",
    description:
      "Plataforma educativa para evaluaciones de lectura comprensiva en primaria.",
    images: ["/LOGO-JUPA.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
