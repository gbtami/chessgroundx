import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";

type BoardApi = ReturnType<typeof Chessground>;

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

afterEach(() => vi.restoreAllMocks());

function fixture() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(bounds);
  const root = document.createElement("div");
  document.body.append(root);
  const api = Chessground(root, {
    animation: { enabled: false },
    drawable: { enabled: true, visible: true },
    fen: "8/8/8/8/8/8/8/8",
  });
  api.setShapes([{ orig: "d1", dest: "g5", brush: "green" }]);
  api.state.dom.redrawNow();
  return { root, api };
}

function arrowCoordinates(root: HTMLElement): string[] {
  const line = root.querySelector("svg.cg-shapes g > line");
  expect(line).not.toBeNull();
  return ["x1", "y1", "x2", "y2"].map((attr) => line!.getAttribute(attr)!);
}

function assertFlip(root: HTMLElement, api: BoardApi, changeOrientation: () => void) {
  const white = arrowCoordinates(root);
  changeOrientation();
  expect(api.state.orientation).toBe("black");
  const black = arrowCoordinates(root);
  expect(black).not.toEqual(white);
  changeOrientation();
  expect(api.state.orientation).toBe("white");
  expect(arrowCoordinates(root)).toEqual(white);
}

describe("SVG arrows follow public API orientation changes", () => {
  it("repositions existing arrows on toggleOrientation and restores them on a second toggle", () => {
    const { root, api } = fixture();
    assertFlip(root, api, () => api.toggleOrientation());
    api.destroy();
  });

  it("repositions existing arrows on set({ orientation }) without caller cache invalidation", () => {
    const { root, api } = fixture();
    assertFlip(root, api, () =>
      api.set({ orientation: api.state.orientation === "white" ? "black" : "white" }),
    );
    api.destroy();
  });
});
