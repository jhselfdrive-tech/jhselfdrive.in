"use client";

import { useEffect } from "react";

export function LandingEnhancements() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("reveal-ready");
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: .12, rootMargin: "0px 0px -40px" });
    elements.forEach((element) => observer.observe(element));
    return () => { observer.disconnect(); root.classList.remove("reveal-ready"); };
  }, []);
  return null;
}
