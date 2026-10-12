'use client';

import type { Controls } from '@kinetik/registry/demo-kit/types';
import dynamic from 'next/dynamic';
import { PreviewLoader } from './preview-loader';

// React Native Web, Reanimated and Skia render in the browser only.
const LivePreview = dynamic(() => import('./live-preview').then((m) => m.LivePreview), {
  ssr: false,
  loading: () => (
    <div className="preview">
      <div className="preview-stage">
        <PreviewLoader />
      </div>
    </div>
  ),
});

export function PreviewSlot({
  name,
  controls,
  screen,
}: {
  name: string;
  controls: Controls;
  screen?: boolean;
}) {
  return <LivePreview name={name} controls={controls} screen={screen} />;
}
