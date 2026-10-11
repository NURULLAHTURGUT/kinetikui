'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export type Tab = { id: string; title: string; content: ReactNode };

/**
 * A framed card with a label on the left and tabs on the right. Inactive
 * panels stay mounted (a live preview keeps its state) but are hidden.
 */
export function TabsCard({
  label,
  tabs,
  className,
}: {
  label: ReactNode;
  tabs: Tab[];
  className?: string;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setActive(tabs[next]?.id);
    refs.current[next]?.focus();
  }

  return (
    <div className={`tabs-card ${className ?? ''}`}>
      <div className="tabs-bar">
        <span className="tabs-label">{label}</span>
        <div className="tabs-list" role="tablist">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-${tab.id}-tab`}
              aria-controls={`${base}-${tab.id}`}
              aria-selected={active === tab.id}
              tabIndex={active === tab.id ? 0 : -1}
              className="tabs-tab"
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {tab.title}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-${tab.id}`}
          aria-labelledby={`${base}-${tab.id}-tab`}
          hidden={active !== tab.id}
          className="tabs-panel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
