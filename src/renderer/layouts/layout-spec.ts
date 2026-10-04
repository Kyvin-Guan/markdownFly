/**
 * Shared layout-spec helpers — theme.layouts.* with hard-coded fallbacks.
 */

import type PptxGenJS from 'pptxgenjs';
import type { Theme, ThemeLayoutSpec, ThemeLayouts } from '../../models/theme.js';

export function layoutSpec(theme: Theme, key: keyof ThemeLayouts): ThemeLayoutSpec {
  return theme.layouts?.[key] ?? {};
}

export function specNumber(
  value: number | undefined,
  fallback: number,
): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function specAlign(
  value: 'left' | 'center' | 'right' | undefined,
  fallback: 'left' | 'center' | 'right',
): 'left' | 'center' | 'right' {
  return value ?? fallback;
}

export function extraNumber(
  spec: ThemeLayoutSpec,
  key: string,
  fallback: number,
): number {
  const v = spec.extra?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function extraBoolean(
  spec: ThemeLayoutSpec,
  key: string,
  fallback: boolean,
): boolean {
  const v = spec.extra?.[key];
  return typeof v === 'boolean' ? v : fallback;
}

export function extraString(
  spec: ThemeLayoutSpec,
  key: string,
  fallback: string,
): string {
  const v = spec.extra?.[key];
  return typeof v === 'string' && v ? v : fallback;
}

/**
 * Resolve horizontal margins from a layout spec.
 * `margin` applies to both sides; `marginLeft`/`marginRight` override each side.
 */
export function resolveSideMargins(
  spec: ThemeLayoutSpec,
  fallback: number,
): { left: number; right: number } {
  const base = specNumber(spec.margin, fallback);
  return {
    left: specNumber(spec.extra?.marginLeft as number | undefined, base),
    right: specNumber(spec.extra?.marginRight as number | undefined, base),
  };
}

export function titleRuleHeight(spec: ThemeLayoutSpec, fallback: number): number {
  return extraNumber(spec, 'titleRuleHeight', fallback);
}

export function titleRuleRole(spec: ThemeLayoutSpec): 'primary' | 'secondary' | 'divider' {
  const v = spec.extra?.titleRuleColor;
  return v === 'secondary' || v === 'divider' ? v : 'primary';
}

export function ruleColor(
  theme: Theme,
  role: 'primary' | 'secondary' | 'divider',
): string {
  if (role === 'secondary') return theme.colors.secondary;
  if (role === 'divider') return theme.colors.divider ?? theme.colors.secondary;
  return theme.colors.primary;
}

/** Draw a solid rectangle rule (horizontal or vertical depending on w/h) */
export function addHRuler(
  slide: PptxGenJS.Slide,
  opts: { x: number; y: number; w: number; h: number; color: string },
): void {
  slide.addShape('rect' as PptxGenJS.ShapeType, {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fill: { color: opts.color },
  });
}
