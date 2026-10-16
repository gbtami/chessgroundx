import { afterEach, describe, expect, it, vi } from "vitest";
import {
  baseMove,
  getKeyAtDomPos,
  getSnappedKeyAtDomPos,
  playPremove,
  select,
  userMove,
} from "../src/board";
import { configure } from "../src/config";
import { defaults } from "../src/state";
import type { BoardDimensions, Key } from "../src/types";
import { computeSquareCenter, pos2key } from "../src/util";

const bounds = { left: 40, top: 70, width: 900, height: 1000 } as ClientRect;
const empty16 = Array(16).fill("16").join("/");

afterEach(() => vi.useRealTimers());

describe("preserved move and drop integration boundaries", () => {
  it.each([
    [false, false, undefined],
    [false, true, "a1"],
    [true, false, "a1"],
  ] as const)("selectable=%s draggable=%s selects %s", (selectable, draggable, selected) => {
    const state = defaults();
    configure(state, {
      fen: "8/8/8/8/8/8/8/R7",
      selectable: { enabled: selectable },
      draggable: { enabled: draggable },
    });
    select(state, "a1");
    expect(state.selectable.selected).toBe(selected);
  });

  it("queues only injected premove candidates and replays against current legal destinations", () => {
    vi.useFakeTimers();
    const hook = vi.fn(() => ["p@" as const]);
    const after = vi.fn();
    const state = defaults();
    configure(state, {
      dimensions: { width: 16, height: 16 },
      fen: `+R15/${Array(15).fill("16").join("/")}`,
      turnColor: "black",
      movable: { color: "white", free: false, events: { after } },
      premovable: { premoveFunc: hook },
    });
    select(state, "a@");
    expect(hook).toHaveBeenCalledWith(state.boardState, "a@", true);
    expect(state.premovable.dests).toEqual(["p@"]);
    expect(userMove(state, "a@", "b@", false)).toBe(false);
    expect(state.premovable.current).toBeUndefined();
    expect(userMove(state, "a@", "p@", false)).toBe(true);
    expect(state.premovable.current).toEqual(["a@", "p@"]);
    configure(state, { turnColor: "white", movable: { dests: new Map([["a@", ["b@"]]]) } });
    expect(playPremove(state)).toBe(false);
    expect(state.premovable.current).toBeUndefined();
    expect(state.boardState.pieces.has("a@")).toBe(true);
    configure(state, { turnColor: "black" });
    expect(userMove(state, "a@", "p@", false)).toBe(true);
    configure(state, { turnColor: "white", movable: { dests: new Map([["a@", ["p@"]]]) } });
    expect(playPremove(state)).toBe(true);
    expect(state.boardState.pieces.get("p@")).toMatchObject({ role: "pr-piece", promoted: true });
    expect(state.lastMove).toEqual(["a@", "p@"]);
    expect(after).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(after).toHaveBeenCalledExactlyOnceWith("a@", "p@", { premove: true });
  });

  it.each(["accepted", "occupied", "empty-pocket"])(
    "preserves inventory for %s predrop replay",
    (mode) => {
      vi.useFakeTimers();
      const piece = { role: "r-piece" as const, color: "white" as const };
      const hook = vi.fn(() => ["p@" as const]);
      const afterNewPiece = vi.fn();
      const state = defaults();
      configure(state, {
        dimensions: { width: 16, height: 16 },
        fen: `${empty16}[R]`,
        pocketRoles: { white: ["r-piece"], black: [] },
        turnColor: "black",
        movable: { color: "white", free: false, events: { afterNewPiece } },
        premovable: { predropFunc: hook },
      });
      select(state, piece);
      expect(hook).toHaveBeenCalledWith(state.boardState, piece);
      expect(state.premovable.dests).toEqual(["p@"]);
      expect(userMove(state, piece, "p@", true)).toBe(true);
      expect(state.premovable.current).toEqual(["R@", "p@"]);
      expect(state.boardState.pockets?.white.get("r-piece")).toBe(1);
      if (mode === "occupied")
        state.boardState.pieces.set("p@", { role: "z-piece", color: "black" });
      if (mode === "empty-pocket") state.boardState.pockets!.white.set("r-piece", 0);
      configure(state, { turnColor: "white", movable: { dests: new Map([["R@", ["p@"]]]) } });
      expect(playPremove(state)).toBe(mode === "accepted");
      expect(state.premovable.current).toBeUndefined();
      expect(state.boardState.pockets?.white.get("r-piece")).toBe(mode === "occupied" ? 1 : 0);
      expect(state.boardState.pieces.get("p@")?.role).toBe(
        mode === "accepted" ? "r-piece" : mode === "occupied" ? "z-piece" : undefined,
      );
      vi.runAllTimers();
      if (mode === "accepted")
        expect(afterNewPiece).toHaveBeenCalledExactlyOnceWith(piece, "p@", { premove: true });
      else expect(afterNewPiece).not.toHaveBeenCalled();
    },
  );
});

describe("preserved castling geometry", () => {
  it.each([
    ["g1", "h1", "g1", "f1"],
    ["f1", "g1", "g1", "f1"],
    ["d1", "c1", "c1", "d1"],
    ["c8", "a8", "c8", "d8"],
  ] as const)("handles Chess960 king %s and rook %s", (orig, rook, kingDest, rookDest) => {
    const state = defaults();
    const color = orig[1] === "8" ? "black" : "white";
    state.boardState.pieces = new Map([
      [orig, { role: "k-piece", color }],
      [rook, { role: "r-piece", color }],
    ]);
    expect(baseMove(state, orig, rook)).toBe(true);
    expect(state.boardState.pieces.size).toBe(2);
    expect(state.boardState.pieces.get(kingDest)).toEqual({ role: "k-piece", color });
    expect(state.boardState.pieces.get(rookDest)).toEqual({ role: "r-piece", color });
  });

  it("retains black queenside Capablanca castling on a 10x8 board", () => {
    const state = defaults();
    configure(state, { dimensions: { width: 10, height: 8 }, fen: "r4k4/10/10/10/10/10/10/10" });
    expect(baseMove(state, "f8", "c8")).toBe(true);
    expect(state.boardState.pieces.get("c8")?.role).toBe("k-piece");
    expect(state.boardState.pieces.get("d8")?.role).toBe("r-piece");
    expect(state.boardState.pieces.has("a8")).toBe(false);
  });
});

describe("dimension-aware hit testing and drawing snap", () => {
  const cases = [
    { width: 5, height: 5 },
    { width: 9, height: 10 },
    { width: 10, height: 8 },
    { width: 16, height: 16 },
  ].flatMap((dimensions) => [true, false].map((asWhite) => ({ dimensions, asWhite })));

  it.each(cases)(
    "keeps corner/origin snapping for $dimensions, white POV=$asWhite",
    ({ dimensions, asWhite }) => {
      for (const key of ["a1", pos2key([dimensions.width - 1, dimensions.height - 1])] as Key[]) {
        const center = computeSquareCenter(key, asWhite, bounds, dimensions);
        expect(getKeyAtDomPos(center, asWhite, bounds, dimensions)).toBe(key);
        expect(getSnappedKeyAtDomPos(key, center, asWhite, bounds, dimensions)).toBe(key);
      }
      expect(
        getKeyAtDomPos([bounds.left + bounds.width, bounds.top], asWhite, bounds, dimensions),
      ).toBeUndefined();
      expect(
        getKeyAtDomPos([bounds.left - 1, bounds.top], asWhite, bounds, dimensions),
      ).toBeUndefined();
    },
  );

  it.each([true, false])(
    "retains Janggi elephant snapping only on 9x10 (white POV=%s)",
    (asWhite) => {
      for (const dimensions of [
        { width: 9, height: 10 },
        { width: 16, height: 16 },
      ] satisfies BoardDimensions[]) {
        const center = computeSquareCenter("d3", asWhite, bounds, dimensions);
        const key = getSnappedKeyAtDomPos("a1", center, asWhite, bounds, dimensions);
        if (dimensions.width === 9) expect(key).toBe("d3");
        else expect(key).not.toBe("d3");
      }
    },
  );
});
