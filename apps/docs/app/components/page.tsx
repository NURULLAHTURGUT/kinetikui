import type { Controls } from '@kinetik/registry/demo-kit/types';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';

import { Gallery, type GalleryGroup, type GalleryItem } from '../../components/gallery';
import { byCategory, componentCount, navOrder, screenCount } from '../../lib/data';
import '../home.css';
import './gallery.css';

export const metadata: Metadata = {
  title: 'Components',
  description: `All ${componentCount} Kinetik UI components and ${screenCount} screen templates, each running live.`,
};

function Words({ text }: { text: string }) {
  const words = text.split(' ');
  return words.map((word, i) => (
    <span key={i} className="word" style={{ '--w': i } as CSSProperties}>
      {word}
      {i < words.length - 1 ? ' ' : ''}
    </span>
  ));
}

export default function ComponentsPage() {
  const items: GalleryItem[] = navOrder().map((c) => ({
    name: c.name,
    title: c.title,
    description: c.description,
    category: c.category,
    categoryTitle: c.categoryTitle,
    controls: c.controls as Controls,
  }));
  const groups: GalleryGroup[] = byCategory().map((g) => ({
    key: g.key,
    title: g.items[0]?.categoryTitle ?? g.key,
  }));

  return (
    <main className="gallery">
      <header className="gallery-head words-in">
        <span className="overline rise">Components</span>
        <h1>
          <Words text="Every part, in motion." />
        </h1>
        <p className="rise" style={{ '--d': 3 } as CSSProperties}>
          {componentCount} components and {screenCount} screen templates, running live in your
          browser. Open one for its props, source and notes on when to use it.
        </p>
      </header>
      <Gallery items={items} groups={groups} />
    </main>
  );
}
