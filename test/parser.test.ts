import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/parser/index.js';

describe('Parser', () => {
  it('should parse frontmatter and slides correctly', () => {
    const md = `---
theme: default
author: Alice
---

# My Presentation Title

---

## Slide 2: Points

- First point
- Second point
- Third point

---

## Code Example

\`\`\`typescript
const greeting: string = "Hello World";
console.log(greeting);
\`\`\`

---

> To be or not to be, that is the question.
> — Shakespeare
`;

    const result = parseMarkdown(md);

    expect(result.config.theme).toBe('default');
    expect(result.config.author).toBe('Alice');
    expect(result.slides.length).toBe(4);

    // Slide 1: Title
    expect(result.slides[0].layout).toBe('title');
    expect(result.slides[0].title).toBe('My Presentation Title');

    // Slide 2: Points (Content)
    expect(result.slides[1].layout).toBe('content');
    expect(result.slides[1].title).toBe('Slide 2: Points');
    const listElem = result.slides[1].elements.find(e => e.type === 'list');
    expect(listElem).toBeDefined();
    if (listElem && listElem.type === 'list') {
      expect(listElem.items.length).toBe(3);
    }

    // Slide 3: Code
    expect(result.slides[2].layout).toBe('code');
    expect(result.slides[2].title).toBe('Code Example');
    const codeElem = result.slides[2].elements.find(e => e.type === 'code');
    expect(codeElem).toBeDefined();

    // Slide 4: Quote
    expect(result.slides[3].layout).toBe('quote');
    const quoteElem = result.slides[3].elements.find(e => e.type === 'blockquote');
    expect(quoteElem).toBeDefined();
  });

  it('should distinguish diagram code blocks from regular code blocks', () => {
    const md = `
# Diagrams Demo

---

\`\`\`mermaid
graph TD;
    A-->B;
\`\`\`

---

\`\`\`dot
digraph G {
  A -> B;
}
\`\`\`

---

\`\`\`echarts
{
  "series": []
}
\`\`\`
`;

    const result = parseMarkdown(md);
    expect(result.slides.length).toBe(4);

    const mermaidSlide = result.slides[1];
    expect(mermaidSlide.elements[0].type).toBe('diagram');
    if (mermaidSlide.elements[0].type === 'diagram') {
      expect(mermaidSlide.elements[0].diagramType).toBe('mermaid');
    }

    const dotSlide = result.slides[2];
    expect(dotSlide.elements[0].type).toBe('diagram');
    if (dotSlide.elements[0].type === 'diagram') {
      expect(dotSlide.elements[0].diagramType).toBe('dot');
    }

    const echartsSlide = result.slides[3];
    expect(echartsSlide.elements[0].type).toBe('diagram');
    if (echartsSlide.elements[0].type === 'diagram') {
      expect(echartsSlide.elements[0].diagramType).toBe('echarts');
    }
  });
});
