"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, CalendarRange, CarFront, Globe, Users } from "lucide-react";

const sections = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/fleet", label: "Fleet", icon: CarFront },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/traffic", label: "Traffic", icon: Globe },
];

export function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav className={mobile ? "admin-mobile-nav" : "admin-main-nav"} aria-label={mobile ? "Mobile operations navigation" : "Operations navigation"}>
    {sections.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
      return <Link href={href} key={href} aria-current={active ? "page" : undefined}><Icon size={19} /><span>{label}</span></Link>;
    })}
  </nav>;
}
