import { describe, expect, it } from "vitest";
import { predrop } from "../src/predrop";
import { read } from "../src/fen";
import type { Color, Piece, Role } from "../src/types";

const dimensions = { width: 8, height: 8 };
const empty = read(Array(8).fill("8").join("/"), dimensions);
const destinations = (variant: string, role: Role, color: Color) =>
  predrop(variant, dimensions)(empty, { role, color } as Piece);

// Protect every special-case drop mobility branch that the earlier suite did not exercise.
describe("remaining fork-specific predrop rules", () => {
  it.each(["sittuyin", "shogun", "synochess", "shinobi", "torishogi", "mansindam"])(
    "%s returns only encoded board squares",
    (variant) => {
      for (const color of ["white", "black"] as const) {
        const keys = destinations(variant, "p-piece", color);
        expect(keys.every((key) => /^[a-h][1-8]$/.test(key))).toBe(true);
        expect(new Set(keys).size).toBe(keys.length);
      }
    },
  );

  it("Sittuyin confines rooks to home rank and other pieces to their home three ranks", () => {
    expect(destinations("sittuyin", "r-piece", "white")).toHaveLength(8);
    expect(destinations("sittuyin", "r-piece", "white")).toContain("a1");
    expect(destinations("sittuyin", "r-piece", "black")).toContain("a8");
    expect(destinations("sittuyin", "r-piece", "black")).not.toContain("a7");
    expect(destinations("sittuyin", "b-piece", "white")).toHaveLength(24);
    expect(destinations("sittuyin", "b-piece", "white")).toContain("a3");
    expect(destinations("sittuyin", "b-piece", "white")).not.toContain("a4");
    expect(destinations("sittuyin", "b-piece", "black")).toContain("a6");
    expect(destinations("sittuyin", "b-piece", "black")).not.toContain("a5");
  });

  it("Shogun allows only five ranks counting from each player's side", () => {
    expect(destinations("shogun", "q-piece", "white")).toHaveLength(40);
    expect(destinations("shogun", "q-piece", "white")).toContain("a5");
    expect(destinations("shogun", "q-piece", "white")).not.toContain("a6");
    expect(destinations("shogun", "q-piece", "black")).toContain("a4");
    expect(destinations("shogun", "q-piece", "black")).not.toContain("a3");
  });

  it("Synochess confines both colors to literal rank five", () => {
    for (const color of ["white", "black"] as const) {
      expect(destinations("synochess", "r-piece", color)).toEqual([
        "a5",
        "b5",
        "c5",
        "d5",
        "e5",
        "f5",
        "g5",
        "h5",
      ]);
    }
  });

  it("Shinobi confines either color to ranks one through four", () => {
    for (const color of ["white", "black"] as const) {
      const keys = destinations("shinobi", "n-piece", color);
      expect(keys).toHaveLength(32);
      expect(keys).toContain("a1");
      expect(keys).toContain("a4");
      expect(keys).not.toContain("a5");
    }
  });

  it("Tori Shogi restricts swallows but not other roles", () => {
    expect(destinations("torishogi", "s-piece", "white")).toHaveLength(56);
    expect(destinations("torishogi", "s-piece", "white")).not.toContain("a8");
    expect(destinations("torishogi", "s-piece", "black")).not.toContain("a1");
    expect(destinations("torishogi", "r-piece", "white")).toHaveLength(64);
  });

  it("Mansindam restricts pawns to all but final rank", () => {
    expect(destinations("mansindam", "p-piece", "white")).toHaveLength(56);
    expect(destinations("mansindam", "p-piece", "white")).not.toContain("a8");
    expect(destinations("mansindam", "p-piece", "black")).not.toContain("a1");
    expect(destinations("mansindam", "n-piece", "white")).toHaveLength(64);
  });

  it.each(["kyotoshogi", "dobutsu", "chennis", "unknown-variant"])(
    "%s defaults to unrestricted squares",
    (variant) => {
      expect(destinations(variant, "p-piece", "white")).toHaveLength(64);
    },
  );
});
