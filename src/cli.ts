/**
 * MarkdownFly CLI
 * Usage: mfly <files...> [-o output.pptx] [-t theme] [--color c] [--text t]
 *        [--layout l] [--quiet|--json]
 *
 * `-t` is the user-facing theme name:
 *   - ThemePreset (e.g. blue) — color × text × layout
 *   - ColorScheme (e.g. ocean, ocean-dark) — color only
 * Default theme when omitted: blue
 *
 * Free composition (each optional and overrides the theme's slot):
 *   --color <name>   color scheme override
 *   --text <name>    text / font scheme override
 *   --layout <name>  layout scheme override
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { convert } from './index.js';
import { expandGlob } from './utils/glob.js';
import { ProgressReporter, log, setQuiet } from './utils/progress.js';
import { takeSyntaxWarnings, type SyntaxDiagnostic } from './utils/diagnostics.js';
import {
  hasTheme,
  themeNames,
  getColorScheme,
  getTextScheme,
  getLayoutScheme,
  listColorSchemes,
  listTextSchemes,
  listLayoutSchemes,
  listThemePresets,
} from './themes/index.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
) as { version?: string };

const program = new Command();

program
  .name('mfly')
  .description('Markdown to PowerPoint (PPTX)')
  .version(pkg.version ?? '0.0.0');

const themeChoices = themeNames();

const presetChoices = listThemePresets()
  .map((p) => p.name)
  .join(', ');
const colorChoices = listColorSchemes()
  .map((s) => s.name)
  .join(', ');
const textChoices = listTextSchemes()
  .map((s) => s.name)
  .join(', ');
const layoutChoices = listLayoutSchemes()
  .map((s) => s.name)
  .join(', ');

// Main convert command
program
  .argument('<files...>', 'Markdown files to convert (supports glob)')
  .option('-o, --output <path>', 'Output file path (single file only)')
  .option('-t, --theme <name>', `Theme preset (${presetChoices}) or color scheme (${colorChoices})`)
  .option('--color <name>', `Color scheme override (${colorChoices})`)
  .option('--text <name>', `Text scheme override (${textChoices})`)
  .option('--layout <name>', `Layout scheme override (${layoutChoices})`)
  .option('--quiet', 'Suppress per-file progress output')
  .option('--json', 'Print machine-readable JSON result to stdout')
  .action(async (
    filePatterns: string[],
    options: {
      output?: string;
      theme: string;
      color?: string;
      text?: string;
      layout?: string;
      quiet?: boolean;
      json?: boolean;
    },
  ) => {
    const jsonMode = Boolean(options.json);
    if (jsonMode || options.quiet) setQuiet(true);

    const usageError = (msg: string): never => {
      log.error(msg);
      if (jsonMode) console.log(JSON.stringify({ ok: false, error: msg }));
      process.exit(1);
    };

    try {
      const files = await expandGlob(filePatterns);

      if (files.length === 0) {
        usageError('No .md files found matching the given pattern(s)');
      }

      if (options.output && files.length > 1) {
        usageError('--output can only be used with a single input file');
      }

      // Strict theme validation. When -t is omitted, the theme comes from
      // frontmatter or the default theme (blue).
      if (options.theme && !hasTheme(options.theme)) {
        usageError(`Unknown theme "${options.theme}". Available themes: ${themeChoices.join(', ')}`);
      }

      // Strict slot validation for the free-composition flags.
      if (options.color && !getColorScheme(options.color)) {
        usageError(`Unknown color scheme "${options.color}". Available: ${colorChoices}`);
      }
      if (options.text && !getTextScheme(options.text)) {
        usageError(`Unknown text scheme "${options.text}". Available: ${textChoices}`);
      }
      if (options.layout && !getLayoutScheme(options.layout)) {
        usageError(`Unknown layout scheme "${options.layout}". Available: ${layoutChoices}`);
      }

      const startTime = Date.now();
      type FileWarning = Pick<SyntaxDiagnostic, 'file' | 'line' | 'message' | 'hint'>;
      const results: Array<{
        input: string;
        output?: string;
        ok: boolean;
        error?: string;
        warnings?: FileWarning[];
      }> = [];
      let warningCount = 0;

      for (const file of files) {
        const progress = new ProgressReporter();
        const fileName = file.split(/[\\/]/).pop() ?? file;

        progress.start(`Converting ${chalk.cyan(fileName)}...`);

        try {
          const outputPath = await convert(file, {
            output: options.output,
            theme: options.theme,
            colorScheme: options.color,
            textScheme: options.text,
            layoutScheme: options.layout,
          });

          const outName = outputPath.split(/[\\/]/).pop() ?? outputPath;
          progress.succeed(`${chalk.cyan(fileName)} → ${chalk.green(outName)}`);
          const warnings = takeSyntaxWarnings();
          warningCount += warnings.length;
          results.push({ input: file, output: outputPath, ok: true, warnings });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          progress.fail(`${chalk.cyan(fileName)}: ${chalk.red(msg)}`);
          const warnings = takeSyntaxWarnings();
          warningCount += warnings.length;
          results.push({ input: file, ok: false, error: msg, warnings });
        }
      }

      const failed = results.filter((r) => !r.ok);

      if (jsonMode) {
        console.log(JSON.stringify({
          ok: failed.length === 0,
          durationMs: Date.now() - startTime,
          warningCount,
          files: results,
        }));
      } else {
        if (failed.length > 0) {
          log.error(`${failed.length} of ${files.length} file(s) failed`);
        }
        if (warningCount > 0) {
          log.warn(
            `${warningCount} syntax warning(s) — the deck was generated anyway. ` +
              'Fix the listed lines in the markdown and re-run to apply the corrections.',
          );
        }
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        log.info(`Done in ${elapsed}s`);
      }

      if (failed.length > 0) {
        process.exit(1);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(msg);
      if (jsonMode) console.log(JSON.stringify({ ok: false, error: msg }));
      process.exit(1);
    }
  });

program.parse();
