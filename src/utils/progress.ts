/**
 * Progress display using ora spinner + chalk
 */

import ora, { type Ora } from 'ora';
import chalk from 'chalk';

let quiet = false;

/** Suppress all per-file progress output (errors/summaries are still printed). */
export function setQuiet(value: boolean): void {
  quiet = value;
}

export class ProgressReporter {
  private spinner: Ora;

  constructor() {
    this.spinner = ora();
  }

  start(text: string): void {
    if (quiet) return;
    this.spinner.start(text);
  }

  update(text: string): void {
    if (quiet) return;
    this.spinner.text = text;
  }

  succeed(text: string): void {
    if (quiet) return;
    this.spinner.succeed(text);
  }

  fail(text: string): void {
    if (quiet) return;
    this.spinner.fail(text);
  }

  info(text: string): void {
    if (quiet) return;
    this.spinner.info(text);
  }
}

export const log = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  warn: (msg: string) => console.error(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.error(chalk.red('✖'), msg),
};
