/**
 * MarkdownFly CLI
 * Usage: mfly <files...> [-o output.pptx] [-t theme] [--ai]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { convert } from './index.js';
import { expandGlob } from './utils/glob.js';
import { ProgressReporter, log } from './utils/progress.js';
import { configSet, configGetMasked, configDelete, configList } from './config/store.js';

const program = new Command();

program
  .name('mfly')
  .description('AI-powered Markdown to PPT')
  .version('0.1.0');

// Main convert command
program
  .argument('<files...>', 'Markdown files to convert (supports glob)')
  .option('-o, --output <path>', 'Output file path (single file only)')
  .option('-t, --theme <name>', 'Theme name', 'default')
  .option('--ai', 'Enable AI enhancement')
  .action(async (filePatterns: string[], options: { output?: string; theme: string; ai?: boolean }) => {
    try {
      const files = await expandGlob(filePatterns);

      if (files.length === 0) {
        log.error('No .md files found matching the given pattern(s)');
        process.exit(1);
      }

      if (options.output && files.length > 1) {
        log.error('--output can only be used with a single input file');
        process.exit(1);
      }

      const startTime = Date.now();

      for (const file of files) {
        const progress = new ProgressReporter();
        const fileName = file.split(/[\\/]/).pop() ?? file;

        progress.start(`Converting ${chalk.cyan(fileName)}...`);

        try {
          const outputPath = await convert(file, {
            output: options.output,
            theme: options.theme,
            ai: options.ai,
          });

          const outName = outputPath.split(/[\\/]/).pop() ?? outputPath;
          progress.succeed(`${chalk.cyan(fileName)} → ${chalk.green(outName)}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          progress.fail(`${chalk.cyan(fileName)}: ${chalk.red(msg)}`);
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log.info(`Done in ${elapsed}s`);
    } catch (err) {
      log.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// Config subcommand
const configCmd = program
  .command('config')
  .description('Manage configuration');

configCmd
  .command('set <key> <value>')
  .description('Set a config value')
  .action((key: string, value: string) => {
    configSet(key, value);
    log.success(`Set ${chalk.cyan(key)}`);
  });

configCmd
  .command('get <key>')
  .description('Get a config value')
  .action((key: string) => {
    const value = configGetMasked(key);
    if (value === undefined) {
      log.warn(`Key "${key}" not found`);
    } else {
      console.log(`${chalk.cyan(key)}: ${value}`);
    }
  });

configCmd
  .command('delete <key>')
  .description('Delete a config value')
  .action((key: string) => {
    if (configDelete(key)) {
      log.success(`Deleted ${chalk.cyan(key)}`);
    } else {
      log.warn(`Key "${key}" not found`);
    }
  });

configCmd
  .command('list')
  .description('List all config values')
  .action(() => {
    const config = configList();
    const entries = Object.entries(config);
    if (entries.length === 0) {
      log.info('No configuration set');
      return;
    }
    for (const [key, value] of entries) {
      console.log(`  ${chalk.cyan(key)}: ${value}`);
    }
  });

program.parse();
