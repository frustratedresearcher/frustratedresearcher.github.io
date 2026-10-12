import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../consts';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site,
    items: [
      {
        title: 'Trustmap — agentic AI threat-modeling lab',
        description:
          'A free, browser-based lab for threat-modeling agentic AI systems: map agents, tools, data and the handoffs between them, surface excessive agency and implicit-authority handoffs, and get a secure blueprint. Runs entirely in the browser.',
        pubDate: new Date('2026-10-13'),
        categories: ['agentic ai', 'threat modeling', 'ai security', 'tools'],
        link: 'https://infosecravi.com/trustmap/',
      },
      ...posts.map((p) => ({
        title: p.data.title,
        description: p.data.tldr ?? p.data.description,
        pubDate: p.data.pubDate,
        categories: p.data.tags,
        link: `${SITE.base}/${p.id}/`,
      })),
    ],
  });
}
