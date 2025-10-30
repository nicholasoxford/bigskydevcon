#!/usr/bin/env node
/**
 * Generate PhotoSwipe dataSource JSON from a processed images folder.
 *
 * Scans the input directory, ignores *_thumbnail.* files, reads image dimensions,
 * and outputs an array of items: { src, width, height, alt }.
 *
 * Usage examples:
 *   node scripts/generate-photoswipe-json.mjs --input ./images-processed
 *   node scripts/generate-photoswipe-json.mjs --input ./images-processed --base-url https://cdn.example.com/gallery --output ./photoswipe.json
 *   node scripts/generate-photoswipe-json.mjs --input ./images-processed --alt-prefix "BSDC"
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

function printHelp() {
  const help = `\nGenerate PhotoSwipe JSON\n\n` +
    `Usage:\n` +
    `  node scripts/generate-photoswipe-json.mjs --input <folder> [--base-url <url>] [--output <file>] [--alt-prefix <text>]\n\n` +
    `Options:\n` +
    `  --input <path>      Required. Folder with processed images\n` +
    `  --base-url <url>    Optional. Base URL to prefix to filenames for src\n` +
    `  --output <file>     Optional. Output file path (default: stdout)\n` +
    `  --alt-prefix <txt>  Optional. Alt text prefix (default: "Image")\n` +
    `  -h, --help          Show help\n`;
  console.log(help);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '-h' || token === '--help') { args.help = true; continue; }
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next == null || next.startsWith('--')) throw new Error(`Expected a value after ${token}`);
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function isImage(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.heic'].includes(ext);
}

function isThumbnail(filename) {
  const base = path.basename(filename);
  const dot = base.lastIndexOf('.');
  const stem = dot >= 0 ? base.slice(0, dot) : base;
  return /_thumbnail$/i.test(stem);
}

function joinUrl(baseUrl, filename) {
  if (!baseUrl) return filename;
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}/${encodeURIComponent(filename)}`;
}

async function main() {
  try {
    const argv = process.argv.slice(2);
    const args = parseArgs(argv);
    if (args.help) { printHelp(); process.exit(0); }

    const inputDir = args.input;
    if (!inputDir) { console.error('Error: --input is required'); printHelp(); process.exit(1); }
    const resolvedInput = path.resolve(inputDir);
    if (!fs.existsSync(resolvedInput) || !fs.statSync(resolvedInput).isDirectory()) {
      console.error(`Error: input directory not found: ${resolvedInput}`);
      process.exit(1);
    }

    const baseUrl = args['base-url'];
    const outputFile = args.output ? path.resolve(args.output) : null;
    const altPrefix = args['alt-prefix'] || 'Image';

    const entries = fs.readdirSync(resolvedInput, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && isImage(e.name) && !isThumbnail(e.name))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (files.length === 0) {
      console.error('No non-thumbnail image files found.');
      process.exit(1);
    }

    // Concurrency control
    const maxConcurrent = 6;
    let cursor = 0;
    const results = new Array(files.length);

    async function worker(workerIndex) {
      while (cursor < files.length) {
        const i = cursor;
        cursor += 1;
        const name = files[i];
        const filePath = path.join(resolvedInput, name);
        try {
          const meta = await sharp(filePath, { failOn: 'none' }).metadata();
          const width = meta.width || 0;
          const height = meta.height || 0;
          results[i] = {
            src: joinUrl(baseUrl, name),
            width,
            height,
            alt: `${altPrefix} ${i + 1}`,
          };
        } catch (err) {
          console.error(`Failed to read metadata for ${name}:`, err?.message || err);
          results[i] = {
            src: joinUrl(baseUrl, name),
            width: 0,
            height: 0,
            alt: `${altPrefix} ${i + 1}`,
          };
        }
      }
    }

    const workers = Array.from({ length: Math.min(maxConcurrent, files.length) }, (_, idx) => worker(idx));
    await Promise.all(workers);

    const json = JSON.stringify(results.filter(Boolean), null, 2);
    if (outputFile) {
      fs.writeFileSync(outputFile, json);
      console.log(`Wrote ${results.length} item(s) to ${outputFile}`);
    } else {
      process.stdout.write(json + '\n');
    }
  } catch (err) {
    console.error('Fatal error:', err?.message || err);
    process.exit(1);
  }
}

main();


