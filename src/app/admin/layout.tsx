import type { Metadata } from "next";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false, nocache: true } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) { return children; }
