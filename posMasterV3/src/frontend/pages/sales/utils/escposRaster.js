// Thermal roll print settings. The rendered receipt is converted to a
// monochrome ESC/POS raster image so Sinhala text and the current receipt
// layout print without relying on fonts.
//
// Both print paths are sized from THERMAL_PRINT_WIDTH_DOTS -- the printhead's
// dot count -- and never from the paper width. An "80mm" roll only images ~72mm
// (576 dots @ 203dpi), and the driver anchors output at the head's first dot,
// so sizing to the paper runs content off the right edge with no paper to
// catch it. Everything below derives from the head, not the roll.
export const THERMAL_PAGE_HEIGHT_MM = 297;
export const THERMAL_PRINT_WIDTH_DOTS = 576;
export const THERMAL_PRINT_DPI = 203;
export const THERMAL_PRINT_WIDTH_MM = (THERMAL_PRINT_WIDTH_DOTS / THERMAL_PRINT_DPI) * 25.4;
export const THERMAL_RASTER_CHUNK_HEIGHT = 256;
export const THERMAL_IMAGE_THRESHOLD = 190;
export const THERMAL_TRAILING_FEED_LINES = 5;
export const THERMAL_NETWORK_PRINT_TIMEOUT_MS = 5000;
export const RECEIPT_CANVAS_SCALE = 2;
export const MM_TO_PT = 2.83465;

function appendBytes(target, bytes) {
  for (const byte of bytes) target.push(byte);
}

export function buildEscposRasterCommand(sourceCanvas) {
  if (!sourceCanvas || sourceCanvas.width <= 0 || sourceCanvas.height <= 0) {
    throw new Error("Receipt image is empty");
  }

  const targetWidth = THERMAL_PRINT_WIDTH_DOTS;
  const targetHeight = Math.max(
    1,
    Math.ceil((sourceCanvas.height * targetWidth) / sourceCanvas.width)
  );
  const rasterCanvas = document.createElement("canvas");
  rasterCanvas.width = targetWidth;
  rasterCanvas.height = targetHeight;

  const rasterCtx = rasterCanvas.getContext("2d", { willReadFrequently: true });
  if (!rasterCtx) throw new Error("Failed to create receipt raster context");
  rasterCtx.fillStyle = "#ffffff";
  rasterCtx.fillRect(0, 0, targetWidth, targetHeight);
  rasterCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  const { data } = rasterCtx.getImageData(0, 0, targetWidth, targetHeight);
  const widthBytes = Math.ceil(targetWidth / 8);
  const raster = new Uint8Array(widthBytes * targetHeight);

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const pixelIndex = (y * targetWidth + x) * 4;
      const alpha = data[pixelIndex + 3];
      if (alpha < 128) continue;

      const red = data[pixelIndex];
      const green = data[pixelIndex + 1];
      const blue = data[pixelIndex + 2];
      const luminance = red * 0.299 + green * 0.587 + blue * 0.114;

      if (luminance < THERMAL_IMAGE_THRESHOLD) {
        const byteIndex = y * widthBytes + (x >> 3);
        raster[byteIndex] |= 0x80 >> (x & 7);
      }
    }
  }

  const command = [];
  appendBytes(command, [0x1b, 0x40]); // Initialize printer
  appendBytes(command, [0x1b, 0x61, 0x01]); // Center raster image

  for (let y = 0; y < targetHeight; y += THERMAL_RASTER_CHUNK_HEIGHT) {
    const chunkHeight = Math.min(THERMAL_RASTER_CHUNK_HEIGHT, targetHeight - y);
    const xL = widthBytes & 0xff;
    const xH = (widthBytes >> 8) & 0xff;
    const yL = chunkHeight & 0xff;
    const yH = (chunkHeight >> 8) & 0xff;

    appendBytes(command, [0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

    const start = y * widthBytes;
    const end = start + chunkHeight * widthBytes;
    for (let index = start; index < end; index += 1) {
      command.push(raster[index]);
    }
  }

  appendBytes(command, [0x1b, 0x61, 0x00]); // Left align after image
  appendBytes(command, Array(THERMAL_TRAILING_FEED_LINES).fill(0x0a));
  appendBytes(command, [0x1d, 0x56, 0x00]); // Full cut where supported

  return new Uint8Array(command);
}
