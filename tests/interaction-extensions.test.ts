import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import { configure } from "../src/config";
import { clear, end, start } from "../src/draw";
import { setDropMode, setSelectedKey } from "../src/board";
import { defaults } from "../src/state";
import type { State } from "../src/state";

function mount(config: Parameters<typeof Chessground>[1] = {}) {
  const root = document.createElement("div");
  document.body.append(root);
  const api = Chessground(root, { animation: { enabled: false }, ...config });
  return { root, api };
}

afterEach(() => vi.restoreAllMocks());

describe("custom variant movement function injection", () => {
  it("uses the injected premove function instead of orthodox chess destinations", () => {
    const custom = vi.fn(() => ["p8", "a1"]);
    const state = defaults();
    configure(state, {
      dimensions: { width: 16, height: 16 },
      fen: `${Array(8).fill("16").join("/")}/7N8/${Array(7).fill("16").join("/")}`,
      turnColor: "black",
      movable: { color: "white" },
      premovable: { premoveFunc: custom },
    });
    setSelectedKey(state, "h8");
    expect(custom).toHaveBeenCalledOnce();
    expect(custom.mock.calls[0]?.[1]).toBe("h8");
    expect(state.premovable.dests).toEqual(["p8", "a1"]);
  });

  it("uses injected predrop destinations for a pocket piece", () => {
    const custom = vi.fn(() => ["a1", "j10"]);
    const state = defaults();
    configure(state, {
      dimensions: { width: 10, height: 10 },
      fen: `${Array(10).fill("10").join("/")}[P]`,
      pocketRoles: { white: ["p-piece"], black: [] },
      turnColor: "black",
      movable: { color: "white" },
      premovable: { predropFunc: custom },
    });
    setDropMode(state, { role: "p-piece", color: "white" }, true);
    expect(custom).toHaveBeenCalledOnce();
    expect(custom.mock.calls[0]?.[1]).toEqual({ role: "p-piece", color: "white" });
    expect(state.premovable.dests).toEqual(["a1", "j10"]);
  });

  it("does not call a custom premove when the selection is not premovable", () => {
    const custom = vi.fn(() => ["a1"]);
    const state = defaults();
    configure(state, { premovable: { premoveFunc: custom }, movable: { color: "white" } });
    setSelectedKey(state, "e2");
    expect(custom).not.toHaveBeenCalled();
    expect(state.premovable.dests).toBeUndefined();
  });
});

describe("drawing and public annotation lifetime", () => {
  it("keeps manual and automatic shapes independent", () => {
    const { api } = mount();
    api.setShapes([{ orig: "a1", dest: "c3", brush: "green" }]);
    api.setAutoShapes([{ orig: "h8", brush: "red" }]);
    expect(api.state.drawable.shapes).toHaveLength(1);
    expect(api.state.drawable.autoShapes).toHaveLength(1);
    api.setShapes([]);
    expect(api.state.drawable.autoShapes).toHaveLength(1);
    api.destroy();
  });

  it("clears annotations and notifies only when shapes existed", () => {
    const onChange = vi.fn();
    const { api } = mount({ drawable: { onChange } });
    api.setShapes([{ orig: "a1" }]);
    clear(api.state);
    expect(api.state.drawable.shapes).toEqual([]);
    expect(onChange).toHaveBeenCalledOnce();
    clear(api.state);
    expect(onChange).toHaveBeenCalledOnce();
    api.destroy();
  });

  it("ignores multi-finger drawing starts", () => {
    const { api } = mount();
    const event = {
      touches: [
        { clientX: 10, clientY: 10 },
        { clientX: 20, clientY: 20 },
      ],
    };
    start(api.state, event as unknown as Parameters<typeof start>[1]);
    expect(api.state.drawable.current).toBeUndefined();
    api.destroy();
  });

  it("commits an arrow on gesture end and toggles it on repetition", () => {
    const onChange = vi.fn();
    const { api } = mount({ drawable: { onChange } });
    function drawArrow() {
      api.state.drawable.current = {
        orig: "a1",
        dest: "b2",
        mouseSq: "b2",
        pos: [10, 10],
        brush: "green",
        snapToValidMove: false,
      };
      end(api.state);
    }
    drawArrow();
    expect(api.state.drawable.shapes).toMatchObject([{ orig: "a1", dest: "b2", brush: "green" }]);
    drawArrow();
    expect(api.state.drawable.shapes).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(2);
    api.destroy();
  });

  it("changes an existing arrow's brush instead of duplicating it", () => {
    const { api } = mount();
    const state = api.state as State;
    state.drawable.current = {
      orig: "b2",
      dest: "c4",
      mouseSq: "c4",
      pos: [1, 1],
      brush: "green",
      snapToValidMove: false,
    };
    end(state);
    state.drawable.current = {
      orig: "b2",
      dest: "c4",
      mouseSq: "c4",
      pos: [1, 1],
      brush: "red",
      snapToValidMove: false,
    };
    end(state);
    expect(state.drawable.shapes).toMatchObject([{ orig: "b2", dest: "c4", brush: "red" }]);
    api.destroy();
  });

  it("does not commit a gesture which never located a square", () => {
    const { api } = mount();
    api.state.drawable.current = { orig: "a1", pos: [0, 0], brush: "blue", snapToValidMove: false };
    end(api.state);
    expect(api.state.drawable.shapes).toEqual([]);
    expect(api.state.drawable.current).toBeUndefined();
    api.destroy();
  });
});

describe("interaction safeguards", () => {
  it("disables mouse and touch board listeners in view-only mode", () => {
    const { root, api } = mount({ viewOnly: true });
    const board = root.querySelector("cg-board")!;
    board.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    expect(api.state.selectable.selected).toBeUndefined();
    expect(api.state.draggable.current).toBeUndefined();
    api.destroy();
  });

  it("prevents a context menu when drawing is enabled", () => {
    const { root, api } = mount({ drawable: { enabled: true } });
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    root.querySelector("cg-board")!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    api.destroy();
  });

  it("does not prevent the context menu when drawing and suppression are both disabled", () => {
    const { root, api } = mount({ drawable: { enabled: false }, disableContextMenu: false });
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    root.querySelector("cg-board")!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    api.destroy();
  });
});
