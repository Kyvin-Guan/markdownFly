/**
 * PPTX Renderer
 * Orchestrates pptxgenjs to produce .pptx files from Presentation
 */

import PptxGenJS from 'pptxgenjs';
import type { Presentation } from '../models/slide.js';
import type { Theme } from '../models/theme.js';
import { renderSlideLayout } from './layouts/index.js';
import { highlightCode } from './code-highlighter.js';
import { resolveImage, resolveVideo } from './image-handler.js';
import { resolveVideoCover } from './video-cover.js';
import { renderDiagram } from '../diagrams/index.js';
import { slideBackground } from './background.js';

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Render a Presentation to a .pptx file
 */
export async function renderPresentation(
  presentation: Presentation,
  theme: Theme,
  outputPath: string,
  inputPath: string = '',
): Promise<void> {
  const pptx = new PptxGenJS();

  // Configure presentation
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 = 13.33" x 7.5"
  pptx.author = presentation.config.author ?? 'MarkdownFly';
  pptx.title = presentation.slides[0]?.title ?? 'Presentation';

  const { resourceDir } = presentation.config;
  // Frontmatter resource_dir: relative paths are relative to the source file,
  // not the process cwd (agents may run from anywhere). basePath is a directory.
  const resourceBase = resourceDir
    ? resolve(dirname(inputPath), resourceDir)
    : dirname(inputPath);
  const backgroundProps = slideBackground(theme);

  // Build render context
  const ctx = {
    highlightCode: async (code: string, language: string, highlightLines: number[] = []) => {
      return highlightCode(code, language, theme, highlightLines) as unknown as Promise<PptxGenJS.TextProps[]>;
    },
    resolveImage: async (src: string) => {
      return resolveImage(src, resourceBase);
    },
    resolveVideo: async (src: string) => {
      return resolveVideo(src, resourceBase);
    },
    resolveVideoCover: (() => {
      // Frames are extracted with external tools; never pay for the same
      // video twice within one conversion.
      const cache = new Map<string, { data: string; source: 'poster' | 'frame' | 'themed' } | undefined>();
      return async (videoPath: string, poster?: string) => {
        const key = `${videoPath}\u0000${poster ?? ''}`;
        if (!cache.has(key)) {
          cache.set(key, await resolveVideoCover(videoPath, poster, theme, resourceBase));
        }
        return cache.get(key);
      };
    })(),
    renderDiagram: async (diagramType: string, code: string, box?: { width: number; height: number }) => {
      return renderDiagram(diagramType, code, theme, box);
    },
    footerTemplate: presentation.config.footer,
    pageNumber: 0,
    totalSlides: presentation.slides.length,
    currentSection: '',
    sectionNumber: 0,
  };

  // Render each slide
  for (let i = 0; i < presentation.slides.length; i++) {
    const node = presentation.slides[i];
    const slide = pptx.addSlide();

    // Set default background (flat color or theme gradient image)
    slide.background = backgroundProps;

    ctx.pageNumber = i + 1;
    if (node.layout === 'section') {
      if (node.title) ctx.currentSection = node.title;
      // Auto-increment section sequence before drawing, so the first section
      // slide shows "01" and every following one continues the count.
      ctx.sectionNumber = (ctx.sectionNumber ?? 0) + 1;
    }

    await renderSlideLayout(slide, node, theme, ctx);
  }

  // Write file using nodebuffer for 100% reliable path handling across OS
  const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
  writeFileSync(outputPath, Buffer.from(buffer));
}
