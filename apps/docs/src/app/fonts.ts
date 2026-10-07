import { Inter } from "next/font/google";

// Self-hosted at build time by next/font: no request to Google at runtime,
// no layout shift, and one variable the token sheet can reference.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
