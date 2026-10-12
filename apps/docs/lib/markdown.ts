import { Marked } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';

let highlighter: Promise<Highlighter> | null = null;
function getHighlighter() {
  highlighter ??= createHighlighter({
    themes: ['github-dark-default', 'github-light-default'],
    langs: ['tsx', 'ts', 'bash', 'json', 'markdown'],
  });
  return highlighter;
}

/** Highlights code for both themes; CSS shows the one matching the site theme. */
export async function highlight(code: string, lang = 'tsx'): Promise<string> {
  const h = await getHighlighter();
  const language = h.getLoadedLanguages().includes(lang) ? lang : 'tsx';
  return h.codeToHtml(code.replace(/\n$/, ''), {
    lang: language,
    themes: { dark: 'github-dark-default', light: 'github-light-default' },
    defaultColor: false,
  });
}

/** Renders a docs.mdx body (plain Markdown, no JSX) to HTML with highlighted code. */
export async function renderMarkdown(source: string): Promise<string> {
  const blocks: Promise<string>[] = [];
  const marked = new Marked({
    gfm: true,
    renderer: {
      code({ text, lang }) {
        const i = blocks.push(highlight(text, lang ?? 'tsx')) - 1;
        return `<!--code:${i}-->`;
      },
      heading({ tokens, depth, text: source }) {
        const html = this.parser.parseInline(tokens);
        // The id comes from the heading's markdown, not its HTML, and keeps only
        // letters, digits and dashes: "Install `kinetik-ui`" -> "install-kinetik-ui".
        const id = source
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        return `<h${depth + 1} id="${id}">${html}</h${depth + 1}>`;
      },
    },
  });
  const html = await marked.parse(source);
  const rendered = await Promise.all(blocks);
  return html.replace(/<!--code:(\d+)-->/g, (_, i: string) => rendered[Number(i)] ?? '');
}
