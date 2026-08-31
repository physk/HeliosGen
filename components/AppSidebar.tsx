"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, Settings, Sparkles } from "lucide-react";

const links = [
  { href: "/gallery", label: "Generate / Images", icon: Images },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  return <aside className="hidden w-60 shrink-0 flex-col border-r border-white/8 bg-[#0b0d11] px-4 py-5 md:flex"><Link href="/gallery" className="flex items-center gap-3 px-2"><span className="grid size-9 place-items-center rounded-xl bg-teal-300 text-[#062522]"><Sparkles className="size-4" /></span><span><span className="block text-sm font-semibold tracking-[-0.02em] text-white">HeliosGen</span><span className="block text-[10px] uppercase tracking-[0.18em] text-white/30">Codex studio</span></span></Link><nav className="mt-10 flex flex-col gap-1" aria-label="Primary navigation">{links.map(({ href, label, icon: Icon }) => { const active = pathname === href || (href === "/gallery" && pathname === "/"); return <Link key={href} href={href} className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition ${active ? "bg-white/8 text-white" : "text-white/45 hover:bg-white/5 hover:text-white"}`} aria-current={active ? "page" : undefined}><Icon className="size-4" />{label}</Link>; })}</nav><div className="mt-auto border-t border-white/8 px-2 pt-4 text-xs leading-5 text-white/25">Private deployment<br />Protected by your external SSO</div></aside>;
}
