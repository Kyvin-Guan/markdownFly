/**
 * MarkdownFly CLI
 * Usage: mfly <files...> [-o output.pptx] [-t theme] [--quiet|--json]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { convert } from './index.js';
import { expandGlob } from './utils/glob.js';
import { ProgressReporter, log, setQuiet } from './utils/progress.js';
import { themes } from './themes/index.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
) as { version?: string };

const program = new Command();

program
  .name('mfly')
  .description('Markdown to PowerPoint (PPTX)')
  .version(pkg.version ?? '0.0.0');

const themeChoices = Object.keys(themes).filter((name) => name !== 'default');

// Main convert command
program
  .argument('<files...>', 'Markdown files to convert (supports glob)')
  .option('-o, --output <path>', 'Output file path (single file only)')
  .option('-t, --theme <name>', `Theme name (${themeChoices.join(', ')})`)
  .option('--quiet', 'Suppress per-file progress output')
  .option('--json', 'Print machine-readable JSON result to stdout')
  .action(async (
    filePatterns: string[],
    options: { output?: string; theme: string; quiet?: boolean; json?: boolean },
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
      // frontmatter (unknown frontmatter themes fall back to clean with a warning).
      if (options.theme && !themes[options.theme.toLowerCase()]) {
        usageError(`Unknown theme "${options.theme}". Available themes: ${themeChoices.join(', ')}`);
      }

      const startTime = Date.now();
      const results: Array<{ input: string; output?: string; ok: boolean; error?: string }> = [];

      for (const file of files) {
        const progress = new ProgressReporter();
        const fileName = file.split(/[\\/]/).pop() ?? file;

        progress.start(`Converting ${chalk.cyan(fileName)}...`);

        try {
          const outputPath = await convert(file, {
            output: options.output,
            theme: options.theme,
          });

          const outName = outputPath.split(/[\\/]/).pop() ?? outputPath;
          progress.succeed(`${chalk.cyan(fileName)} → ${chalk.green(outName)}`);
          results.push({ input: file, output: outputPath, ok: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          progress.fail(`${chalk.cyan(fileName)}: ${chalk.red(msg)}`);
          results.push({ input: file, ok: false, error: msg });
        }
      }

      const failed = results.filter((r) => !r.ok);

      if (jsonMode) {
        console.log(JSON.stringify({
          ok: failed.length === 0,
          durationMs: Date.now() - startTime,
          files: results,
        }));
      } else {
        if (failed.length > 0) {
          log.error(`${failed.length} of ${files.length} file(s) failed`);
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
