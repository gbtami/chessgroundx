import { afterEach, describe, expect, it, vi } from "vitest";
import * as factories from "../src/chessground";
import { configure, type Config } from "../src/config";
import { end as endDrawing } from "../src/draw";
import type { DrawShape } from "../src/draw";
import { defaults } from "../src/state";

const empty16 = Array(16).fill("16").join("/");

function mount(config: Config = {}) {
  const element = document.createElement("div");
  document.body.append(element);
  return factories.Chessground(element, { animation: { enabled: false }, ...config });
}

afterEach(() => vi.restoreAllMocks());

describe("upstream configuration fixes with fork state", () => {
  it("ignores own prototype and constructor keys at every merged level", () => {
    const state = defaults();
    const animation = state.animation;
    const config = JSON.parse(
      '{"__proto__":{"injected":true},"constructor":{"injected":true},"animation":{"__proto__":{"injected":true},"constructor":{"injected":true},"duration":150}}',
    );
    configure(state, config);
    expect(Object.getPrototypeOf(state)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(animation)).toBe(Object.prototype);
    expect(Object.hasOwn(state, "constructor")).toBe(false);
    expect(Object.hasOwn(animation, "constructor")).toBe(false);
    expect(state.animation).toBe(animation);
    expect(state.animation.duration).toBe(150);
  });

  it("ignores inherited configuration values while retaining Maps, DOM targets and hooks", () => {
    const state = defaults();
    const dests = new Map([["R@" as const, ["p@" as const]]]);
    const target = document.createElement("div");
    const premoveFunc = vi.fn(() => ["p@" as const]);
    const predropFunc = vi.fn(() => ["a@" as const]);
    const config: Config = Object.assign(Object.create({ orientation: "black" }), {
      dimensions: { width: 16, height: 16 },
      addDimensionsCssVarsTo: target,
      dimensionsCssVarsSuffix: "b",
      movable: { dests },
      premovable: { premoveFunc, predropFunc },
    });
    configure(state, config);
    expect(state.orientation).toBe("white");
    expect(state.dimensions).toEqual({ width: 16, height: 16 });
    expect(state.movable.dests).toBe(dests);
    expect(state.addDimensionsCssVarsTo).toBe(target);
    expect(state.dimensionsCssVarsSuffix).toBe("b");
    expect(state.premovable.premoveFunc).toBe(premoveFunc);
    expect(state.premovable.predropFunc).toBe(predropFunc);
  });

  it.each(["initialization", "set"])("keeps supplied shapes with FEN during %s", (mode) => {
    const shapes: DrawShape[] = [{ orig: "a@", dest: "p1", brush: "green" }];
    const config: Config = {
      dimensions: { width: 16, height: 16 },
      fen: `${empty16}[Rr] w - - 0 1 3+2`,
      pocketRoles: { white: ["r-piece"], black: ["r-piece"] },
      drawable: { shapes },
    };
    const api = mount(mode === "initialization" ? config : {});
    try {
      if (mode === "set") api.set(config);
      expect(api.state.drawable.shapes).toEqual(shapes);
      expect(api.state.drawable.checkCounters).toEqual({ black: "3", white: "2" });
      expect(api.state.boardState.pockets?.white.get("r-piece")).toBe(1);
      expect(api.state.boardState.pockets?.black.get("r-piece")).toBe(1);
      api.set({ fen: empty16 });
      expect(api.state.drawable.shapes).toEqual([]);
      expect(api.state.boardState.pockets?.white.size).toBe(0);
    } finally {
      api.destroy();
    }
  });

  it.each(["initialization", "set"])(
    "protects FEN-plus-shapes input from later drawings during %s",
    (mode) => {
      const shape: DrawShape = { orig: "a@", dest: "p1", brush: "green" };
      const authored = [shape];
      const config: Config = {
        dimensions: { width: 16, height: 16 },
        fen: empty16,
        drawable: { shapes: authored },
      };
      const api = mount(mode === "initialization" ? config : {});
      try {
        if (mode === "set") api.set(config);
        api.state.drawable.current = {
          orig: "b2",
          dest: "c3",
          mouseSq: "c3",
          pos: [0, 0],
          brush: "blue",
          snapToValidMove: false,
        };
        endDrawing(api.state);
        expect(authored).toEqual([shape]);
        expect(api.state.drawable.shapes).toHaveLength(2);
        expect(api.state.drawable.shapes[0]).toBe(shape);
      } finally {
        api.destroy();
      }
    },
  );

  it("replaces explicit empty drawings while updating FEN and preserving a pocket drag", () => {
    const state = defaults();
    configure(state, { pocketRoles: { white: ["r-piece"], black: [] } });
    const piece = { role: "r-piece" as const, color: "white" as const };
    state.boardState.pieces.set("a0", piece);
    state.drawable.shapes = [{ orig: "h8", brush: "blue" }];
    configure(state, { fen: "8/8/8/8/8/8/8/8[R]", drawable: { shapes: [] } });
    expect(state.drawable.shapes).toEqual([]);
    expect(state.boardState.pieces.get("a0")).toBe(piece);
    expect(state.boardState.pockets?.white.get("r-piece")).toBe(1);
  });
});

describe("upstream API fixes without changing fork method signatures", () => {
  it("keeps Study authored arrays independent of subsequent user drawings", () => {
    const authored: DrawShape[] = [{ orig: "a1", dest: "h8", brush: "green" }];
    const onChange = vi.fn();
    const api = mount({ drawable: { onChange }, fen: "8/8/8/8/8/8/8/8" });
    try {
      api.setShapes(authored);
      expect(api.state.drawable.shapes).not.toBe(authored);
      expect(api.state.drawable.shapes[0]).toBe(authored[0]);
      expect(onChange).not.toHaveBeenCalled();
      api.state.drawable.current = {
        orig: "b2",
        dest: "c3",
        mouseSq: "c3",
        pos: [0, 0],
        brush: "blue",
        snapToValidMove: false,
      };
      endDrawing(api.state);
      expect(authored).toHaveLength(1);
      expect(api.state.drawable.shapes).toHaveLength(2);
      expect(onChange).toHaveBeenCalledWith(api.state.drawable.shapes);
      authored.push({ orig: "d4", brush: "red" });
      expect(api.state.drawable.shapes.some((shape) => shape.orig === "d4")).toBe(false);
    } finally {
      api.destroy();
    }
  });

  it("initializes variant mini pockets through the additive module wrapper", () => {
    const element = document.createElement("div");
    element.classList.add("mini");
    document.body.append(element);
    const api = factories.initModule({
      el: element,
      config: {
        animation: { enabled: false },
        dimensions: { width: 16, height: 16 },
        fen: `${empty16}[Rr]`,
        pocketRoles: { white: ["r-piece"], black: ["r-piece"] },
      },
    });
    try {
      expect(api.state.dimensions).toEqual({ width: 16, height: 16 });
      expect(api.state.dom.elements.pocketTop).toBeDefined();
      expect(api.state.dom.elements.pocketBottom).toBeDefined();
      api.move("R@", "p@");
      expect(api.state.boardState.pieces.get("p@")?.role).toBe("r-piece");
      expect(api.state.boardState.pockets?.white.get("r-piece")).toBe(0);
      api.move("p@", "a@");
      expect(api.state.boardState.pieces.get("a@")?.role).toBe("r-piece");
    } finally {
      api.destroy();
    }
  });
});
