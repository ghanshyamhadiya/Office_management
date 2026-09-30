import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { themeInitScript } from "@/components/theme/theme-script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "OfficeFlow",
  description: "Office expense management workspace",
  icons: { icon: "/icon.svg" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html data-theme="light" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
