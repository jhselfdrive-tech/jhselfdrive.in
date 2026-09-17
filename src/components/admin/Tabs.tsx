"use client";

import { useRef, useState } from "react";

export type TabDefinition = {
  id: string;
  label: string;
  /** Already-rendered element — icon components cannot cross the RSC boundary. */
  icon?: React.ReactNode;
  /** Small count shown beside the label, e.g. messages still to send. */
  badge?: number;
  content: React.ReactNode;
};

/**
 * Tabbed sections for a long detail page.
 *
 * Every panel stays mounted and is hidden with the `hidden` attribute rather
 * than unmounted, so a half-filled checklist survives a trip to another tab.
 * The content is already fetched by the server component either way, so this
 * costs nothing extra and switching is instant.
 */
export function Tabs({ tabs, initialTab }: { tabs: TabDefinition[]; initialTab?: string }) {
  const [active, setActive] = useState(() => (tabs.some((tab) => tab.id === initialTab) ? initialTab! : tabs[0]?.id));
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    setActive(next.id);
    refs.current[next.id]?.focus();
  }

  return <div className="admin-tabs">
    <div className="admin-tablist" role="tablist" aria-label="Booking sections">
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return <button
          key={tab.id}
          ref={(element) => { refs.current[tab.id] = element; }}
          type="button"
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={selected}
          aria-controls={`panel-${tab.id}`}
          tabIndex={selected ? 0 : -1}
          className={selected ? "admin-tab active" : "admin-tab"}
          onClick={() => setActive(tab.id)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge ? <em className="admin-tab-badge">{tab.badge}</em> : null}
        </button>;
      })}
    </div>

    {tabs.map((tab) => <div
      key={tab.id}
      id={`panel-${tab.id}`}
      role="tabpanel"
      aria-labelledby={`tab-${tab.id}`}
      className="admin-tab-panel"
      hidden={tab.id !== active}
    >
      {tab.content}
    </div>)}
  </div>;
}
