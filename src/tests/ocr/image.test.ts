import { describe, expect, it } from 'vitest';
import { adaptiveThreshold, skewDegrees, toGray } from '../../core/ocr/image';

/** A page of text lines (dark bars) leaning `tilt` degrees clockwise. */
function lines(tilt: number, width = 400, height = 400): Uint8ClampedArray {
  const page = new Uint8ClampedArray(width * height).fill(255);
  const tan = Math.tan((tilt * Math.PI) / 180);
  for (let y0 = 40; y0 < height - 40; y0 += 24) {
    for (let x = 20; x < width - 20; x += 1) {
      const y = Math.round(y0 + (x - width / 2) * tan);
      for (let t = 0; t < 8; t += 1) if (y + t >= 0 && y + t < height && (x % 9) < 7) page[(y + t) * width + x] = 0;
    }
  }
  return page;
}

describe('reading paper photos', () => {
  it('turns RGBA into gray', () => {
    expect(Array.from(toGray(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])))).toEqual([255, 0]);
  });

  it('keeps text black and the page white across a shadow', () => {
    const width = 200;
    const height = 60;
    const gray = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) gray[y * width + x] = 230 - Math.round((x / width) * 110);
    for (let x = 20; x < 180; x += 2) for (let y = 25; y < 33; y += 1) gray[y * width + x] -= 90;
    const bin = adaptiveThreshold(gray, width, height);
    const whiteLeft = bin[5 * width + 5];
    const whiteRight = bin[5 * width + 190];
    expect(whiteLeft).toBe(255);
    expect(whiteRight).toBe(255);
    expect(bin[28 * width + 22]).toBe(0);
    expect(bin[28 * width + 172]).toBe(0);
  });

  it('finds how far the lines lean, and leaves level pages alone', () => {
    expect(skewDegrees(lines(0), 400, 400)).toBe(0);
    for (const tilt of [3, -4, 6]) expect(Math.abs(skewDegrees(lines(tilt), 400, 400) + tilt)).toBeLessThanOrEqual(0.75);
  });

  it('does not turn a nearly empty page', () => {
    expect(skewDegrees(new Uint8ClampedArray(100 * 100).fill(255), 100, 100)).toBe(0);
  });
});
