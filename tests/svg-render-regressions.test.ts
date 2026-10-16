import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import { renderSvg } from "../src/svg";

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

function fixture(width = 8, height = 8) {
  const root = document.createElement("div");
  document.body.append(root);
  const api = Chessground(root, {
    dimensions: { width, height },
    animation: { enabled: false },
    fen: Array(height).fill(String(width)).join("/"),
  });
  const board = root.querySelector("cg-board")!;
  vi.spyOn(board, "getBoundingClientRect").mockReturnValue(bounds);
  api.state.dom.bounds.clear();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const custom = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const el of [svg, custom]) {
    el.appendChild(document.createElementNS(el.namespaceURI, "defs"));
    el.appendChild(document.createElementNS(el.namespaceURI, "g"));
  }
  return { api, svg, custom };
}

function render(f: ReturnType<typeof fixture>) {
  renderSvg(f.api.state, f.svg, f.custom);
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("SVG annotation rendering regression contracts", () => {
  it("draws a circle on a 16x16 encoded-rank square", () => {
    const f = fixture(16, 16);
    f.api.setShapes([{ orig: "a@", brush: "green" }]);
    render(f);
    expect(f.svg.querySelectorAll("g > circle")).toHaveLength(1);
    expect(f.svg.querySelector("g > circle")?.getAttribute("stroke")).toBe("#15781B");
    f.api.destroy();
  });

  it("places a 16x16 arrow using different endpoints", () => {
    const f = fixture(16, 16);
    f.api.setShapes([{ orig: "a1", dest: "p@", brush: "red" }]);
    render(f);
    const line = f.svg.querySelector("g > line")!;
    expect(line).not.toBeNull();
    expect(line.getAttribute("x1")).not.toBe(line.getAttribute("x2"));
    expect(line.getAttribute("y1")).not.toBe(line.getAttribute("y2"));
    f.api.destroy();
  });

  it("reverses SVG arrow coordinates with orientation", () => {
    const f = fixture(10, 8);
    f.api.setShapes([{ orig: "a1", dest: "j8", brush: "blue" }]);
    render(f);
    const first = f.svg.querySelector("g > line")!.getAttribute("x1");
    f.api.toggleOrientation();
    f.api.state.drawable.prevSvgHash = ""; // Verify coordinate transformation independently of redraw cache invalidation.
    render(f);
    expect(f.svg.querySelector("g > line")!.getAttribute("x1")).not.toBe(first);
    f.api.destroy();
  });

  it("preserves automatic shapes when manual annotations are cleared", () => {
    const f = fixture();
    f.api.setShapes([{ orig: "a1", brush: "green" }]);
    f.api.setAutoShapes([{ orig: "h8", brush: "red" }]);
    render(f);
    expect(f.svg.querySelectorAll("g > circle")).toHaveLength(2);
    f.api.setShapes([]);
    render(f);
    expect(f.svg.querySelectorAll("g > circle")).toHaveLength(1);
    f.api.destroy();
  });

  it("does not duplicate unchanged SVG elements on consecutive draws", () => {
    const f = fixture();
    f.api.setShapes([{ orig: "a1", dest: "b2", brush: "green" }]);
    render(f);
    const line = f.svg.querySelector("g > line");
    render(f);
    expect(f.svg.querySelector("g > line")).toBe(line);
    expect(f.svg.querySelectorAll("g > line")).toHaveLength(1);
    f.api.destroy();
  });

  it("creates separate arrowhead definitions for different brushes", () => {
    const f = fixture();
    f.api.setShapes([
      { orig: "a1", dest: "a2", brush: "green" },
      { orig: "b1", dest: "b2", brush: "red" },
    ]);
    render(f);
    expect(f.svg.querySelectorAll("defs marker")).toHaveLength(2);
    f.api.destroy();
  });

  it("renders custom SVG annotations in their own layer", () => {
    const f = fixture();
    f.api.setShapes([{ orig: "c3", customSvg: '<circle cx="50" cy="50" r="20" />' }]);
    render(f);
    expect(f.custom.querySelector("g svg circle")).not.toBeNull();
    expect(f.svg.querySelector("g > circle")).toBeNull();
    f.api.destroy();
  });
});
