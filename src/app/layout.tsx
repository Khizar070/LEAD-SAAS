import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Lead Intelligence MVP",
  description: "Personal AI lead research, website audit, and personalized outreach platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} dark h-full antialiased`}
    >
      <body className={`${spaceGrotesk.className} min-h-full flex bg-slate-950 text-slate-100 font-sans`}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
