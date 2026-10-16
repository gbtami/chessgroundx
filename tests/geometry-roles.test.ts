import { describe, expect, it } from "vitest";
import * as cg from "../src/types";
import {
  allKeys,
  allPos,
  dropOrigOf,
  isDropOrig,
  isKey,
  key2pos,
  letterOf,
  pieceClasses,
  pieceSide,
  pos2key,
  posToTranslate,
  roleOf,
} from "../src/util";

describe("ChessgroundX extended board coordinates", () => {
  it.each([
    [8, 8],
    [9, 10],
    [10, 8],
    [12, 12],
    [16, 16],
  ])("covers exactly %i by %i squares", (width, height) => {
    const keys = allKeys({ width, height });
    expect(keys).toHaveLength(width * height);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[0]).toBe("a1");
    expect(keys.at(-1)).toBe(`${cg.files[width - 1]}${cg.ranks[height - 1]}`);
    expect(allPos({ width, height }).map(pos2key)).toEqual(keys);
  });
  it("encodes ranks ten through sixteen as punctuation, never multi-character squares", () => {
    expect(cg.ranks.slice(9)).toEqual([":", ";", "<", "=", ">", "?", "@"]);
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 16; y++) {
        const pos: cg.Pos = [x, y];
        const key = pos2key(pos);
        expect(key).toHaveLength(2);
        expect(key2pos(key)).toEqual(pos);
      }
    expect(pos2key([15, 15])).toBe("p@");
  });
  it("maps corner pixels correctly under both orientations on rectangular boards", () => {
    const bounds = { left: 0, top: 0, width: 900, height: 1000 } as ClientRect;
    const translate = posToTranslate(bounds, { width: 9, height: 10 });
    expect(translate([0, 0], true)).toEqual([0, 900]);
    expect(translate([8, 9], true)).toEqual([800, 0]);
    expect(translate([0, 0], false)).toEqual([800, 0]);
    expect(translate([8, 9], false)).toEqual([0, 900]);
  });
});

describe("letter-based roles and drop origins", () => {
  it.each([
    ["P", "p-piece", "p"],
    ["+R", "pr-piece", "+r"],
    ["*", "_-piece", "*"],
    ["Z", "z-piece", "z"],
  ])("converts %s to %s and back", (letter, role, output) => {
    expect(roleOf(letter as cg.Letter)).toBe(role);
    expect(letterOf(role as cg.Role)).toBe(output);
  });
  it("distinguishes uppercase drop origins from lowercase board keys, including rank 16", () => {
    expect(dropOrigOf("r-piece")).toBe("R@");
    expect(isDropOrig("R@")).toBe(true);
    expect(isDropOrig("a@")).toBe(false);
    expect(isKey("a@")).toBe(true);
    expect(roleOf("R@")).toBe("r-piece");
  });
  it("provides ally/enemy and promoted/mirror CSS classes independent of color", () => {
    const piece: cg.Piece = { role: "pr-piece", color: "black", promoted: true, mirror: true };
    expect(pieceSide(piece, "black")).toBe("ally");
    expect(pieceSide(piece, "white")).toBe("enemy");
    expect(pieceClasses(piece, "white")).toContain("enemy");
    expect(pieceClasses(piece, "black")).toContain("ally");
    expect(pieceClasses(piece, "white")).toContain("promoted");
    expect(pieceClasses(piece, "white")).toContain("mirror");
    expect(pieceClasses(piece, "white")).toContain("pr-piece");
  });
});
