'use client';

import type { Controls } from '@kinetik/registry/demo-kit/types';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import { ArrowRightIcon } from './icons';

const GalleryThumb = dynamic(() => import('./gallery-thumb').then((m) => m.GalleryThumb), {
  ssr: false,
  loading: () => (
    <div className="thumb-box">
      <div className="thumb-wait" aria-hidden />
    </div>
  ),
});

export type GalleryItem = {
  name: string;
  title: string;
  description: string;
  category: string;
  categoryTitle: string;
  controls: Controls;
};

export type GalleryGroup = { key: string; title: string };

/**
 * Every component as a card with its live demo. Cards rise in as they scroll
 * into view; a demo only runs while its card is on screen, so the page stays
 * light however long the list gets.
 */
export function Gallery({ items, groups }: { items: GalleryItem[]; groups: GalleryGroup[] }) {
  const [group, setGroup] = useState('all');
  const [query, setQuery] = useState('');
  // The demos start after the intro has played: loading the graphics runtime
  // and the demo code is heavy, and doing it during the intro makes it stutter.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1100);
    return () => clearTimeout(t);
  }, []);

  // The landing page links to a category as /components#card.
  useEffect(() => {
    const pick = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (groups.some((g) => g.key === hash)) setGroup(hash);
    };
    pick();
    window.addEventListener('hashchange', pick);
    return () => window.removeEventListener('hashchange', pick);
  }, [groups]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (c) =>
        (group === 'all' || c.category === group) &&
        (!q ||
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.categoryTitle.toLowerCase().includes(q)),
    );
  }, [items, group, query]);

  const choose = (key: string) => {
    setGroup(key);
    history.replaceState(null, '', key === 'all' ? location.pathname : `#${key}`);
  };

  return (
    <>
      <div className="gallery-bar">
        <div className="gallery-filters" role="group" aria-label="Filter by category">
          {[{ key: 'all', title: 'All' }, ...groups].map((g) => {
            const count =
              g.key === 'all' ? items.length : items.filter((c) => c.category === g.key).length;
            return (
              <button
                key={g.key}
                type="button"
                className="gallery-filter"
                aria-pressed={group === g.key}
                onClick={() => choose(g.key)}
              >
                {g.title}
                <span className="gallery-count">{count}</span>
              </button>
            );
          })}
        </div>
        <label className="gallery-search">
          <span className="sr-only">Search components</span>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-6 -6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {/* Keyed by the filter so the cards rise in again when it changes. */}
      <ul className="gallery-grid" key={`${group}|${query}`}>
        {shown.map((c, i) => (
          <GalleryCard key={c.name} item={c} index={i} ready={ready} />
        ))}
      </ul>
      {shown.length === 0 && (
        <p className="gallery-empty">Nothing matches “{query}”. Try another word.</p>
      )}
    </>
  );
}

function GalleryCard({ item, index, ready }: { item: GalleryItem; index: number; ready: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const [seen, setSeen] = useState(false);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setNear(entry.isIntersecting);
        if (entry.isIntersecting) setSeen(true);
      },
      { rootMargin: '240px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const screen = item.category === 'screen';

  return (
    <li
      ref={ref}
      className="gallery-item"
      data-in={seen ? '' : undefined}
      style={{ '--i': index % 3 } as CSSProperties}
    >
      {/* Not prefetched: the gallery holds every component. */}
      <Link href={`/components/${item.name}`} prefetch={false} className="gallery-card spot">
        <div className="gallery-preview">
          {near && ready ? (
            <GalleryThumb name={item.name} controls={item.controls} screen={screen} />
          ) : (
            <div className="thumb-box">
              <div className="thumb-wait" aria-hidden />
            </div>
          )}
        </div>
        <div className="gallery-foot">
          <div className="gallery-text">
            <span className="gallery-title">{item.title}</span>
            <span className="gallery-meta">{item.categoryTitle}</span>
          </div>
          <span className="gallery-arrow" aria-hidden>
            <ArrowRightIcon size={16} />
          </span>
        </div>
      </Link>
    </li>
  );
}
