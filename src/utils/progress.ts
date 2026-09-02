/**
 * Progress display using ora spinner + chalk
 */

import ora, { type Ora } from 'ora';
import chalk from 'chalk';

export class ProgressReporter {
  private spinner: Ora;

  constructor() {
    this.spinner = ora();
  }

  start(text: string): void {
    this.spinner.start(text);
  }

  update(text: string): void {
    this.spinner.text = text;
  }

  succeed(text: string): void {
    this.spinner.succeed(text);
  }

  fail(text: string): void {
    this.spinner.fail(text);
  }

  info(text: string): void {
    this.spinner.info(text);
  }
}

export const log = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✔'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.log(chalk.red('✖'), msg),
};
