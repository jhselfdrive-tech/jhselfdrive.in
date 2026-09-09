"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

// Depends on pathname: navigation between marketing pages is client-side, so an empty
// dependency array would report a single page_view for the whole session.
export function AnalyticsListener() {
  const pathname = usePathname();
  useEffect(() => { track("page_view"); }, [pathname]);
  return null;
}
