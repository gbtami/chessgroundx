import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import { end } from "../src/draw";
import { analysisGlyphs, endgameGlyphs, glyphToSvg } from "../src/glyph";
import type { Key } from "../src/types";

function mount(width = 16, height = 16) {
  const rect = {
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
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  const root = document.createElement("div");
  document.body.append(root);
  const api = Chessground(root, {
    dimensions: { width, height },
    fen: Array(height).fill(String(width)).join("/"),
    animation: { enabled: false },
  });
  return { api, root };
}

afterEach(() => vi.restoreAllMocks());

describe("upstream drawing fixes within the fork SVG contract", () => {
  it("ignores text and comments among marker definitions without accumulating markers", () => {
    const { api, root } = mount();
    api.setShapes([{ orig: "a1", dest: "p@", brush: "green" }]);
    api.state.dom.redrawNow();
    const defs = root.querySelector("svg.cg-shapes defs")!;
    const marker = defs.querySelector("marker");
    defs.prepend(document.createTextNode("\n"));
    defs.append(document.createComment("retained consumer definition"));
    api.setShapes([
      { orig: "a1", dest: "p@", brush: "green" },
      { orig: "b1", dest: "o@", brush: "green" },
    ]);
    expect(() => api.state.dom.redrawNow()).not.toThrow();
    expect(defs.querySelectorAll("marker")).toHaveLength(1);
    expect(defs.querySelector("marker")).toBe(marker);
    api.destroy();
  });

  it("renders equal origin/destination annotations as circles on rank 16", () => {
    const { api, root } = mount();
    api.setShapes([{ orig: "p@", dest: "p@", brush: "red" }]);
    api.state.dom.redrawNow();
    expect(root.querySelector("svg.cg-shapes g > circle")).not.toBeNull();
    expect(root.querySelector("svg.cg-shapes g > line")).toBeNull();
    api.destroy();
  });

  it("does not require an arrow brush for a custom SVG carrying a destination", () => {
    const { api, root } = mount();
    api.setShapes([{ orig: "p@", dest: "a1", customSvg: '<circle cx="50" cy="50" r="20" />' }]);
    expect(() => api.state.dom.redrawNow()).not.toThrow();
    expect(root.querySelector("svg.cg-custom-svgs g svg circle")).not.toBeNull();
    expect(root.querySelector("svg.cg-shapes marker")).toBeNull();
    api.destroy();
  });

  it("publishes completed shapes without retaining mutable gesture state", () => {
    const { api } = mount();
    const onChange = vi.fn();
    api.set({ drawable: { onChange } });
    const gesture = {
      orig: "a1" as const,
      dest: "p@" as const,
      mouseSq: "p@" as const,
      pos: [775, 25] as [number, number],
      brush: "green",
      snapToValidMove: true,
    };
    api.state.drawable.current = gesture;
    end(api.state);
    const expected = [{ orig: "a1", dest: "p@", brush: "green" }];
    expect(api.state.drawable.shapes).toEqual(expected);
    expect(onChange).toHaveBeenCalledExactlyOnceWith(api.state.drawable.shapes);
    gesture.brush = "red";
    expect(api.state.drawable.shapes).toEqual(expected);
    api.destroy();
  });
});

describe("upstream glyph strings in ChessgroundX's custom SVG layer", () => {
  it.each([glyphToSvg, analysisGlyphs, endgameGlyphs])(
    "renders each catalog using the existing string API (%#)",
    (catalog) => {
      const { api, root } = mount();
      const glyphs = Object.values(catalog(3));
      expect(glyphs.length).toBeGreaterThan(0);
      for (const glyph of glyphs) {
        api.setAutoShapes([{ orig: "p@", customSvg: glyph(0) }]);
        api.state.dom.redrawNow();
        const custom = root.querySelector("svg.cg-custom-svgs g svg")!;
        expect(custom.getAttribute("viewBox")).toBe("0 0 100 100");
        expect(custom.querySelector("g")?.getAttribute("transform")).toBe(
          "matrix(.4 0 0 .4 71 -12)",
        );
        expect(custom.querySelectorAll("path, text, circle").length).toBeGreaterThan(1);
      }
      api.destroy();
    },
  );

  it.each([
    [9, 10, "i:"],
    [16, 16, "p@"],
  ] as const)(
    "keeps glyph anchoring and orientation on a %sx%s board",
    (width, height, corner: Key) => {
      const { api, root } = mount(width, height);
      const markup = analysisGlyphs(3).pin(1);
      api.setAutoShapes([{ orig: corner, customSvg: markup }]);
      api.state.dom.redrawNow();
      const translate = () =>
        root.querySelector("svg.cg-custom-svgs > g > g")!.getAttribute("transform");
      const white = translate();
      expect(white).toBe(`translate(${(width - 1) / 2},${-(height - 1) / 2})`);
      api.toggleOrientation();
      expect(translate()).toBe(`translate(${-(width - 1) / 2},${(height - 1) / 2})`);
      expect(root.querySelector("svg.cg-custom-svgs svg > g")?.getAttribute("transform")).toBe(
        "matrix(.4 0 0 .4 43 -12)",
      );
      api.toggleOrientation();
      expect(translate()).toBe(white);
      api.setAutoShapes([]);
      api.state.dom.redrawNow();
      expect(root.querySelector("svg.cg-custom-svgs > g > g")).toBeNull();
      api.destroy();
    },
  );
});
