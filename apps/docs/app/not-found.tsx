import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <section className="not-found">
      <span className="overline">404</span>
      <h1>This page moved, or never existed.</h1>
      <p className="muted">The component you are looking for may have a new name.</p>
      <div className="not-found-actions">
        <Link className="button button-primary" href="/components">
          Browse components
        </Link>
        <Link className="button button-secondary" href="/">
          Home
        </Link>
      </div>
    </section>
  );
}
