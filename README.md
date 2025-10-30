# Big Sky Dev Con Website

## Goals

Communicate purpose of the conference and provide a way for people to register for the conference.

One page website with a link to a google form

No build step 😎

## Color scheme

- primary: `#0e567c`
- secondary: `#B6D6CC`

## Image processing CLI

Rename images sequentially, compress them for the web, and generate thumbnails with a `_thumbnail` suffix.

Setup (once):

1. Install Node.js (18+ recommended)
2. Run `npm install`

Usage:

- Basic:

  - `npm run process-images -- --input ./images`

- Custom output and prefix:

  - `npm run process-images -- --input ./images --output ./images-processed --prefix bsdc`

- Control quality and thumbnail size:

  - `npm run process-images -- --input ./images --quality 82 --thumb-width 400`

Notes:

- Output defaults to a new folder named `<input>-processed`.
- Files are renamed like `image-001.jpg` with an accompanying `image-001_thumbnail.jpg`.
- Supported inputs: jpg, jpeg, png, webp, tiff, avif, heic (HEIC/AVIF require libvips support in sharp).

## Generate PhotoSwipe JSON

Create a JSON `dataSource` from a processed images folder (ignores `*_thumbnail.*`).

Examples:

- From local folder to stdout:

  - `npm run generate-photoswipe-json -- --input ./images-processed`

- With CDN base URL and write to a file:

  - `npm run generate-photoswipe-json -- --input ./images-processed --base-url https://cdn.example.com/2025_gallery --output ./photoswipe.json`

- Custom alt prefix:

  - `npm run generate-photoswipe-json -- --input ./images-processed --alt-prefix "BSDC"`
