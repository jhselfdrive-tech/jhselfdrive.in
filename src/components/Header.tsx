"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { site } from "@/content/site";
import { TrackedLink } from "./TrackedLink";

const links = [{ href: "/cars", label: "Our cars" }, { href: "/#how", label: "How it works" }, { href: "/#area", label: "Destinations" }, { href: "/#faq", label: "FAQs" }];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return <header className="site-header" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); } }}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <nav className="nav shell" aria-label="Main navigation">
      <Link className="brand" href="/" onClick={() => setOpen(false)}><span className="brand-mark">JH<span>↗</span></span><span>self drive<small>YOUR ROAD. YOUR TIME.</small></span></Link>
      <div className="nav-links">{links.map(link => <Link className="nav-link" href={link.href} key={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}</div>
      <div className="nav-actions"><TrackedLink className="nav-call" event="call_click" href={`tel:${site.phoneE164}`} aria-label={`Call ${site.phoneDisplay}`}><Phone size={17} /><span>Let&apos;s talk</span></TrackedLink><Link className="nav-book" href="/booking" onClick={() => setOpen(false)}>Book a car <ArrowUpRight size={16} /></Link><button ref={toggle} className="menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button></div>
    </nav>
    {open ? <nav className="mobile-menu" id="mobile-menu" aria-label="Mobile navigation">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}<ArrowUpRight size={17} /></Link>)}<a href={`tel:${site.phoneE164}`}><Phone size={17} /> {site.phoneDisplay}</a></nav> : null}
  </header>;
}
