import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/layout/sidebar-context";

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
      <body className={`${spaceGrotesk.className} min-h-full bg-[#070709] text-neutral-100 font-sans antialiased m-0 p-0`}>
        <SidebarProvider>
          <div className="min-h-screen w-full flex bg-[#070709] p-0 md:p-3 transition-all duration-300">
            <div className="flex-1 flex w-full min-h-[calc(100vh-1.5rem)] rounded-none md:rounded-2xl border-0 md:border border-neutral-800/80 bg-[#0d0d10] overflow-hidden shadow-2xl">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0 bg-[#0d0d10]">
                <Header />
                <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
              </div>
            </div>
          </div>
        </SidebarProvider>
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
