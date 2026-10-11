'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * - `cmd`: a shell command, typed out after a `$` prompt
 * - `ask`: what the user asks an agent, typed out after a `›` prompt
 * - `tool`: an MCP tool call the agent makes
 * - `out`: an output line, `ok`: a success line, `say`: the agent's reply
 */
export type TerminalLine = {
  kind: 'cmd' | 'ask' | 'tool' | 'out' | 'ok' | 'say';
  text: string;
};

const TYPED = new Set<TerminalLine['kind']>(['cmd', 'ask']);
const PREFIX: Partial<Record<TerminalLine['kind'], string>> = {
  cmd: '$ ',
  ask: '› ',
  tool: '⏺ ',
  out: '+ ',
  ok: '✓ ',
};

export const INSTALL_SCRIPT: TerminalLine[] = [
  { kind: 'cmd', text: 'npx kinetik-ui init' },
  { kind: 'ok', text: 'Wrote kinetik.json, tokens and motion presets' },
  { kind: 'cmd', text: 'npx kinetik-ui add glint-card liquid-tabs' },
  { kind: 'out', text: 'components/kinetik/glint-card.tsx' },
  { kind: 'out', text: 'components/kinetik/liquid-tabs.tsx' },
  { kind: 'ok', text: 'Installed SDK-matched dependencies with expo install' },
];

/** A terminal that plays a script once it scrolls into view. */
export function Terminal({
  script = INSTALL_SCRIPT,
  title = 'my-expo-app',
  label = 'Installing Kinetik UI components',
}: {
  script?: TerminalLine[];
  title?: string;
  label?: string;
}) {
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
        setShown(script.length);
        return;
      }
      let line = 0;
      let chars = 0;
      const step = () => {
        const current = script[line];
        if (!current) return;
        if (TYPED.has(current.kind) && chars < current.text.length) {
          chars += 1;
          setShown(line);
          setTyped(chars);
          timer = window.setTimeout(step, 24 + Math.random() * 36);
          return;
        }
        line += 1;
        chars = 0;
        setShown(line);
        setTyped(0);
        const next = script[line];
        timer = window.setTimeout(
          step,
          next && TYPED.has(next.kind) ? 650 : next?.kind === 'tool' ? 520 : 280,
        );
      };
      timer = window.setTimeout(step, 400);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [script]);

  const last = script[script.length - 1];
  const idlePrompt = last && last.kind === 'say' ? '› ' : '$ ';

  return (
    <div className="terminal" ref={ref} role="img" aria-label={label}>
      <div className="terminal-bar" aria-hidden>
        <span />
        <span />
        <span />
        <em>{title}</em>
      </div>
      <pre aria-hidden>
        {script.map((line, i) => {
          if (i > shown) return null;
          const typing = i === shown && TYPED.has(line.kind);
          if (i === shown && !typing) return null;
          const text = typing ? line.text.slice(0, typed) : line.text;
          const prefix = PREFIX[line.kind];
          return (
            <div key={i} className={`t-${line.kind}`}>
              {prefix && <span className="t-prefix">{prefix}</span>}
              {text}
              {typing && <span className="t-caret" />}
            </div>
          );
        })}
        {shown >= script.length && (
          <div className="t-cmd">
            <span className="t-prefix">{idlePrompt}</span>
            <span className="t-caret" />
          </div>
        )}
      </pre>
    </div>
  );
}
