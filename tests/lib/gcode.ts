// Just enough G-code parsing for assertions: modal G0/G1/G2/G3 moves with absolute XYZ.
export type Move = { g: 0 | 1 | 2 | 3; x: number; y: number; z: number; line: number };

export function parseMoves(text: string): Move[] {
  const moves: Move[] = [];
  let g: Move["g"] | undefined;
  let x = 0, y = 0, z = 0;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/\(.*?\)|;.*$/g, "").trim().toUpperCase();
    if (!line || line === "%") return;
    let moved = false;
    for (const [, letter, num] of line.matchAll(/([A-Z])\s*(-?\d*\.?\d+)/g)) {
      const v = parseFloat(num);
      if (letter === "G" && [0, 1, 2, 3].includes(v)) g = v as Move["g"];
      if (letter === "G" && (v === 91 || v === 28)) return; // incremental / home moves aren't toolpath
      if (letter === "X") { x = v; moved = true; }
      if (letter === "Y") { y = v; moved = true; }
      if (letter === "Z") { z = v; moved = true; }
    }
    if (moved && g !== undefined) moves.push({ g, x, y, z, line: i + 1 });
  });
  return moves;
}

export type Box = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

export function objBounds(obj: string): Box {
  const b: Box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const l of obj.split(/\r?\n/)) {
    const m = l.match(/^v\s+(\S+)\s+(\S+)\s+(\S+)/);
    if (!m) continue;
    const [x, y, z] = m.slice(1, 4).map(Number);
    b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x);
    b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y);
    b.minZ = Math.min(b.minZ, z); b.maxZ = Math.max(b.maxZ, z);
  }
  return b;
}
