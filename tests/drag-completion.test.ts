import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import { cancel } from "../src/drag";
import type { Piece } from "../src/types";

const rect = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 800,
  bottom: 800,
  width: 800,
  height: 800,
  toJSON: () => ({}),
};
const rook: Piece = { role: "r-piece", color: "white" };

function board(config: Parameters<typeof Chessground>[1] = {}) {
  const root = document.createElement("div");
  document.body.append(root);
  const api = Chessground(root, { animation: { enabled: false }, ...config });
  const el = root.querySelector("cg-board") as HTMLElement;
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect);
  api.state.dom.bounds.clear();
  return { api, el };
}

function drag(api: ReturnType<typeof Chessground>, orig: string, piece: Piece, fromPocket = false) {
  const element = document.createElement("piece");
  api.state.draggable.current = {
    orig,
    piece,
    origPos: [50, 750],
    pos: [50, 750],
    started: true,
    element,
    originTarget: null,
    keyHasChanged: true,
    fromPocket,
  };
}

function release(x: number, y: number) {
  return new MouseEvent("mouseup", { bubbles: true, clientX: x, clientY: y });
}

afterEach(() => vi.restoreAllMocks());

describe("drag completion and pocket safety contracts", () => {
  it("moves a piece through document mouseup and clears drag state", () => {
    const { api } = board({ fen: "8/8/8/8/8/8/8/R7", movable: { free: true, color: "white" } });
    drag(api, "a1", rook);
    api.state.dom.elements.board.dispatchEvent(release(50, 650));
    expect(api.state.boardState.pieces.get("a2")).toEqual(rook);
    expect(api.state.boardState.pieces.has("a1")).toBe(false);
    expect(api.state.draggable.current).toBeUndefined();
    api.destroy();
  });

  it("does not move a piece when dropped outside the board by default", () => {
    const { api } = board({ fen: "8/8/8/8/8/8/8/R7", movable: { free: true, color: "white" } });
    drag(api, "a1", rook);
    api.state.dom.elements.board.dispatchEvent(release(900, 900));
    expect(api.state.boardState.pieces.get("a1")).toEqual(rook);
    expect(api.state.draggable.current).toBeUndefined();
    api.destroy();
  });

  it("removes a dropped-off piece when deleteOnDropOff is enabled", () => {
    const { api } = board({ fen: "8/8/8/8/8/8/8/R7", draggable: { deleteOnDropOff: true } });
    drag(api, "a1", rook);
    api.state.dom.elements.board.dispatchEvent(release(900, 900));
    expect(api.state.boardState.pieces.has("a1")).toBe(false);
    api.destroy();
  });

  it("cancels an unfinished temporary pocket drag without changing inventory", () => {
    const { api } = board({
      fen: "8/8/8/8/8/8/8/8[R]",
      pocketRoles: { white: ["r-piece"], black: [] },
    });
    api.state.boardState.pieces.set("a0", rook);
    drag(api, "a0", rook, true);
    cancel(api.state);
    expect(api.state.boardState.pieces.has("a0")).toBe(false);
    expect(api.state.boardState.pockets?.white.get("r-piece")).toBe(1);
    expect(api.state.draggable.current).toBeUndefined();
    api.destroy();
  });

  it("completes a pocket drop on an empty square and decrements inventory", () => {
    const { api } = board({
      fen: "8/8/8/8/8/8/8/8[R]",
      pocketRoles: { white: ["r-piece"], black: [] },
      movable: { color: "white", free: true },
    });
    api.state.boardState.pieces.set("a0", rook);
    drag(api, "a0", rook, true);
    api.state.dom.elements.board.dispatchEvent(release(250, 550));
    expect(api.state.boardState.pieces.get("c3")).toEqual(rook);
    expect(api.state.boardState.pockets?.white.get("r-piece")).toBe(0);
    expect(api.state.boardState.pieces.has("a0")).toBe(false);
    api.destroy();
  });

  it("rejects a pocket drop on an occupied square without consuming inventory", () => {
    const { api } = board({
      fen: "8/8/8/8/8/8/8/R7[R]",
      pocketRoles: { white: ["r-piece"], black: [] },
      movable: { color: "white", free: true },
    });
    api.state.boardState.pieces.set("a0", rook);
    drag(api, "a0", rook, true);
    api.state.dom.elements.board.dispatchEvent(release(50, 750));
    expect(api.state.boardState.pieces.get("a1")).toEqual(rook);
    expect(api.state.boardState.pockets?.white.get("r-piece")).toBe(1);
    expect(api.state.boardState.pieces.has("a0")).toBe(false);
    api.destroy();
  });
});
