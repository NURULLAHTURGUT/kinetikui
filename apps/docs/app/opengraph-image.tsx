import { ImageResponse } from 'next/og';

import { componentCount, SITE } from '../lib/data';

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The link preview: the logo's three circles over the name and tagline. */
export default function OpenGraphImage() {
  const circle = (fill: string, border: number) => ({
    width: 120,
    height: 120,
    marginLeft: -36,
    borderRadius: 60,
    border: `${border}px solid #FFFFFF`,
    background: fill,
  });
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 96px',
        background: '#000000',
        color: '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', marginLeft: 36 }}>
        <div style={circle('#000000', 3)} />
        <div style={circle('#000000', 6)} />
        <div style={circle('#FFFFFF', 6)} />
      </div>
      <div style={{ marginTop: 56, fontSize: 88, fontWeight: 700, letterSpacing: -3 }}>
        {SITE.name}
      </div>
      <div style={{ marginTop: 12, fontSize: 44, color: '#A1A1A1' }}>{SITE.tagline}</div>
      <div style={{ marginTop: 36, fontSize: 28, color: '#707070' }}>
        {`${componentCount} components · kinetik-ui.dev`}
      </div>
    </div>,
    size,
  );
}
