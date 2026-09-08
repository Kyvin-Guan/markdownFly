/**
 * CLI contract tests — spawn the built CLI (dist/cli.js) and verify the
 * behaviors the skill layer relies on: exit codes, stdout/stderr discipline,
 * --quiet/--json output, and strict theme validation.
 *
 * Requires a fresh build: package.json runs `tsup` in pretest.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const fixturePng = fileURLToPath(new URL('./fixtures/pixel-400x300.png', import.meta.url));

function runCli(args: string[], cwd?: string) {
  return spawnSync(process.execPath, [cliPath, ...args], { cwd, encoding: 'utf-8' });
}

function normal(p: string): string {
  return p.replace(/\\/g, '/');
}

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mfly-cli-'));
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('mfly CLI contract', () => {
  it('converts a single file: exit 0, summary on stdout, output next to source', () => {
    writeFileSync(join(tmpDir, 'slides.md'), '# Hello\n\nSome content.\n');

    const res = runCli(['slides.md'], tmpDir);

    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Done in');
    expect(existsSync(join(tmpDir, 'slides.pptx'))).toBe(true);
  });

  it('exits 1 with an error on stderr when no files match', () => {
    const res = runCli(['no-such-*.md'], tmpDir);

    expect(res.status).toBe(1);
    expect(res.stdout).toBe('');
    expect(res.stderr).toContain('No .md files found');
  });

  it('exits 1 when --output is used with multiple files', () => {
    writeFileSync(join(tmpDir, 'a.md'), '# A\n');
    writeFileSync(join(tmpDir, 'b.md'), '# B\n');

    const res = runCli(['a.md', 'b.md', '-o', join(tmpDir, 'out.pptx')], tmpDir);

    expect(res.status).toBe(1);
    expect(res.stderr).toContain('single input file');
  });

  it('exits 1 and keeps converting when one file in a batch fails', () => {
    // Non-string theme (list) in frontmatter → getTheme throws → per-file failure.
    writeFileSync(
      join(tmpDir, 'bad.md'),
      '---\ntheme: [clean, dark]\n---\n# Bad\n\nContent.\n',
    );

    const res = runCli(['bad.md', 'a.md'], tmpDir);

    expect(res.status).toBe(1);
    expect(res.stderr).toContain('1 of 2 file(s) failed');
    expect(res.stderr).toContain('Invalid theme value');
    expect(existsSync(join(tmpDir, 'a.pptx'))).toBe(true);
  });

  it('--json prints a single machine-readable result and silences progress', () => {
    writeFileSync(join(tmpDir, 'report.md'), '# Report\n\nContent.\n');
    const res = runCli(['--json', 'report.md'], tmpDir);

    expect(res.status).toBe(0);
    expect(res.stderr).not.toContain('Converting');
    const parsed = JSON.parse(res.stdout) as {
      ok: boolean;
      durationMs: number;
      files: Array<{ input: string; output: string; ok: boolean }>;
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0].ok).toBe(true);
    expect(normal(parsed.files[0].output)).toMatch(/report\.pptx$/);
  });

  it('--json reports per-file failure with ok:false and exit 1', () => {
    const res = runCli(['--json', 'bad.md'], tmpDir);

    expect(res.status).toBe(1);
    const parsed = JSON.parse(res.stdout) as {
      ok: boolean;
      files: Array<{ input: string; ok: boolean; error?: string }>;
    };
    expect(parsed.ok).toBe(false);
    expect(parsed.files[0].ok).toBe(false);
    expect(parsed.files[0].error).toContain('Invalid theme value');
  });

  it('rejects an unknown -t theme with exit 1', () => {
    const res = runCli(['-t', 'bogus', 'slides.md'], tmpDir);

    expect(res.status).toBe(1);
    expect(res.stderr).toContain('Unknown theme "bogus"');
    expect(res.stdout).toBe('');
  });

  it('--quiet suppresses per-file progress but keeps the summary', () => {
    const res = runCli(['--quiet', 'slides.md'], tmpDir);

    expect(res.status).toBe(0);
    expect(res.stderr).not.toContain('Converting');
    expect(res.stdout).toContain('Done in');
  });

  it('respects frontmatter theme when -t is omitted (unknown name warns and falls back)', () => {
    writeFileSync(join(tmpDir, 'fm.md'), '---\ntheme: nope\n---\n# FM\n\nContent.\n');
    const res = runCli(['fm.md'], tmpDir);

    // The frontmatter value must reach getTheme (not be masked by a CLI default).
    expect(res.status).toBe(0);
    expect(res.stderr).toContain('Theme "nope" not found');
  });

  it('resolves resource_dir against the markdown file (not cwd) and warns on missing images', () => {
    mkdirSync(join(tmpDir, 'assets'), { recursive: true });
    cpSync(fixturePng, join(tmpDir, 'assets', 'logo.png'));
    writeFileSync(
      join(tmpDir, 'aidir.md'),
      '---\nresource_dir: assets\n---\n# A\n\n## B\n\n![logo](logo.png)\n\n![missing](nope.png)\n',
    );

    // Run from the test runner's cwd — deliberately different from tmpDir.
    const res = runCli([join(tmpDir, 'aidir.md')]);

    expect(res.status).toBe(0);
    expect(res.stderr).toContain('Image not found: nope.png');
    expect(res.stderr).toContain('assets');
    expect(res.stderr).not.toContain('Image not found: logo.png');
  });
});
