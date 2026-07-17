// Generate PWA icons from an SVG source using sharp.
const sharp = require("sharp");
const path = require("path");

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#d946ef"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <path d="M256 120 L360 168 V264 C360 332 312 372 256 392 C200 372 152 332 152 264 V168 Z"
        fill="white" fill-opacity="0.95"/>
  <path d="M232 248 L248 280 L296 216" stroke="#7c3aed" stroke-width="20"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const OUT = path.join(__dirname, "..", "public", "icons");

async function main() {
  await sharp(Buffer.from(SVG)).resize(192, 192).png().toFile(path.join(OUT, "icon-192.png"));
  await sharp(Buffer.from(SVG)).resize(512, 512).png().toFile(path.join(OUT, "icon-512.png"));
  const padded = `
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#7c3aed"/>
    <g transform="translate(64,64) scale(0.75)">
      ${SVG.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
    </g>
  </svg>`;
  await sharp(Buffer.from(padded)).resize(512, 512).png().toFile(path.join(OUT, "icon-512-maskable.png"));
  await sharp(Buffer.from(SVG)).resize(180, 180).png().toFile(path.join(OUT, "apple-touch-icon.png"));
  await sharp(Buffer.from(SVG)).resize(32, 32).png().toFile(path.join(OUT, "favicon-32.png"));
  console.log("Icons generated.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
