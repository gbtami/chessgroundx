import { describe, expect, it, vi } from "vitest";
import { configure } from "../src/config";
import { defaults } from "../src/state";
import { setSelectedKey, toggleOrientation } from "../src/board";

describe("shared configuration and board boundaries", () => {
  it("replaces last-move highlights without retaining an earlier destination", () => {
    const state = defaults();
    configure(state, { lastMove: ["a2", "a4"] });
    expect(state.lastMove).toEqual(["a2", "a4"]);
    configure(state, { lastMove: ["c3"] });
    expect(state.lastMove).toEqual(["c3"]);
    configure(state, { lastMove: undefined });
    expect(state.lastMove).toBeUndefined();
  });

  it("preserves an in-progress pocket drag sentinel across a FEN refresh", () => {
    const state = defaults();
    configure(state, { pocketRoles: { white: ["r-piece"], black: [] }, fen: "8/8/8/8/8/8/8/8[R]" });
    const dragged = { role: "r-piece" as const, color: "white" as const };
    state.boardState.pieces.set("a0", dragged);
    configure(state, { fen: "8/8/8/8/8/8/8/8[R]" });
    expect(state.boardState.pieces.get("a0")).toEqual(dragged);
    expect(state.boardState.pockets?.white.get("r-piece")).toBe(1);
  });

  it("keeps nested event callbacks when only another callback is reconfigured", () => {
    const change = vi.fn();
    const select = vi.fn();
    const state = defaults();
    configure(state, { events: { change } });
    configure(state, { events: { select } });
    expect(state.events.change).toBe(change);
    expect(state.events.select).toBe(select);
  });

  it("orientation changes cancel selection without removing custom movement hooks", () => {
    const hook = vi.fn(() => ["b3"]);
    const state = defaults();
    configure(state, {
      fen: "8/8/8/8/8/8/8/N7",
      movable: { color: "white" },
      turnColor: "black",
      premovable: { premoveFunc: hook },
    });
    setSelectedKey(state, "a1");
    expect(state.selectable.selected).toBe("a1");
    toggleOrientation(state);
    expect(state.selectable.selected).toBeUndefined();
    expect(state.premovable.premoveFunc).toBe(hook);
  });
});
