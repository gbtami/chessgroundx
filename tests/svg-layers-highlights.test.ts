import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import type { DrawShape } from "../src/draw";
import type { Key } from "../src/types";

function mount(width = 8, height = 8, visible = true) {
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
    drawable: { visible },
  });
  const redraw = () => api.state.dom.redrawNow();
  const layer = (name: string) => root.querySelector<SVGSVGElement>(`svg.${name}`)!;
  return { root, api, redraw, layer, bounds };
}

afterEach(() => vi.restoreAllMocks());

describe("optional SVG drawing planes and highlights", () => {
  it("retains the existing element references and default drawing structure", () => {
    const f = mount();
    f.api.setShapes([{ orig: "a1", dest: "h8", brush: "green" }]);
    f.redraw();
    expect(f.api.state.dom.elements.svg).toBe(f.layer("cg-shapes"));
    expect(f.api.state.dom.elements.customSvg).toBe(f.layer("cg-custom-svgs"));
    expect(f.layer("cg-shapes").querySelectorAll(":scope > g > line")).toHaveLength(1);
    expect(f.layer("cg-shapes-below").querySelector("g")?.children).toHaveLength(0);
    expect(f.layer("cg-custom-below").querySelector("g")?.children).toHaveLength(0);
    f.api.destroy();
  });

  it.each([
    [8, 8, "h8"],
    [9, 10, "i:"],
    [16, 16, "p@"],
  ] as const)(
    "moves drawings and their labels/custom SVGs between planes on %sx%s",
    (width, height, corner: Key) => {
      const f = mount(width, height);
      const arrow: DrawShape = { orig: "a1", dest: corner, brush: "blue", label: { text: "A" } };
      const custom: DrawShape = {
        orig: corner,
        customSvg: '<rect data-square="yes" width="100" height="100" fill="#abc"/>',
        label: { text: "B" },
      };
      f.api.setShapes([arrow, custom]);
      f.redraw();
      const coords = (cls: string) =>
        ["x1", "y1", "x2", "y2"].map((attr) =>
          f.layer(cls).querySelector("line")!.getAttribute(attr),
        );
      const before = coords("cg-shapes");
      arrow.below = custom.below = true;
      f.redraw();
      expect(coords("cg-shapes-below")).toEqual(before);
      expect(f.layer("cg-shapes").querySelectorAll("line")).toHaveLength(0);
      expect(f.layer("cg-custom-svgs").querySelectorAll(".cg-label, svg")).toHaveLength(0);
      expect(f.layer("cg-custom-below").querySelectorAll(".cg-label")).toHaveLength(2);
      expect(f.layer("cg-custom-below").querySelector("svg")?.getAttribute("viewBox")).toBe(
        "0 0 100 100",
      );
      expect(f.layer("cg-shapes-below").getAttribute("viewBox")).toBe(
        f.layer("cg-shapes").getAttribute("viewBox"),
      );
      expect(f.layer("cg-custom-below").getAttribute("viewBox")).toBe(
        f.layer("cg-custom-svgs").getAttribute("viewBox"),
      );
      f.api.toggleOrientation();
      expect(coords("cg-shapes-below")).not.toEqual(before);
      f.api.toggleOrientation();
      expect(coords("cg-shapes-below")).toEqual(before);
      arrow.below = custom.below = false;
      f.redraw();
      expect(coords("cg-shapes")).toEqual(before);
      expect(f.layer("cg-shapes-below").querySelector("g")?.children).toHaveLength(0);
      expect(f.layer("cg-custom-below").querySelector("g")?.children).toHaveLength(0);
      f.api.destroy();
    },
  );

  it.each([false, true])(
    "draws contrasting arrow outlines and local markers (below=%s)",
    (below) => {
      const f = mount();
      const shape: DrawShape = {
        orig: "a1",
        dest: "h8",
        brush: "teaching",
        below,
        modifiers: { lineWidth: 12, hilite: "#fff" },
      };
      f.api.set({
        drawable: {
          brushes: { teaching: { key: "teaching", color: "#123", opacity: 0.5, lineWidth: 10 } },
        },
      });
      f.api.setShapes([shape]);
      f.redraw();
      const svg = f.layer(below ? "cg-shapes-below" : "cg-shapes");
      const group = svg.querySelector("g.cg-hilite")!;
      const lines = [...group.querySelectorAll("line")];
      expect(lines.map((line) => line.getAttribute("stroke"))).toEqual(["#fff", "#123"]);
      expect(Number(lines[0].getAttribute("stroke-width"))).toBeGreaterThan(
        Number(lines[1].getAttribute("stroke-width")),
      );
      expect(group.getAttribute("opacity")).toBe("0.5");
      for (const line of lines) {
        expect(line.getAttribute("opacity")).toBe("1");
        const id = line.getAttribute("marker-end")!.slice(5, -1);
        expect(svg.querySelector(`[id="${id}"] path`)?.getAttribute("fill")).toBe(
          line.getAttribute("stroke"),
        );
      }
      const count = svg.querySelectorAll("marker").length;
      f.redraw();
      expect(svg.querySelectorAll("marker")).toHaveLength(count);
      shape.modifiers!.hilite = "#fed";
      f.redraw();
      expect(svg.querySelector(".cg-hilite line")?.getAttribute("stroke")).toBe("#fed");
      delete shape.modifiers!.hilite;
      f.redraw();
      expect(svg.querySelector(".cg-hilite")).toBeNull();
      expect(svg.querySelectorAll(":scope > g > line")).toHaveLength(1);
      f.api.destroy();
    },
  );

  it("highlights circles, including equal endpoints, without altering the unhighlighted radius", () => {
    const f = mount(9, 10);
    const circle: DrawShape = { orig: "i:", dest: "i:", brush: "red", below: true };
    f.api.setShapes([circle]);
    f.redraw();
    const svg = f.layer("cg-shapes-below");
    const radius = svg.querySelector("g > circle")!.getAttribute("r");
    circle.modifiers = { hilite: "#fff" };
    f.redraw();
    const rings = [...svg.querySelectorAll(".cg-hilite circle")];
    expect(rings).toHaveLength(2);
    expect(rings.every((ring) => ring.getAttribute("r") === radius)).toBe(true);
    expect(rings.map((ring) => ring.getAttribute("stroke"))).toEqual(["#fff", "#882020"]);
    expect(svg.querySelector("line")).toBeNull();
    f.api.destroy();
  });

  it("keeps both planes synchronized when clearing manual drawings but retaining automatic hints", () => {
    const f = mount();
    f.api.setShapes([{ orig: "a1", brush: "red", below: true, label: { text: "A" } }]);
    f.api.setAutoShapes([
      { orig: "h8", brush: "green", below: true },
      { orig: "h7", brush: "blue" },
      { orig: "g7", piece: { role: "pr-piece", color: "white", promoted: true }, below: true },
    ]);
    f.redraw();
    expect(f.root.querySelector("cg-auto-pieces piece.pr-piece")).not.toBeNull();
    f.api.setShapes([]);
    f.redraw();
    expect(f.layer("cg-custom-below").querySelector(".cg-label")).toBeNull();
    expect(f.layer("cg-shapes-below").querySelectorAll("g > circle")).toHaveLength(1);
    expect(f.layer("cg-shapes").querySelectorAll("g > circle")).toHaveLength(1);
    f.api.setAutoShapes([]);
    f.redraw();
    expect(f.layer("cg-shapes-below").querySelector("g")?.children).toHaveLength(0);
    expect(f.root.querySelector("cg-auto-pieces")?.children).toHaveLength(0);
    f.api.destroy();
  });

  it("keeps a label finite below pieces with zero bounds and restores it on resize", () => {
    const f = mount();
    f.bounds.width = f.bounds.height = 0;
    f.api.state.dom.bounds.clear();
    f.api.setShapes([
      { orig: "a1", dest: "h8", below: true, brush: "green", label: { text: "A" } },
    ]);
    f.redraw();
    expect(f.layer("cg-custom-below").querySelector(".cg-label")!.outerHTML).not.toMatch(
      /NaN|Infinity/,
    );
    f.bounds.width = 500;
    f.bounds.height = 400;
    f.api.state.dom.bounds.clear();
    f.redraw();
    expect(f.layer("cg-custom-below").querySelector(".cg-label")!.outerHTML).not.toMatch(
      /NaN|Infinity/,
    );
    expect(
      Number(f.layer("cg-custom-below").querySelector(".cg-label circle")!.getAttribute("r")),
    ).toBeGreaterThan(0);
    f.api.destroy();
  });

  it("does not create drawing planes when drawings are invisible", () => {
    const f = mount(8, 8, false);
    expect(f.root.querySelector("svg")).toBeNull();
    f.api.setShapes([{ orig: "a1", below: true, brush: "green" }]);
    expect(() => f.redraw()).not.toThrow();
    f.api.destroy();
  });
});
