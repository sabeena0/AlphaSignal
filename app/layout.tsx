import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlphaSignal — AI Investment Research Agent",
  description: "AI-powered investment research. Enter any company, get a deep-dive analysis and an invest/pass verdict in seconds.",
  openGraph: {
    title: "AlphaSignal — AI Investment Research Agent",
    description: "AI-powered investment research and verdicts",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: "var(--bg)" }}>
        {children}
      </body>
    </html>
  );
}
