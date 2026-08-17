/**
 * @file layout.js
 * @description Root application layout, font configurations, and global providers.
 * @author Vignesh K.S
 * @company CMMS Pro
 * @created 2026-08
 */
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "CMMS Pro | Industrial Operations",
  description: "Enterprise grade computerized maintenance management system.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
