import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import { move as dragMove, cancel as dragCancel } from "../src/drag";
import { move as drawMove } from "../src/draw";

const bounds = {
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

function mount(config: Parameters<typeof Chessground>[1] = {}, mini = false) {
  const root = document.createElement("div");
  if (mini) root.classList.add("mini");
  document.body.append(root);
  const api = Chessground(root, { animation: { enabled: false }, ...config });
  const board = root.querySelector("cg-board") as HTMLElement;
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue(bounds);
  api.state.dom.bounds.clear();
  return { root, board, api };
}

function mouse(type: string, x: number, y: number, init: MouseEventInit = {}) {
  return new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, ...init });
}

afterEach(() => vi.restoreAllMocks());

describe("board gesture regression contracts", () => {
  it("starts a right-button drawing gesture from a board square", () => {
    const { api, board } = mount();
    board.dispatchEvent(mouse("mousedown", 50, 750, { button: 2 }));
    expect(api.state.drawable.current).toMatchObject({ orig: "a1", brush: "green" });
    api.destroy();
  });

  it.each([
    [{ shiftKey: true }, "red"],
    [{ ctrlKey: true }, "red"],
    [{ altKey: true }, "blue"],
    [{ metaKey: true }, "blue"],
    [{ shiftKey: true, altKey: true }, "yellow"],
  ] as const)("uses modifiers %j to choose the %s Study drawing brush", (modifiers, brush) => {
    const { api, board } = mount();
    board.dispatchEvent(mouse("mousedown", 50, 750, { button: 2, ...modifiers }));
    expect(api.state.drawable.current).toMatchObject({ orig: "a1", brush });
    api.destroy();
  });

  it("updates the active drawing pointer position from document mousemove", () => {
    const { api, board } = mount();
    board.dispatchEvent(mouse("mousedown", 50, 750, { button: 2 }));
    document.dispatchEvent(mouse("mousemove", 150, 650));
    expect(api.state.drawable.current?.pos).toEqual([150, 650]);
    document.dispatchEvent(mouse("mouseup", 150, 650));
    expect(api.state.drawable.current).toBeUndefined();
    api.destroy();
  });

  it("does not initiate a right-button draw when drawing is disabled", () => {
    const { api, board } = mount({ drawable: { enabled: false } });
    board.dispatchEvent(mouse("mousedown", 50, 750, { button: 2 }));
    expect(api.state.drawable.current).toBeUndefined();
    api.destroy();
  });

  it("ignores multi-touch dragging while preserving the current pointer", () => {
    const { api } = mount();
    api.state.draggable.current = {
      orig: "a1",
      piece: { role: "r-piece", color: "white" },
      origPos: [50, 750],
      pos: [50, 750],
      started: false,
      element: document.createElement("piece"),
      originTarget: null,
      keyHasChanged: false,
    };
    dragMove(api.state, {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 },
      ],
    } as never);
    expect(api.state.draggable.current?.pos).toEqual([50, 750]);
    dragCancel(api.state);
    api.destroy();
  });

  it("updates drawing positions on single-touch movement", () => {
    const { api } = mount();
    api.state.drawable.current = {
      orig: "a1",
      pos: [50, 750],
      brush: "green",
      snapToValidMove: false,
    };
    drawMove(api.state, { targetTouches: [{ clientX: 150, clientY: 650 }] } as never);
    expect(api.state.drawable.current.pos).toEqual([150, 650]);
    api.state.drawable.current = undefined;
    api.destroy();
  });

  it("marks pocket quantities on a 10x10 board and flips pocket colors on orientation change", () => {
    const { api, root } = mount(
      {
        dimensions: { width: 10, height: 10 },
        fen: `${Array(10).fill("10").join("/")}[RRr]`,
        pocketRoles: { white: ["r-piece"], black: ["r-piece"] },
      },
      true,
    );
    const bottom = root.querySelector("pocketbottom piece")!;
    expect(bottom.getAttribute("data-color")).toBe("white");
    expect(bottom.getAttribute("data-nb")).toBe("2");
    api.toggleOrientation();
    expect(root.querySelector("pocketbottom piece")?.getAttribute("data-color")).toBe("black");
    expect(root.querySelector("pocketbottom piece")?.getAttribute("data-nb")).toBe("1");
    api.destroy();
  });
});
