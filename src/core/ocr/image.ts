/*
 * Making a phone photo of paper easier to read, as plain arrays (no canvas): gray, a threshold that follows the light
 * across the page (a shadow or a curled receipt does not turn half of it black), and how far the lines of text lean.
 */

/** Gray (0-255) from canvas pixels (RGBA). */
export function toGray(rgba: Uint8ClampedArray | Uint8Array): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(rgba.length / 4);
  for (let i = 0, j = 0; j < gray.length; i += 4, j += 1) gray[j] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
  return gray;
}

/**
 * Black text on white by the mean of the pixels around each one (Bradley and Roth, with an integral image): a pixel is
 * ink when it is `drop` (0.12) darker than its surroundings. `radius` is about a line's height; 0 chooses from the width.
 */
export function adaptiveThreshold(gray: Uint8ClampedArray, width: number, height: number, radius = 0, drop = 0.12): Uint8ClampedArray {
  const r = radius || Math.max(8, Math.round(width / 40));
  const sums = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y += 1) {
    let row = 0;
    for (let x = 0; x < width; x += 1) {
      row += gray[y * width + x];
      sums[(y + 1) * (width + 1) + x + 1] = sums[y * (width + 1) + x + 1] + row;
    }
  }
  const out = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(height - 1, y + r);
    for (let x = 0; x < width; x += 1) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(width - 1, x + r);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum = sums[(y1 + 1) * (width + 1) + x1 + 1] - sums[y0 * (width + 1) + x1 + 1] - sums[(y1 + 1) * (width + 1) + x0] + sums[y0 * (width + 1) + x0];
      out[y * width + x] = gray[y * width + x] * area < sum * (1 - drop) ? 0 : 255;
    }
  }
  return out;
}

/**
 * The turn (degrees, clockwise as a canvas rotates, within ±`limit`) that makes lines of text level: the angle at which
 * the rows of ink are the most uneven (text lines and the gaps between them). 0 when nothing leans clearly.
 */
export function skewDegrees(binary: Uint8ClampedArray, width: number, height: number, limit = 8, step = 0.5): number {
  const stride = Math.max(1, Math.round(Math.max(width, height) / 500));
  const ink: number[] = [];
  for (let y = 0; y < height; y += stride) for (let x = 0; x < width; x += stride) if (binary[y * width + x] === 0) ink.push(x, y);
  if (ink.length < 200) return 0;
  const rows = Math.ceil((Math.hypot(width, height) + 2) / stride);
  let best = 0;
  let bestScore = -1;
  let flat = 0;
  for (let angle = -limit; angle <= limit + 1e-9; angle += step) {
    const sin = Math.sin((angle * Math.PI) / 180);
    const cos = Math.cos((angle * Math.PI) / 180);
    const profile = new Float64Array(rows);
    for (let i = 0; i < ink.length; i += 2) {
      const row = Math.round((ink[i] * sin + ink[i + 1] * cos) / stride + rows / 2);
      if (row >= 0 && row < rows) profile[row] += 1;
    }
    let score = 0;
    for (let i = 1; i < rows; i += 1) score += (profile[i] - profile[i - 1]) ** 2;
    if (Math.abs(angle) < 1e-9) flat = score;
    if (score > bestScore) {
      bestScore = score;
      best = angle;
    }
  }
  // Only turn when the leaning reading is clearly better than level (5% more uneven).
  return bestScore > flat * 1.05 ? best : 0;
}
