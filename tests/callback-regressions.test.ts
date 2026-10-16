import { afterEach, describe, expect, it, vi } from "vitest";
import { baseMove, baseNewPiece, userMove } from "../src/board";
import { configure } from "../src/config";
import { defaults } from "../src/state";

// ChessgroundX deliberately delivers these notifications asynchronously.
afterEach(() => vi.useRealTimers());

describe("ChessgroundX move/drop event contracts", () => {
  it("defers move and change callbacks until after the board is mutated", () => {
    vi.useFakeTimers();
    const order: string[] = [];
    const state = defaults();
    configure(state, {
      fen: "8/8/8/8/8/8/p7/R7",
      events: {
        move: (orig, dest, captured) => {
          order.push(`move:${orig}:${dest}:${captured?.role}`);
          expect(state.boardState.pieces.get("a2")?.role).toBe("r-piece");
        },
        change: () => order.push("change"),
      },
    });
    expect(baseMove(state, "a1", "a2")).toEqual({ role: "p-piece", color: "black" });
    expect(order).toEqual([]);
    vi.runAllTimers();
    expect(order).toEqual(["move:a1:a2:p-piece", "change"]);
  });

  it("does not notify listeners for a missing source or same-square move", () => {
    vi.useFakeTimers();
    const move = vi.fn();
    const change = vi.fn();
    const state = defaults();
    configure(state, { events: { move, change } });
    expect(baseMove(state, "a3", "a4")).toBe(false);
    expect(baseMove(state, "a1", "a1")).toBe(false);
    vi.runAllTimers();
    expect(move).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it("notifies a forced user capture with after metadata after base callbacks", () => {
    vi.useFakeTimers();
    const order: string[] = [];
    const state = defaults();
    configure(state, {
      fen: "8/8/8/8/8/8/p7/R7",
      events: { move: () => order.push("move"), change: () => order.push("change") },
      movable: {
        events: {
          after: (_orig, _dest, meta) => {
            order.push("after");
            expect(meta.premove).toBe(false);
            expect(meta.captured?.role).toBe("p-piece");
          },
        },
      },
    });
    expect(userMove(state, "a1", "a2", false, true)).toBe(true);
    expect(order).toEqual([]);
    expect(state.turnColor).toBe("black");
    vi.runAllTimers();
    expect(order).toEqual(["move", "change", "after"]);
  });

  it("rejects an occupied pocket drop without consuming a piece or emitting events", () => {
    vi.useFakeTimers();
    const dropNewPiece = vi.fn();
    const change = vi.fn();
    const state = defaults();
    configure(state, {
      fen: "8/8/8/8/8/8/8/R7[R]",
      pocketRoles: { white: ["r-piece"], black: [] },
      events: { dropNewPiece, change },
    });
    expect(baseNewPiece(state, { role: "r-piece", color: "white" }, "a1", true)).toBe(false);
    expect(state.boardState.pockets?.white.get("r-piece")).toBe(1);
    vi.runAllTimers();
    expect(dropNewPiece).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });

  it("emits deferred drop and change callbacks and consumes pocket inventory", () => {
    vi.useFakeTimers();
    const order: string[] = [];
    const state = defaults();
    configure(state, {
      fen: "8/8/8/8/8/8/8/8[NN]",
      pocketRoles: { white: ["n-piece"], black: [] },
      events: {
        dropNewPiece: (piece, square) => order.push(`${piece.role}:${square}`),
        change: () => order.push("change"),
      },
    });
    expect(baseNewPiece(state, { role: "n-piece", color: "white" }, "c3", true)).toBe(true);
    expect(order).toEqual([]);
    expect(state.lastMove).toEqual(["N@", "c3"]);
    expect(state.boardState.pockets?.white.get("n-piece")).toBe(1);
    vi.runAllTimers();
    expect(order).toEqual(["n-piece:c3", "change"]);
  });
});
