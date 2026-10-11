'use client';

import { defaultValues, type Control, type Controls } from '@kinetik/registry/demo-kit/types';
import type { DemoEntry } from '@kinetik/registry/demos.generated';
import { KinetikProvider } from '@kinetik/registry/shared/tokens/theme';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSiteTheme } from './theme';

// Skia's web build reads CanvasKit when its modules are first evaluated, so the
// demos (which import Skia) may only be imported after CanvasKit has loaded.
let runtime: Promise<DemoEntry[]> | null = null;
function loadRuntime() {
  runtime ??= canvasKitUrl()
    .then((url) => LoadSkiaWeb({ locateFile: () => url }))
    .then(() => import('@kinetik/registry/demos.generated'))
    .then((m) => m.demos);
  return runtime;
}

// Production loads CanvasKit from the CDN and falls back to this site's copy if
// the CDN is unreachable (Skia caches a failed load, so the check comes first).
async function canvasKitUrl() {
  const cdn = process.env.NEXT_PUBLIC_CANVASKIT_URL;
  if (process.env.NODE_ENV !== 'production' || !cdn) return '/canvaskit.wasm';
  try {
    const res = await fetch(cdn, { method: 'HEAD' });
    if (res.ok) return cdn;
  } catch {
    // Network or CORS failure: use the local copy.
  }
  return '/canvaskit.wasm';
}

export function LivePreview({
  name,
  controls,
  screen = false,
  bare = false,
}: {
  name: string;
  controls: Controls;
  /** Full-screen templates render in a phone-sized frame. */
  screen?: boolean;
  /** Just the stage: no toolbar or controls (landing page showcase). */
  bare?: boolean;
}) {
  const [entry, setEntry] = useState<DemoEntry | null>(null);
  const scheme = useSiteTheme();
  const [failed, setFailed] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>(() => defaultValues(controls));
  const [reduceMotion, setReduceMotion] = useState(false);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    let alive = true;
    loadRuntime().then(
      (demos) => alive && setEntry(demos.find((d) => d.name === name) ?? null),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [name]);

  const Demo = entry?.Demo;

  return (
    <div className={screen ? 'preview preview-screen' : bare ? 'preview preview-bare' : 'preview'}>
      <div className="preview-stage" data-scheme={scheme}>
        {!bare && (
          <div className="preview-toolbar">
            <button
              type="button"
              className={`chip ${reduceMotion ? 'chip-on' : ''}`}
              aria-pressed={reduceMotion}
              onClick={() => setReduceMotion((v) => !v)}
            >
              Reduced motion
            </button>
            <button type="button" className="chip" onClick={() => setReplay((r) => r + 1)}>
              Replay
            </button>
          </div>
        )}
        {failed ? (
          <p className="preview-note">The live preview could not load its graphics runtime.</p>
        ) : !Demo ? (
          <div className="preview-loading" aria-label="Loading preview" />
        ) : (
          <div className={screen ? 'phone' : 'preview-canvas'}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <KinetikProvider
                  scheme={scheme}
                  reduceMotion={reduceMotion ? 'always' : 'system'}
                  haptics={false}
                >
                  <View
                    style={
                      screen
                        ? { flex: 1 }
                        : bare
                          ? { flex: 1, padding: 24, justifyContent: 'center' }
                          : { padding: 24, justifyContent: 'center', minHeight: 380 }
                    }
                  >
                    <Demo key={replay} {...values} />
                  </View>
                </KinetikProvider>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </div>
        )}
      </div>
      {!bare && (
        <ControlPanel
          controls={controls}
          values={values}
          onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
          onReset={() => setValues(defaultValues(controls))}
        />
      )}
    </div>
  );
}

function ControlPanel({
  controls,
  values,
  onChange,
  onReset,
}: {
  controls: Controls;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onReset: () => void;
}) {
  const entries = Object.entries(controls);
  if (entries.length === 0) return null;
  return (
    <form className="controls" onSubmit={(e) => e.preventDefault()} aria-label="Demo controls">
      <div className="controls-head">
        <span className="overline">Controls</span>
        <button type="button" className="link" onClick={onReset}>
          Reset
        </button>
      </div>
      {entries.map(([key, control]) => (
        <ControlField
          key={key}
          id={key}
          control={control}
          value={values[key]}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </form>
  );
}

function ControlField({
  id,
  control,
  value,
  onChange,
}: {
  id: string;
  control: Control;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const fieldId = `control-${id}`;
  if (control.type === 'boolean') {
    return (
      <label className="field field-row" htmlFor={fieldId}>
        <span>{control.label}</span>
        <input
          id={fieldId}
          type="checkbox"
          role="switch"
          className="switch"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }
  if (control.type === 'number') {
    const n = typeof value === 'number' ? value : control.default;
    return (
      <label className="field" htmlFor={fieldId}>
        <span className="field-row">
          <span>{control.label}</span>
          <output className="mono muted">{Number(n.toFixed(4))}</output>
        </span>
        <input
          id={fieldId}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={n}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    );
  }
  return (
    <fieldset className="field">
      <legend>{control.label}</legend>
      <div className="segmented" role="radiogroup">
        {control.options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            className={value === option ? 'on' : ''}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
