import type { Metadata } from "next";
import "./globals.css";
import { AppSidebar } from "@/components/AppSidebar";

export const metadata: Metadata = { title: "HeliosGen · Codex image studio", description: "A small self-hosted Codex image generation workspace" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body className="min-h-screen bg-[#0b0d11] text-white antialiased"><div className="flex min-h-screen"><AppSidebar /><div className="flex min-w-0 flex-1 flex-col"><div className="flex h-14 items-center border-b border-white/8 px-5 md:hidden"><a href="/gallery" className="text-sm font-semibold text-white">HeliosGen <span className="font-normal text-white/35">/ Codex</span></a></div>{children}</div></div></body></html>;
}
