'use client';

import { defaultValues, type Controls } from '@kinetik/registry/demo-kit/types';
import type { DemoEntry } from '@kinetik/registry/demos.generated';
import { KinetikProvider } from '@kinetik/registry/shared/tokens/theme';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { loadRuntime } from './live-preview';
import { useSiteTheme } from './theme';

/** The size a demo is laid out at before it is scaled into its card. */
const STAGE = { width: 440, height: 400 };
const PHONE = { width: 390, height: 760 };

/**
 * A live, scaled-down demo for a gallery card. The demo lays out at its usual
 * size and the whole stage is scaled to fit, so it looks exactly like the
 * docs page, only smaller. Touch is left to the card, which is a link.
 */
export function GalleryThumb({
  name,
  controls,
  screen,
}: {
  name: string;
  controls: Controls;
  screen: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [entry, setEntry] = useState<DemoEntry | null>(null);
  const scheme = useSiteTheme();
  const values = useMemo(() => defaultValues(controls), [controls]);
  const size = screen ? PHONE : STAGE;

  useEffect(() => {
    let alive = true;
    loadRuntime().then(
      (demos) => alive && setEntry(demos.find((d) => d.name === name) ?? null),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [name]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      // Layout size, not the on-screen rect: the card itself scales as it rises in.
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      setScale(
        screen ? (height * 0.88) / size.height : Math.min(width / size.width, height / size.height),
      );
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [screen, size.width, size.height]);

  const Demo = entry?.Demo;

  return (
    <div className="thumb-box" ref={box} data-scheme={scheme}>
      {Demo && scale > 0 ? (
        <div
          className={screen ? 'thumb-stage thumb-phone' : 'thumb-stage'}
          style={{
            width: size.width,
            height: size.height,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
          aria-hidden
          inert
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <KinetikProvider scheme={scheme} reduceMotion="system" haptics={false}>
                <View
                  style={screen ? { flex: 1 } : { flex: 1, padding: 24, justifyContent: 'center' }}
                >
                  <Demo {...values} />
                </View>
              </KinetikProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </div>
      ) : (
        <div className="thumb-wait" aria-hidden />
      )}
    </div>
  );
}
