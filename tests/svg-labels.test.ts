import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import type { DrawShape } from "../src/draw";
import { end } from "../src/draw";
import type { Key } from "../src/types";

function mount(width = 8, height = 8) {
  const bounds = {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: width * 50,
    height: height * 50,
    right: width * 50,
    bottom: height * 50,
    toJSON: () => ({}),
  };
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => bounds);
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  const root = document.createElement("div");
  document.body.append(root);
  const api = Chessground(root, {
    dimensions: { width, height },
    fen: Array(height).fill(String(width)).join("/"),
    animation: { enabled: false },
  });
  const redraw = () => api.state.dom.redrawNow();
  const labels = () => [...root.querySelectorAll<SVGGElement>("g.cg-label")];
  const position = (index = 0) => {
    const transform = labels()[index].getAttribute("transform")!;
    return transform.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)!.map(Number);
  };
  return { root, api, redraw, labels, position, bounds };
}

afterEach(() => vi.restoreAllMocks());

describe("optional SVG text labels", () => {
  it("renders text safely without changing frozen caller-owned shapes or emitting changes", () => {
    const f = mount();
    const onChange = vi.fn();
    f.api.set({ drawable: { onChange } });
    const text = '<image href="x" onerror="alert(1)"/> & <script>bad()</script>';
    const label = Object.freeze({ text });
    const shape = Object.freeze({ orig: "a1" as const, brush: "green", label });
    f.api.setShapes([shape]);
    expect(() => f.redraw()).not.toThrow();
    expect(f.labels()).toHaveLength(1);
    expect(f.labels()[0].querySelector("text")?.textContent).toBe(text);
    expect(f.labels()[0].querySelector("image, script")).toBeNull();
    expect(f.labels()[0].querySelector("circle")?.getAttribute("fill")).toBe("#15781B");
    expect(label).toEqual({ text });
    expect(onChange).not.toHaveBeenCalled();
    f.api.destroy();
  });

  it.each([
    [8, 8, "h8"],
    [9, 10, "i:"],
    [16, 16, "p@"],
  ] as const)(
    "anchors circle and standalone labels across %sx%s and both orientations",
    (width, height, corner: Key) => {
      const f = mount(width, height);
      f.api.setShapes([
        { orig: corner, brush: "red", label: { text: "A" } },
        { orig: "a1", label: { text: "12" } },
      ]);
      f.redraw();
      expect(f.labels()).toHaveLength(2);
      // The overlay viewBox starts half a user unit after the arrow viewBox.
      const circle = f.root.querySelector("svg.cg-shapes > g > circle")!;
      expect(f.position()).toEqual([
        Number(circle.getAttribute("cx")) + 0.5,
        Number(circle.getAttribute("cy")) + 0.5,
      ]);
      expect(f.position(1)[0]).toBeCloseTo(-(width - 1) / 2 + 0.5 + 0.4);
      expect(f.position(1)[1]).toBeCloseTo((height - 1) / 2 + 0.5 - 0.4);
      const white = f.position();
      f.api.toggleOrientation();
      expect(f.position()).toEqual([1 - white[0], 1 - white[1]]);
      f.api.set({ orientation: "white" });
      expect(f.position()).toEqual(white);
      expect(f.root.querySelectorAll("svg.cg-shapes > g > circle")).toHaveLength(1);
      f.api.destroy();
    },
  );

  it("places an arrow label on its shaft and restores it after orientation changes", () => {
    const f = mount(16, 16);
    f.api.setShapes([{ orig: "a1", dest: "p@", brush: "blue", label: { text: "B" } }]);
    f.redraw();
    const [x, y] = f.position().map((value) => value - 0.5);
    // The a1-p16 diagonal has y = -x; a badge sits 33/64 behind its destination.
    expect(x).toBeCloseTo(7.5 - 33 / 64 / Math.sqrt(2));
    expect(y).toBeCloseTo(-x);
    const white = f.position();
    f.api.toggleOrientation();
    expect(f.position()[0]).toBeCloseTo(1 - white[0]);
    expect(f.position()[1]).toBeCloseTo(1 - white[1]);
    f.api.toggleOrientation();
    expect(f.position()).toEqual(white);
    f.api.destroy();
  });

  it("updates text and fill and reaps removed labels without duplicating unchanged DOM", () => {
    const f = mount();
    const shape: DrawShape = { orig: "d4", brush: "green", label: { text: "A", fill: "#123" } };
    f.api.setShapes([shape]);
    f.redraw();
    const original = f.labels()[0];
    f.redraw();
    expect(f.labels()[0]).toBe(original);
    shape.label!.text = "AB";
    f.redraw();
    expect(f.labels()[0].querySelector("text")?.textContent).toBe("AB");
    shape.label!.fill = "#456";
    f.redraw();
    expect(f.labels()).toHaveLength(1);
    expect(f.labels()[0].querySelector("circle")?.getAttribute("fill")).toBe("#456");
    delete shape.label;
    f.redraw();
    expect(f.labels()).toHaveLength(0);
    expect(f.root.querySelectorAll("svg.cg-shapes > g > circle")).toHaveLength(1);
    f.api.destroy();
  });

  it("keeps a label and legacy string custom SVG together through replacement and removal", () => {
    const f = mount();
    const customSvg = '<path data-legacy="yes" d="M0 0 L100 100"/>';
    f.api.setAutoShapes([{ orig: "h8", customSvg, label: { text: "!", fill: "#abc" } }]);
    f.redraw();
    expect(f.root.querySelector("svg.cg-custom-svgs svg")?.getAttribute("viewBox")).toBe(
      "0 0 100 100",
    );
    expect(f.root.querySelector("path[data-legacy]")).not.toBeNull();
    expect(f.labels()).toHaveLength(1);
    f.api.setAutoShapes([{ orig: "h8", customSvg }]);
    f.redraw();
    expect(f.labels()).toHaveLength(0);
    expect(f.root.querySelector("path[data-legacy]")).not.toBeNull();
    f.api.setAutoShapes([]);
    f.redraw();
    expect(f.root.querySelector("svg.cg-custom-svgs > g")?.children).toHaveLength(0);
    f.api.destroy();
  });

  it("refreshes collision placement when incoming arrows change but their count stays the same", () => {
    const f = mount();
    const labeled: DrawShape = { orig: "c3", dest: "d5", brush: "green", label: { text: "A" } };
    f.api.setShapes([labeled, { orig: "g5", dest: "d5", brush: "red" }]);
    f.redraw();
    const before = f.position();
    // c4-d5 and c3-d5 enter adjacent angle slots, unlike g5-d5.
    f.api.setShapes([labeled, { orig: "c4", dest: "d5", brush: "red" }]);
    f.redraw();
    expect(f.position()).not.toEqual(before);
    expect(f.labels()).toHaveLength(1);
    f.api.setShapes([labeled]);
    f.redraw();
    expect(f.position()).not.toEqual(before);
    f.api.destroy();
  });

  it("keeps manual labels separate from automatic hints and auto-piece ghosts", () => {
    const f = mount();
    f.api.setShapes([{ orig: "a1", brush: "teaching", label: { text: "A" } }]);
    f.api.set({
      drawable: {
        brushes: { teaching: { key: "teaching", color: "#abc", opacity: 0.7, lineWidth: 8 } },
      },
    });
    f.api.setAutoShapes([
      { orig: "h8", label: { text: "B" } },
      { orig: "h7", piece: { role: "pr-piece", color: "white", promoted: true } },
    ]);
    f.redraw();
    expect(f.labels()).toHaveLength(2);
    expect(f.labels()[0].querySelector("circle")?.getAttribute("fill")).toBe("#abc");
    f.api.set({
      drawable: {
        brushes: { teaching: { key: "teaching", color: "#def", opacity: 0.7, lineWidth: 8 } },
      },
    });
    f.redraw();
    expect(
      f
        .labels()
        .find((label) => label.querySelector("text")?.textContent === "A")
        ?.querySelector("circle")
        ?.getAttribute("fill"),
    ).toBe("#def");
    expect(f.root.querySelector("cg-auto-pieces piece.pr-piece")).not.toBeNull();
    f.api.setAutoShapes([]);
    f.redraw();
    expect(f.labels()).toHaveLength(1);
    f.api.setShapes([]);
    f.redraw();
    expect(f.labels()).toHaveLength(0);
    f.api.destroy();
  });

  it("resizes labels with rectangular cells without changing the legacy arrow endpoints", () => {
    const f = mount(9, 10);
    const plain: DrawShape = { orig: "a1", dest: "i:", brush: "blue" };
    f.api.setShapes([plain]);
    f.redraw();
    const lineAttributes = () =>
      [...f.root.querySelector("svg.cg-shapes line")!.attributes]
        .map((attr) => [attr.name, attr.value])
        .filter(([name]) => name !== "cgHash");
    const before = lineAttributes();
    f.api.setShapes([{ ...plain, label: { text: "A" } }]);
    f.redraw();
    expect(lineAttributes()).toEqual(before);
    const position = f.position();
    f.bounds.width = 800;
    f.bounds.height = 800;
    f.api.state.dom.bounds.clear();
    f.redraw();
    expect(f.position()).not.toEqual(position);
    expect(Number(f.labels()[0].querySelector("circle")?.getAttribute("r"))).toBeCloseTo(0.18);
    f.api.setShapes([plain]);
    f.redraw();
    expect(f.labels()).toHaveLength(0);
    f.api.destroy();
  });

  it.each([
    [0, 0],
    [0, 400],
  ])("recovers a labeled arrow rendered with %sx%s bounds after resize", (width, height) => {
    const f = mount();
    f.bounds.width = width;
    f.bounds.height = height;
    f.api.state.dom.bounds.clear();
    f.api.setShapes([{ orig: "d4", dest: "e4", brush: "green", label: { text: "A" } }]);
    f.redraw();
    const hiddenLabel = f.labels()[0];
    expect(hiddenLabel.outerHTML).not.toMatch(/NaN|Infinity/);
    expect(f.position().every(Number.isFinite)).toBe(true);

    f.bounds.width = 400;
    f.bounds.height = 400;
    f.api.state.dom.bounds.clear();
    f.redraw();
    expect(f.labels()).toHaveLength(1);
    expect(f.labels()[0]).not.toBe(hiddenLabel);
    expect(f.labels()[0].outerHTML).not.toMatch(/NaN|Infinity/);
    expect(f.position()[0]).toBeCloseTo(1 - 33 / 64);
    expect(f.position()[1]).toBeCloseTo(1);
    expect(Number(f.labels()[0].querySelector("circle")?.getAttribute("r"))).toBeGreaterThan(0);
    const line = f.root.querySelector("svg.cg-shapes line")!;
    for (const attr of ["x1", "y1", "x2", "y2"])
      expect(Number.isFinite(Number(line.getAttribute(attr)))).toBe(true);
    f.api.destroy();
  });

  it("keeps labels behind the destination even on a very short arrow", () => {
    const f = mount();
    f.api.setShapes([{ orig: "d4", dest: "d5", brush: "green", label: { text: "A" } }]);
    f.redraw();
    const [x, y] = f.position();
    expect(x).toBeCloseTo(0);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(1);
    f.api.destroy();
  });

  it("preserves the existing toggle gesture for labeled arrows", () => {
    const f = mount();
    const onChange = vi.fn();
    f.api.set({ drawable: { onChange } });
    f.api.setShapes([{ orig: "a1", dest: "h8", brush: "green", label: { text: "A" } }]);
    f.api.state.drawable.current = {
      orig: "a1",
      dest: "h8",
      mouseSq: "h8",
      brush: "green",
      pos: [375, 25],
      snapToValidMove: false,
    };
    end(f.api.state);
    f.redraw();
    expect(f.api.state.drawable.shapes).toEqual([]);
    expect(f.labels()).toHaveLength(0);
    expect(onChange).toHaveBeenCalledExactlyOnceWith([]);
    f.api.destroy();
  });
});
