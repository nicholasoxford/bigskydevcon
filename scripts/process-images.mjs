#!/usr/bin/env node
/**
 * Image processing CLI: rename sequentially, compress for web, and create thumbnails.
 *
 * Usage examples:
 *   node scripts/process-images.mjs --input ./assets --output ./assets-processed
 *   node scripts/process-images.mjs --input ./photos --prefix bsdc --quality 82 --thumb-width 400
 *
 * Options:
 *   --input <path>         Required. Folder containing input images
 *   --output <path>        Optional. Output folder (default: <input>-processed)
 *   --prefix <string>      Optional. Base filename prefix (default: image)
 *   --start <number>       Optional. Starting index (default: 1)
 *   --pad <number>         Optional. Zero-pad width; defaults to digits in file count
 *   --quality <1-100>      Optional. Compression quality (default: 82)
 *   --thumb-width <px>     Optional. Thumbnail max width in pixels (default: 400)
 *   --thumb-height <px>    Optional. Thumbnail max height in pixels (default: undefined)
 *   --dry-run              Optional. Show what would happen without writing files
 *   -h, --help             Show help
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import sharp from 'sharp';

function printHelp() {
  const help = `\nImage Processing CLI\n\n` +
    `Renames images sequentially, compresses them for the web, and generates thumbnails with a "_thumbnail" suffix.\n\n` +
    `Usage:\n` +
    `  node scripts/process-images.mjs --input <folder> [--output <folder>] [options]\n\n` +
    `Options:\n` +
    `  --input <path>         Required. Folder containing input images\n` +
    `  --output <path>        Optional. Output folder (default: <input>-processed)\n` +
    `  --prefix <string>      Optional. Base filename prefix (default: image)\n` +
    `  --start <number>       Optional. Starting index (default: 1)\n` +
    `  --pad <number>         Optional. Zero-pad width; defaults to digits in file count\n` +
    `  --quality <1-100>      Optional. Compression quality (default: 82)\n` +
    `  --thumb-width <px>     Optional. Thumbnail max width in pixels (default: 400)\n` +
    `  --thumb-height <px>    Optional. Thumbnail max height in pixels (default: undefined)\n` +
    `  --dry-run              Optional. Show what would happen without writing files\n` +
    `  -h, --help             Show help\n`;
  console.log(help);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '-h' || token === '--help') {
      args.help = true;
      continue;
    }
    if (token === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next == null || next.startsWith('--')) {
        throw new Error(`Expected a value after ${token}`);
      }
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function zeroPad(num, width) {
  const s = String(num);
  if (s.length >= width) return s;
  return '0'.repeat(width - s.length) + s;
}

function getDefaultOutputDir(inputDir) {
  const base = path.basename(path.resolve(inputDir));
  return path.join(path.dirname(path.resolve(inputDir)), `${base}-processed`);
}

function isImageFilename(filename) {
  const ext = path.extname(filename).toLowerCase();
  const allowed = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif', '.heic'
  ]);
  return allowed.has(ext);
}

function detectFormatFromExt(extLower) {
  switch (extLower) {
    case '.jpg':
    case '.jpeg':
      return 'jpeg';
    case '.png':
      return 'png';
    case '.webp':
      return 'webp';
    case '.avif':
      return 'avif';
    default:
      return 'jpeg';
  }
}

async function processOne({
  index,
  inputFilePath,
  mainOutPath,
  thumbOutPath,
  format,
  quality,
  thumbWidth,
  thumbHeight,
  dryRun
}) {
  const relIn = path.relative(process.cwd(), inputFilePath);
  const relMain = path.relative(process.cwd(), mainOutPath);
  const relThumb = path.relative(process.cwd(), thumbOutPath);

  if (dryRun) {
    console.log(`[DRY-RUN] ${index}: ${relIn} -> ${relMain}`);
    console.log(`[DRY-RUN] ${index}: thumbnail -> ${relThumb}`);
    return;
  }

  // Main output
  let pipeline = sharp(inputFilePath, { failOn: 'none' });
  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 9, palette: true });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality });
      break;
    default:
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
  }
  await pipeline.toFile(mainOutPath);

  // Thumbnail output (resize then same format handling)
  let thumb = sharp(inputFilePath, { failOn: 'none' }).resize({
    width: thumbWidth,
    height: thumbHeight,
    fit: 'inside',
    withoutEnlargement: true
  });
  switch (format) {
    case 'jpeg':
      thumb = thumb.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      thumb = thumb.png({ compressionLevel: 9, palette: true });
      break;
    case 'webp':
      thumb = thumb.webp({ quality });
      break;
    case 'avif':
      thumb = thumb.avif({ quality });
      break;
    default:
      thumb = thumb.jpeg({ quality, mozjpeg: true });
      break;
  }
  await thumb.toFile(thumbOutPath);
}

async function main() {
  try {
    const argv = process.argv.slice(2);
    const args = parseArgs(argv);
    if (args.help) {
      printHelp();
      process.exit(0);
    }

    const inputDir = args.input;
    if (!inputDir) {
      console.error('Error: --input <path> is required');
      printHelp();
      process.exit(1);
    }

    const resolvedInput = path.resolve(inputDir);
    if (!fs.existsSync(resolvedInput) || !fs.statSync(resolvedInput).isDirectory()) {
      console.error(`Error: input directory not found: ${resolvedInput}`);
      process.exit(1);
    }

    const outputDir = path.resolve(args.output || getDefaultOutputDir(resolvedInput));
    const prefix = String(args.prefix || 'image');
    const startIndex = args.start ? parseInt(String(args.start), 10) : 1;
    const explicitPad = args.pad ? parseInt(String(args.pad), 10) : undefined;
    const quality = args.quality ? Math.max(1, Math.min(100, parseInt(String(args.quality), 10))) : 82;
    const thumbWidth = args['thumb-width'] ? parseInt(String(args['thumb-width']), 10) : 400;
    const thumbHeight = args['thumb-height'] ? parseInt(String(args['thumb-height']), 10) : undefined;
    const dryRun = Boolean(args['dry-run'] || args.dryRun);

    if (!fs.existsSync(outputDir)) {
      if (!dryRun) fs.mkdirSync(outputDir, { recursive: true });
    } else {
      const stat = fs.statSync(outputDir);
      if (!stat.isDirectory()) {
        console.error(`Error: output path exists and is not a directory: ${outputDir}`);
        process.exit(1);
      }
    }

    const entries = fs.readdirSync(resolvedInput, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && isImageFilename(e.name))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    if (files.length === 0) {
      console.error('No image files found in input directory.');
      process.exit(1);
    }

    const padWidth = explicitPad && explicitPad > 0 ? explicitPad : String(files.length + startIndex - 1).length;

    console.log(`Processing ${files.length} image(s)`);
    console.log(`Input:  ${resolvedInput}`);
    console.log(`Output: ${outputDir}`);
    console.log(`Prefix: ${prefix}`);
    console.log(`Start:  ${startIndex} (pad ${padWidth})`);
    console.log(`Quality: ${quality}`);
    console.log(`Thumb: width=${thumbWidth}${thumbHeight ? ` height=${thumbHeight}` : ''}`);
    if (dryRun) console.log('Mode:   DRY RUN (no files will be written)');

    const cpu = Math.max(1, Math.min(os.cpus()?.length || 1, 4));
    let active = 0;
    let idx = startIndex;
    let cursor = 0;

    const runNext = async () => {
      if (cursor >= files.length) return;
      if (active >= cpu) return;
      const name = files[cursor];
      cursor += 1;
      active += 1;
      const thisIndex = idx;
      idx += 1;

      const inputFilePath = path.join(resolvedInput, name);
      const extLower = path.extname(name).toLowerCase();
      const format = detectFormatFromExt(extLower);
      const padded = zeroPad(thisIndex, padWidth);
      const base = `${prefix}-${padded}`;
      const outMain = path.join(outputDir, `${base}${extLower || '.jpg'}`);
      const outThumb = path.join(outputDir, `${base}_thumbnail${extLower || '.jpg'}`);

      try {
        await processOne({
          index: thisIndex,
          inputFilePath,
          mainOutPath: outMain,
          thumbOutPath: outThumb,
          format,
          quality,
          thumbWidth,
          thumbHeight,
          dryRun
        });
        console.log(`${thisIndex}: Wrote ${path.basename(outMain)} and ${path.basename(outThumb)}`);
      } catch (err) {
        console.error(`${thisIndex}: Failed on ${name}:`, err?.message || err);
      } finally {
        active -= 1;
        await runNext();
      }
    };

    const starters = Array.from({ length: Math.min(cpu, files.length) }, () => runNext());
    await Promise.all(starters);

    // Drain the rest
    while (cursor < files.length || active > 0) {
      // eslint-disable-next-line no-await-in-loop
      await runNext();
    }

    console.log('Done.');
  } catch (err) {
    console.error('Fatal error:', err?.message || err);
    process.exit(1);
  }
}

main();


