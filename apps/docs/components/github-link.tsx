'use client';

import { useEffect, useState } from 'react';

import { GitHubIcon, StarIcon } from './icons';

const REPO = 'NURULLAHTURGUT/kinetikui';
const KEY = 'kinetik-stars';

function format(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
}

/**
 * The repository link with its star count. The count is read from the public
 * GitHub API once per session; while the repository is private (or the API is
 * unreachable) only the icon shows.
 */
export function GitHubLink() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    try {
      const cached = sessionStorage.getItem(KEY);
      if (cached !== null) {
        const n = Number(cached);
        // Read from storage on the next tick so the first render matches the server.
        queueMicrotask(() => alive && n >= 0 && setStars(n));
        return () => {
          alive = false;
        };
      }
    } catch {
      // Storage unavailable: fetch every time.
    }
    fetch(`https://api.github.com/repos/${REPO}`, { headers: { accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { stargazers_count?: number } | null) => {
        const n = typeof data?.stargazers_count === 'number' ? data.stargazers_count : -1;
        try {
          sessionStorage.setItem(KEY, String(n));
        } catch {
          // Ignore: the count just is not cached.
        }
        if (alive && n >= 0) setStars(n);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <a
      className="gh-link"
      href={`https://github.com/${REPO}`}
      aria-label={stars === null ? 'GitHub repository' : `GitHub repository, ${stars} stars`}
    >
      <GitHubIcon size={18} />
      {stars !== null && (
        <span className="gh-stars">
          <StarIcon size={12} />
          {format(stars)}
        </span>
      )}
    </a>
  );
}
