'use client';

import type { Controls } from '@kinetik/registry/demo-kit/types';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const LivePreview = dynamic(() => import('./live-preview').then((m) => m.LivePreview), {
  ssr: false,
  loading: () => <div className="preview-loading" aria-label="Loading preview" />,
});

/**
 * A bare live preview that loads the graphics runtime only once it is about
 * to scroll into view, so the landing page stays light above the fold.
 */
export function ShowcasePreview({ name, controls }: { name: string; controls: Controls }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="showcase-stage" ref={ref}>
      {near ? (
        <LivePreview name={name} controls={controls} bare />
      ) : (
        <div className="preview-loading" aria-label="Loading preview" />
      )}
    </div>
  );
}
