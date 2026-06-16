import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

const tokenNames = [
  'mode-reading-bg',
  'mode-reading-panel',
  'mode-reading-cyan',
  'mode-reading-link',
  'mode-reading-text',
  'mode-reading-heading',
  'mode-reading-muted',
  'mode-reading-contrast',
];

const tokens = Object.fromEntries(tokenNames.map(name => {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) {
    throw new Error(`Missing readable hex token: --${name}`);
  }
  return [name, match[1]];
}));

const checks = [
  ['body text on reading page', 'mode-reading-text', 'mode-reading-bg', 4.5],
  ['muted text on reading page', 'mode-reading-muted', 'mode-reading-bg', 4.5],
  ['accent text on reading page', 'mode-reading-cyan', 'mode-reading-bg', 4.5],
  ['link text on reading page', 'mode-reading-link', 'mode-reading-bg', 4.5],
  ['body text on reading panel', 'mode-reading-text', 'mode-reading-panel', 4.5],
  ['muted text on reading panel', 'mode-reading-muted', 'mode-reading-panel', 4.5],
  ['accent text on reading panel', 'mode-reading-cyan', 'mode-reading-panel', 4.5],
  ['link text on reading panel', 'mode-reading-link', 'mode-reading-panel', 4.5],
  ['light text on accent button', 'mode-reading-contrast', 'mode-reading-cyan', 4.5],
];

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16));
}

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [red, green, blue] = hexToRgb(hex).map(linearize);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

const failures = [];

for (const [label, foregroundToken, backgroundToken, minimum] of checks) {
  const foreground = tokens[foregroundToken];
  const background = tokens[backgroundToken];
  const ratio = contrastRatio(foreground, background);
  const result = `${label}: ${ratio.toFixed(2)}:1`;
  if (ratio < minimum) {
    failures.push(`${result} below ${minimum}:1 (${foreground} on ${background})`);
  } else {
    console.log(`${result} passed (${foreground} on ${background})`);
  }
}

if (failures.length > 0) {
  console.error(`Reading contrast check failed:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('Reading contrast check passed.');
