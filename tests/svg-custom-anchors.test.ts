import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import { cancel } from "../src/draw";
import type { DrawShape } from "../src/draw";
import type { Color } from "../src/types";

const markup = '<rect data-anchor="target" width="100" height="100" fill="#fc0"/>';

function mount(width = 8, height = 8, orientation: Color = "white") {
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
  const onChange = vi.fn();
  const api = Chessground(root, {
    dimensions: { width, height },
    orientation,
    fen: Array(height).fill(String(width)).join("/"),
    animation: { enabled: false },
    drawable: { onChange },
  });
  const redraw = () => api.state.dom.redrawNow();
  const custom = () => root.querySelector('[data-anchor="target"]')!.closest("svg")!.parentElement!;
  return { api, root, bounds, onChange, redraw, custom };
}

function translate(el: Element): number[] {
  return el
    .getAttribute("transform")!
    .match(/-?[\d.]+/g)!
    .map(Number);
}

afterEach(() => vi.restoreAllMocks());

describe("custom SVG objects with explicit anchors", () => {
  it.each([
    [8, 8, "h8", "white"],
    [8, 8, "h8", "black"],
    [9, 10, "i:", "white"],
    [9, 10, "i:", "black"],
    [16, 16, "p@", "white"],
    [16, 16, "p@", "black"],
  ] as const)(
    "anchors at the destination on %sx%s (%s, %s)",
    (width, height, corner, orientation) => {
      const f = mount(width, height, orientation);
      // Compare to the existing string placement at that square, including the fork's viewBoxes.
      f.api.setShapes([{ orig: corner, customSvg: markup }]);
      f.redraw();
      const expected = f.custom().getAttribute("transform");
      const customSvg = Object.freeze({ html: markup, center: "dest" as const });
      const shape: DrawShape = Object.freeze({ orig: "a1", dest: corner, customSvg });
      for (const below of [false, true]) {
        f.api.setShapes([{ ...shape, below }]);
        f.redraw();
        expect(f.custom().getAttribute("transform")).toBe(expected);
        expect(f.custom().closest("svg")!.getAttribute("class")).toBe(
          below ? "cg-custom-below" : "cg-custom-svgs",
        );
        expect(f.custom().querySelector("svg")!.getAttribute("viewBox")).toBe("0 0 100 100");
      }
      expect(customSvg).toEqual({ html: markup, center: "dest" });
      expect(f.onChange).not.toHaveBeenCalled();
      f.api.destroy();
    },
  );

  it("keeps strings and default/origin objects at the same origin without adding brushed shapes", () => {
    const f = mount();
    const shape: DrawShape = { orig: "c3", dest: "h8", brush: "consumer-owned", customSvg: markup };
    f.api.setShapes([shape]);
    f.redraw();
    const legacy = f.custom().outerHTML;
    for (const customSvg of [
      Object.freeze({ html: markup }),
      Object.freeze({ html: markup, center: "orig" as const }),
    ]) {
      f.api.setShapes([{ ...shape, customSvg }]);
      f.redraw();
      expect(f.custom().outerHTML).toBe(legacy.replace(/ cgHash="[^"]*"/, ""));
      expect(f.root.querySelectorAll("marker, line, .cg-shapes circle")).toHaveLength(0);
      expect(f.root.textContent).not.toContain("[object Object]");
    }
    expect(f.onChange).not.toHaveBeenCalled();
    f.api.destroy();
  });

  it("aligns label anchors with the real badge and supports the same position without badge text", () => {
    const f = mount(9, 10);
    const shape: DrawShape = {
      orig: "d4",
      customSvg: { html: markup, center: "label" },
      label: { text: "A" },
    };
    f.api.setShapes([shape]);
    f.redraw();
    const at = translate(f.custom());
    const labelAt = translate(f.root.querySelector(".cg-label")!);
    expect(at[0] + 0.5).toBeCloseTo(labelAt[0]);
    expect(at[1] + 0.5).toBeCloseTo(labelAt[1]);
    delete shape.label;
    f.redraw();
    expect(translate(f.custom())).toEqual(at);
    expect(f.root.querySelector(".cg-label")).toBeNull();
    f.api.destroy();
  });

  it("invalidates the cache for html and anchor changes, then restores legacy string rendering", () => {
    const f = mount();
    const customSvg: Exclude<DrawShape["customSvg"], string | undefined> = { html: markup };
    const shape: DrawShape = { orig: "a1", dest: "h8", customSvg };
    f.api.setShapes([shape]);
    f.redraw();
    const origin = translate(f.custom());
    customSvg.center = "dest";
    f.redraw();
    expect(translate(f.custom())).not.toEqual(origin);
    customSvg.center = "label";
    f.redraw();
    expect(translate(f.custom())).not.toEqual(origin);
    customSvg.html = markup.replace("#fc0", "#abc");
    f.redraw();
    expect(f.custom().querySelector("rect")!.getAttribute("fill")).toBe("#abc");
    shape.customSvg = markup;
    f.redraw();
    expect(translate(f.custom())).toEqual(origin);
    expect(f.root.querySelectorAll("svg svg")).toHaveLength(1);
    f.api.setShapes([]);
    f.redraw();
    expect(f.root.querySelectorAll("svg svg")).toHaveLength(0);
    f.api.destroy();
  });

  it("falls back to the origin when a destination is absent and follows bounds and rotation", () => {
    const f = mount(9, 10);
    const shape: DrawShape = { orig: "i:", customSvg: { html: markup, center: "dest" } };
    f.api.setShapes([shape]);
    f.redraw();
    const before = translate(f.custom());
    f.api.toggleOrientation();
    expect(translate(f.custom())).not.toEqual(before);
    f.bounds.width = 700;
    f.bounds.height = 400;
    f.api.state.dom.bounds.clear();
    f.redraw();
    expect(translate(f.custom()).every(Number.isFinite)).toBe(true);
    shape.customSvg = markup;
    f.redraw();
    const legacyResized = translate(f.custom());
    shape.customSvg = { html: markup, center: "dest" };
    f.redraw();
    expect(translate(f.custom())).toEqual(legacyResized);
    f.api.destroy();
  });

  it.each([false, true])(
    "previews only manual object SVGs, including labels, on either plane (below=%s)",
    (below) => {
      const f = mount();
      f.api.set({ drawable: { previewErase: true } });
      const customSvg = Object.freeze({ html: markup, center: "label" as const });
      const shape: DrawShape = Object.freeze({
        orig: "a1",
        brush: "green",
        below,
        customSvg,
        label: Object.freeze({ text: "A" }),
      });
      f.api.setShapes([shape]);
      f.api.setAutoShapes([shape]);
      f.redraw();
      f.api.state.drawable.current = {
        orig: "a1",
        mouseSq: "a1",
        pos: [25, 375],
        brush: "green",
        snapToValidMove: false,
      };
      f.redraw();
      const groups = f.root.querySelector(
        `svg.${below ? "cg-custom-below" : "cg-custom-svgs"} > g`,
      )!.children;
      expect([...groups].map((el) => el.getAttribute("opacity"))).toEqual([null, "0.6"]);
      cancel(f.api.state);
      f.redraw();
      expect([...groups].every((el) => !el.hasAttribute("opacity"))).toBe(true);
      expect(customSvg).toEqual({ html: markup, center: "label" });
      expect(f.onChange).not.toHaveBeenCalled();
      f.api.destroy();
    },
  );
});
