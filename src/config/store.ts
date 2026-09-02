/**
 * Config Store
 * Manages ~/.markdownfly/config.json for API keys and settings
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG_DIR = join(homedir(), '.markdownfly');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig(): Record<string, string> {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function saveConfig(config: Record<string, string>): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/** Set a config value */
export function configSet(key: string, value: string): void {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

/** Get a config value (raw) */
export function configGet(key: string): string | undefined {
  const config = loadConfig();
  return config[key];
}

/** Mask sensitive values for display */
function maskValue(key: string, value: string): string {
  if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')) {
    if (value.length <= 8) return '****';
    return value.slice(0, 4) + '...' + value.slice(-4);
  }
  return value;
}

/** Get a config value with masking for display */
export function configGetMasked(key: string): string | undefined {
  const value = configGet(key);
  if (!value) return undefined;
  return maskValue(key, value);
}

/** Delete a config value */
export function configDelete(key: string): boolean {
  const config = loadConfig();
  if (!(key in config)) return false;
  delete config[key];
  saveConfig(config);
  return true;
}

/** List all config keys and masked values */
export function configList(): Record<string, string> {
  const config = loadConfig();
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    masked[key] = maskValue(key, value);
  }
  return masked;
}
