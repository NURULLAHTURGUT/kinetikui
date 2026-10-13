import type { ComponentDoc } from '../../../scripts/build-docs';
import components from '../generated/components.json';

export type { ComponentDoc, PropDoc, PropsTable } from '../../../scripts/build-docs';

export const allComponents = components as unknown as ComponentDoc[];

export const CATEGORY_ORDER = [
  'background',
  'card',
  'interaction',
  'input',
  'disclosure',
  'overlay',
  'text',
  'navigation',
  'feedback',
  'data',
  'screen',
] as const;

/** Components only (no screen templates). */
export const componentCount = allComponents.filter((c) => c.category !== 'screen').length;
export const screenCount = allComponents.length - componentCount;

export function getComponent(name: string): ComponentDoc | undefined {
  return allComponents.find((c) => c.name === name);
}

export function byCategory() {
  return CATEGORY_ORDER.map((key) => ({
    key,
    items: allComponents.filter((c) => c.category === key),
  })).filter((g) => g.items.length > 0);
}

/** Every component and template in navigation order (by category, as the sidebar lists them). */
export function navOrder() {
  return byCategory().flatMap((g) => g.items);
}

export const SITE = {
  name: 'Kinetik UI',
  tagline: 'Motion parts for Expo.',
  description:
    'Animation and effect components for Expo and React Native, built on Reanimated, Gesture Handler and Skia. Copy them into your app with one command.',
  playgroundScheme: 'kinetik-playground',
};

type Measurement = ComponentDoc['perf']['measurements'][number];

/** Emulator frame times depend on the host, so they are shown against the system baseline. */
export function describeMeasurement(m: Measurement): string {
  const parts = [`${m.device}${m.build ? `, ${m.build} build` : ''}`];
  if (m.kind === 'emulator' && m.baselineMs) {
    parts.push(
      `interaction median ${(m.frameMs / m.baselineMs).toFixed(2)}× the system Settings app on the same emulator (indicative only)`,
    );
  } else {
    parts.push(`${m.frameMs} ms median frame${m.p90Ms ? `, ${m.p90Ms} ms p90` : ''}`);
  }
  if (m.atRest)
    parts.push(m.atRest === 'idle' ? 'no frames drawn at rest' : 'keeps drawing at rest');
  if (m.memoryMb) parts.push(`${m.memoryMb} MB app memory`);
  const summary = parts.join(' · ');
  return m.notes ? `${summary}. ${m.notes}` : summary;
}
