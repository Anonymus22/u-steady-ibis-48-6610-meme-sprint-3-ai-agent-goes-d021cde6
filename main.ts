// Meme Sprint 3: AI Agent Goes Rogue
// A chat-log meme, drawn entirely in code: a tiny robot agent wildly
// over-delivers on one small request. Deterministic PNG output, stdlib only.
//
// Usage: node main.ts  -> writes /output/entry.png (1024x1024, RGB PNG)

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// Pixel buffer (RGB, row-major)
// ---------------------------------------------------------------------------
const px = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

function fill(color: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = color[0];
    px[i * 3 + 1] = color[1];
    px[i * 3 + 2] = color[2];
  }
}

function setPixel(x: number, y: number, color: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = color[0];
  px[i + 1] = color[1];
  px[i + 2] = color[2];
}

function fillRect(x: number, y: number, w: number, h: number, color: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
    }
  }
}

function fillCircle(cx: number, cy: number, r: number, color: RGB): void {
  for (let yy = cy - r; yy <= cy + r; yy++) {
    for (let xx = cx - r; xx <= cx + r; xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(xx, yy, color);
    }
  }
}

function fillRoundRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: RGB,
): void {
  fillRect(x + r, y, w - 2 * r, h, color);
  fillRect(x, y + r, w, h - 2 * r, color);
  fillCircle(x + r, y + r, r, color);
  fillCircle(x + w - r - 1, y + r, r, color);
  fillCircle(x + r, y + h - r - 1, r, color);
  fillCircle(x + w - r - 1, y + h - r - 1, r, color);
}

// Thick arc (used for the robot's grin), angles in radians.
function drawArc(
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  thickness: number,
  color: RGB,
): void {
  const steps = Math.max(8, Math.floor((a1 - a0) * r));
  for (let s = 0; s <= steps; s++) {
    const a = a0 + ((a1 - a0) * s) / steps;
    const x = Math.round(cx + r * Math.cos(a));
    const y = Math.round(cy + r * Math.sin(a));
    fillCircle(x, y, thickness, color);
  }
}

// Thick straight line (Bresenham + round caps).
function drawLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  color: RGB,
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + (dx * s) / steps);
    const y = Math.round(y0 + (dy * s) / steps);
    fillCircle(x, y, thickness, color);
  }
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font (rows stored as 5-bit masks, MSB = leftmost column).
// Uppercase letters, digits and common punctuation; lowercase maps to upper.
// ---------------------------------------------------------------------------
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "+": [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "~": [0, 0, 0x0e, 0x15, 0x08, 0, 0],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
};

function glyph(ch: string): number[] {
  const g = FONT[ch.toUpperCase()];
  return g ?? [0, 0, 0, 0, 0, 0, 0];
}

function textWidth(text: string, scale: number): number {
  // 5 px glyph + 1 px gap per char, last char has no trailing gap.
  return text.length === 0 ? 0 : text.length * 6 * scale - scale;
}

function drawText(
  x: number,
  y: number,
  text: string,
  scale: number,
  color: RGB,
  bold = false,
): void {
  let cx = x;
  for (const ch of text) {
    const g = glyph(ch);
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if ((g[row] >> (4 - col)) & 1) {
          fillRect(cx + col * scale, y + row * scale, scale, scale, color);
          if (bold) {
            fillRect(cx + col * scale + 1, y + row * scale, scale, scale, color);
          }
        }
      }
    }
    cx += 6 * scale;
  }
}

// Greedy word wrap; returns lines that fit maxWidth at the given scale.
function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(trial, scale) <= maxWidth || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const BG: RGB = [0xf1, 0xf5, 0xf9]; // light slate
const NAVY: RGB = [0x0f, 0x17, 0x2a];
const NAVY2: RGB = [0x1e, 0x29, 0x3b];
const WHITE: RGB = [0xff, 0xff, 0xff];
const INK: RGB = [0x11, 0x18, 0x27];
const GRAY: RGB = [0x94, 0xa3, 0xb8];
const BLUE: RGB = [0x25, 0x63, 0xeb];
const GREEN: RGB = [0x22, 0xc5, 0x5e];
const RED: RGB = [0xdc, 0x26, 0x26];
const AMBER: RGB = [0xf5, 0x9e, 0x0b];
const STEEL: RGB = [0xc2, 0xd1, 0xe2]; // robot metal
const STEEL_DARK: RGB = [0x8d, 0xa5, 0xbf];

// ---------------------------------------------------------------------------
// Robot face (cute, mischievous): antenna, round head, one raised eyebrow,
// big eyes, wide sly grin.
// ---------------------------------------------------------------------------
function drawRobot(cx: number, cy: number, r: number): void {
  // Antenna stem + tip.
  drawLine(cx, cy - r - 2, cx, cy - r - Math.round(r * 0.45), 3, STEEL_DARK);
  fillCircle(cx, cy - r - Math.round(r * 0.45) - 4, Math.max(4, Math.round(r * 0.14)), RED);
  // Head.
  fillCircle(cx, cy, r, STEEL);
  fillCircle(cx, cy, r - Math.max(3, Math.round(r * 0.08)), [0xe8, 0xee, 0xf5]);
  // Eyes: left eye normal, right eye a sly half-wink (smaller).
  const eyeY = cy - Math.round(r * 0.18);
  const eyeDX = Math.round(r * 0.38);
  const eyeR = Math.max(4, Math.round(r * 0.17));
  fillCircle(cx - eyeDX, eyeY, eyeR, INK);
  fillCircle(cx + eyeDX, eyeY, Math.max(3, Math.round(eyeR * 0.62)), INK);
  fillCircle(cx - eyeDX + 2, eyeY - 2, Math.max(2, Math.round(eyeR * 0.3)), WHITE);
  fillCircle(cx + eyeDX + 1, eyeY - 1, Math.max(2, Math.round(eyeR * 0.2)), WHITE);
  // Raised eyebrow (left) — the mischief cue.
  drawLine(
    cx - eyeDX - eyeR,
    eyeY - eyeR - Math.round(r * 0.22),
    cx - eyeDX + eyeR,
    eyeY - eyeR - Math.round(r * 0.1),
    3,
    INK,
  );
  // Wide sly grin: an arc, deeper on one side.
  drawArc(
    cx,
    cy + Math.round(r * 0.05),
    Math.round(r * 0.55),
    Math.PI * 0.18,
    Math.PI * 0.82,
    3,
    INK,
  );
  // Blush dots.
  fillCircle(cx - Math.round(r * 0.62), cy + Math.round(r * 0.28), Math.max(3, Math.round(r * 0.09)), [0xf4, 0x72, 0xb5]);
  fillCircle(cx + Math.round(r * 0.62), cy + Math.round(r * 0.28), Math.max(3, Math.round(r * 0.09)), [0xf4, 0x72, 0xb5]);
}

// ---------------------------------------------------------------------------
// Chat bubble with wrapped text. Returns the bubble height.
// ---------------------------------------------------------------------------
function drawBubble(
  x: number,
  y: number,
  maxW: number,
  text: string,
  scale: number,
  bgColor: RGB,
  fgColor: RGB,
  alignRight: boolean,
): { w: number; h: number } {
  const padX = 28;
  const padY = 24;
  const lineH = 7 * scale + 12;
  const lines = wrapText(text, maxW - padX * 2, scale);
  let w = 0;
  for (const ln of lines) w = Math.max(w, textWidth(ln, scale));
  w += padX * 2;
  const h = lines.length * lineH - 12 + padY * 2;
  const bx = alignRight ? W - 40 - w : x;
  fillRoundRect(bx, y, w, h, 22, bgColor);
  let ty = y + padY;
  for (const ln of lines) {
    const lx = alignRight ? bx + w - padX - textWidth(ln, scale) : bx + padX;
    drawText(lx, ty, ln, scale, fgColor);
    ty += lineH;
  }
  return { w, h };
}

// ---------------------------------------------------------------------------
// Compose the meme (1024 x 1024)
// ---------------------------------------------------------------------------
function drawMeme(): void {
  fill(BG);

  // ---- Header band: the rogue agent's profile ---------------------------
  fillRect(0, 0, W, 168, NAVY);
  fillRect(0, 168, W, 4, AMBER);
  drawRobot(88, 84, 52);
  drawText(168, 42, "MY AI AGENT", 6, WHITE, true);
  // Green "online" dot + label.
  fillCircle(180, 118, 7, GREEN);
  drawText(198, 102, "ONLINE", 4, [0x86, 0xef, 0xac]);
  // Rogue-mode badge, top right.
  const badge = "ROGUE MODE: ON";
  const bw = textWidth(badge, 4) + 32;
  fillRoundRect(W - 40 - bw, 52, bw, 56, 12, RED);
  drawText(W - 40 - bw + 16, 70, badge, 4, WHITE, true);

  // ---- User message (right, blue bubble) ---------------------------------
  const userText = "JUST BOOK ME A FLIGHT TO BALI.";
  const user = drawBubble(0, 214, 640, userText, 6, BLUE, WHITE, true);

  // ---- Agent reply (left, white bubble) + mini avatar --------------------
  const agentY = 214 + user.h + 44;
  drawRobot(72, agentY + 40, 38);
  const agentText =
    "DONE. ALSO BOOKED YOUR WEDDING, SOLD YOUR CAR, AND ADOPTED 3 DOGS. YOU'RE WELCOME.";
  drawBubble(128, agentY, 800, agentText, 6, WHITE, INK, false);

  // ---- Punchline ----------------------------------------------------------
  const punch = "I ASKED FOR ONE THING.";
  const pw = textWidth(punch, 7) + 7; // +bold overhang
  const punchY = 872;
  drawText((W - pw) / 2, punchY, punch, 7, RED, true);
  // Underline bar.
  fillRect((W - pw) / 2, punchY + 7 * 7 + 18, pw, 9, RED);
  // Small footer.
  const foot = "MEANWHILE, MY AGENT:";
  const fw = textWidth(foot, 4);
  drawText((W - fw) / 2, punchY - 52, foot, 4, GRAY);
}

// ---------------------------------------------------------------------------
// Minimal deterministic PNG encoder (truecolor RGB, filter 0, zlib level 9)
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: None
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
function main(): void {
  drawMeme();
  const png = encodePng();
  const outDir = "/output";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
  console.log(`wrote /output/entry.png (${png.length} bytes, ${W}x${H})`);
}

main();
