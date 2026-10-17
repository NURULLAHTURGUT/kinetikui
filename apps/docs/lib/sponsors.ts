/**
 * Public GitHub sponsors, read from the GraphQL API with a token kept in the
 * GITHUB_SPONSORS_TOKEN environment variable (a classic token with the
 * read:user scope). Without the token, or if GitHub is unreachable, the list is
 * empty and the sponsors page shows its open slots instead.
 */

export const SPONSOR_LOGIN = 'NURULLAHTURGUT';
export const SPONSOR_URL = `https://github.com/sponsors/${SPONSOR_LOGIN}`;
/** How often, in seconds, the sponsors page asks GitHub again. */
export const SPONSORS_REFRESH = 3600;

export type Sponsor = { login: string; name: string; avatar: string; url: string };

type Entity = { login?: string; name?: string | null; avatarUrl?: string; url?: string } | null;
type Response = {
  data?: {
    user?: {
      sponsorshipsAsMaintainer?: {
        nodes?: ({ privacyLevel?: string; sponsorEntity?: Entity } | null)[];
      };
    };
  };
};

const QUERY = `query ($login: String!) {
  user(login: $login) {
    sponsorshipsAsMaintainer(first: 100, activeOnly: true) {
      nodes {
        privacyLevel
        sponsorEntity {
          ... on User { login name avatarUrl(size: 96) url }
          ... on Organization { login name avatarUrl(size: 96) url }
        }
      }
    }
  }
}`;

export async function getSponsors(): Promise<Sponsor[]> {
  const token = process.env.GITHUB_SPONSORS_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { login: SPONSOR_LOGIN } }),
      next: { revalidate: SPONSORS_REFRESH },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as Response;
    const nodes = json.data?.user?.sponsorshipsAsMaintainer?.nodes ?? [];
    return nodes.flatMap((node) => {
      const e = node?.sponsorEntity;
      // Private sponsorships stay private.
      if (node?.privacyLevel !== 'PUBLIC' || !e?.login || !e.avatarUrl || !e.url) return [];
      return [{ login: e.login, name: e.name || e.login, avatar: e.avatarUrl, url: e.url }];
    });
  } catch {
    return [];
  }
}
