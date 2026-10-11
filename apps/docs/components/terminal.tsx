'use client';

import { useEffect, useRef, useState } from 'react';

type Line = { kind: 'cmd' | 'out' | 'ok'; text: string };

const SCRIPT: Line[] = [
  { kind: 'cmd', text: 'npx kinetik-ui init' },
  { kind: 'ok', text: 'Wrote kinetik.json, tokens and motion presets' },
  { kind: 'cmd', text: 'npx kinetik-ui add glint-card liquid-tabs' },
  { kind: 'out', text: 'components/kinetik/glint-card.tsx' },
  { kind: 'out', text: 'components/kinetik/liquid-tabs.tsx' },
  { kind: 'ok', text: 'Installed SDK-matched dependencies with expo install' },
];

/** A terminal that types the install flow once it scrolls into view. */
export function Terminal() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      if (reduced) {
        setShown(SCRIPT.length);
        return;
      }
      let line = 0;
      let chars = 0;
      const step = () => {
        const current = SCRIPT[line];
        if (!current) return;
        if (current.kind === 'cmd' && chars < current.text.length) {
          chars += 1;
          setShown(line);
          setTyped(chars);
          timer = window.setTimeout(step, 28 + Math.random() * 40);
          return;
        }
        line += 1;
        chars = 0;
        setShown(line);
        setTyped(0);
        const next = SCRIPT[line];
        timer = window.setTimeout(step, next?.kind === 'cmd' ? 650 : 260);
      };
      timer = window.setTimeout(step, 400);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="terminal" ref={ref} role="img" aria-label="Installing Kinetik UI components">
      <div className="terminal-bar" aria-hidden>
        <span />
        <span />
        <span />
        <em>my-expo-app</em>
      </div>
      <pre aria-hidden>
        {SCRIPT.map((line, i) => {
          if (i > shown) return null;
          const typing = i === shown && line.kind === 'cmd';
          const text = typing ? line.text.slice(0, typed) : line.text;
          if (i === shown && !typing && i < SCRIPT.length) return null;
          return (
            <div key={i} className={`t-${line.kind}`}>
              {line.kind === 'cmd' && <span className="t-prompt">$ </span>}
              {line.kind === 'ok' && <span className="t-check">✓ </span>}
              {line.kind === 'out' && <span className="t-plus">+ </span>}
              {text}
              {typing && <span className="t-caret" />}
            </div>
          );
        })}
        {shown >= SCRIPT.length && (
          <div className="t-cmd">
            <span className="t-prompt">$ </span>
            <span className="t-caret" />
          </div>
        )}
      </pre>
    </div>
  );
}
