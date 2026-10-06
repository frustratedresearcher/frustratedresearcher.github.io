# infosecravi blog

Astro source. Builds into `../blog/`, which GitHub Pages serves statically at
https://infosecravi.com/blog/ — the main site (`index.html`) is untouched by this.

## Write a post

1. Create `src/content/blog/my-post-slug.md`
2. Front matter:

```yaml
---
title: "Post title"
description: "One sentence. Used as the meta description and the search snippet."
pubDate: 2026-10-06
tags: ["LLM Security", "AI Red Teaming"]
tldr: "The answer, stated plainly in 2-3 sentences. This is what answer engines quote."
faq:
  - q: "A question someone would actually type"
    a: "A direct, self-contained answer."
---
```

`tldr` and `faq` are the AEO levers — `tldr` becomes `abstract` + `speakable` in
the BlogPosting schema, `faq` becomes FAQPage schema. Both are optional but worth
filling in: they are what gets lifted into AI answers and rich results.

Set `draft: true` to keep a post out of the build.

3. Build and publish:

```bash
cd blog-src
npm run build          # writes ../blog/
cd ..
git add -A && git commit -m "post: my post slug" && git push
```

## Local preview

```bash
cd blog-src && npm run dev     # http://localhost:4321/blog/
```
