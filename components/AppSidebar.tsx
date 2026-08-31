"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Image as ImageIcon, Settings, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarTrigger } from "@/components/ui/sidebar";

function ForkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" />
      <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" /><line x1="12" y1="12" x2="12" y2="15" />
    </svg>
  );
}

function LogoIcon() { return <Image src="/HG.svg" alt="Logo" width={26} height={26} />; }

function GitHubButtons() {
  return (
    <div className="group-data-[collapsible=icon]:hidden flex gap-1 justify-center px-2 pb-3">
      <a href="https://github.com/segfault42/HeliosGen" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 h-8 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground text-white/60"><Star size={14} strokeWidth={1.8} /></a>
      <a href="https://github.com/segfault42/HeliosGen/fork" target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 h-8 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground text-white/60"><ForkIcon /></a>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const navItems = [
    { label: "Image", href: "/gallery?tab=images", icon: ImageIcon, active: pathname === "/gallery" || pathname === "/" },
    { label: "Settings", href: "/settings", icon: Settings, active: pathname.startsWith("/settings") },
  ];
  const itemCls = (active: boolean) => cn(
    "flex items-center gap-3.5 px-3 h-11 w-full rounded-xl transition-colors duration-150 text-left",
    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:mx-auto",
    active ? "bg-white/[0.08] text-white" : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]",
  );

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-[#0B0E14]" style={{ borderRight: "none" }}>
      <SidebarHeader className="flex-row items-center justify-between px-4 pt-5 pb-2 gap-0">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden"><LogoIcon /><span className="text-white text-[22px] leading-none select-none" style={{ fontFamily: "'Georgia','Times New Roman',serif", fontStyle: "italic" }}>HeliosGen</span></div>
        <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-1"><div className="relative group/logo-area w-10 h-10 flex items-center justify-center"><div className="pointer-events-none transition-opacity duration-200 group-hover/logo-area:opacity-0"><LogoIcon /></div><SidebarTrigger className="absolute inset-0 opacity-0 group-hover/logo-area:opacity-100 transition-opacity duration-200 text-white/50 hover:text-white hover:bg-white/[0.05] w-full h-full rounded-xl p-0 [&_svg]:size-4" /></div></div>
        <SidebarTrigger className="group-data-[collapsible=icon]:hidden text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors p-1.5 rounded-lg -mr-1 [&_svg]:size-4" />
      </SidebarHeader>
      <SidebarContent className="overflow-y-auto flex flex-col"><div className="px-2 py-3 flex flex-col gap-0.5 shrink-0">{navItems.map((item) => <Link key={item.label} href={item.href} className={itemCls(item.active)} title={item.label}><item.icon size={20} strokeWidth={1.5} className="shrink-0" /><span className="text-[14px] font-medium group-data-[collapsible=icon]:hidden leading-none">{item.label}</span></Link>)}</div></SidebarContent>
      <SidebarFooter className="px-2 pb-4"><GitHubButtons /></SidebarFooter>
    </Sidebar>
  );
}
