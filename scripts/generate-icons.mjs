import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

// Colgate maroon color
const MAROON = '#821019';

// Create a simple icon with a car/ride symbol
async function createIcon(size, outputPath) {
  // Create SVG with car icon on maroon background
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${MAROON}" rx="${size * 0.15}"/>
      <g transform="translate(${size * 0.15}, ${size * 0.25}) scale(${size / 100})">
        <!-- Simplified car/ride arrows icon -->
        <path d="M10 25 L40 25 M40 25 L32 17 M40 25 L32 33"
              stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M60 45 L30 45 M30 45 L38 37 M30 45 L38 53"
              stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`Created: ${outputPath}`);
}

async function main() {
  // Ensure icons directory exists
  await mkdir(iconsDir, { recursive: true });

  // Generate icons
  await createIcon(192, join(iconsDir, 'icon-192x192.png'));
  await createIcon(512, join(iconsDir, 'icon-512x512.png'));

  console.log('Icons generated successfully!');
}

main().catch(console.error);
