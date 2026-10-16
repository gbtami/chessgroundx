import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import type { Config } from "../src/config";
import { end as endDrag, processDrag, start as startDrag } from "../src/drag";
import * as pocket from "../src/pocket";
import type { MouchEvent } from "../src/types";

const rect = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 900,
  bottom: 800,
  width: 900,
  height: 800,
  toJSON: () => ({}),
};

function mount(config: Config = {}, mini = false, external = false) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);
  const root = document.createElement("div");
  if (mini) root.classList.add("mini");
  const top = external ? document.createElement("div") : undefined;
  const bottom = external ? document.createElement("div") : undefined;
  document.body.append(root);
  if (top && bottom) document.body.append(top, bottom);
  const api = Chessground(root, { animation: { enabled: false }, ...config }, top, bottom);
  return { root, api };
}

function frameQueue() {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
  return () => frames.shift()!(0);
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("resize and pocket listener ownership", () => {
  it.each([undefined, "b"])("disconnects observers on redraw/destroy with suffix %s", (suffix) => {
    const observers: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] =
      [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        constructor() {
          observers.push(this);
        }
      },
    );
    const { api, root } = mount({ dimensionsCssVarsSuffix: suffix });
    const target = suffix ? document.body : root;
    expect(observers[0].observe).toHaveBeenCalledWith(target);
    api.toggleOrientation();
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    expect(observers).toHaveLength(2);
    expect(observers[1].observe).toHaveBeenCalledWith(target);
    api.destroy();
    expect(observers[1].disconnect).toHaveBeenCalledOnce();
  });

  it.each(["mini", "external"])(
    "rebinds %s pocket listeners without duplicates on orientation redraw",
    (kind) => {
      const drag = vi.spyOn(pocket, "drag").mockImplementation(() => {});
      const { api } = mount(
        {
          fen: "8/8/8/8/8/8/8/8[Rr]",
          pocketRoles: {
            white: ["r-piece"],
            black: ["r-piece"],
          },
        },
        kind === "mini",
        kind === "external",
      );
      let calls = 0;
      for (let i = 0; i < 3; i++) {
        const old = api.state.dom.elements.pocketBottom!;
        api.toggleOrientation();
        const current = api.state.dom.elements.pocketBottom!;
        if (old !== current) {
          old.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          expect(drag).toHaveBeenCalledTimes(calls);
        }
        current.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        expect(drag).toHaveBeenCalledTimes(++calls);
      }
      const current = api.state.dom.elements.pocketBottom!;
      api.destroy();
      current.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      expect(drag).toHaveBeenCalledTimes(calls);
    },
  );

  it("honors the context-menu guard on view-only boards without creating a ghost", () => {
    const { api, root } = mount({ viewOnly: true, disableContextMenu: true });
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    api.state.dom.elements.board.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(root.querySelector("piece.ghost")).toBeNull();
    api.destroy();
  });
});

describe("dimension-aware input and rendering additions", () => {
  it("renders and replaces custom highlights at encoded rank 16 without losing built-in classes", () => {
    const { api } = mount({
      dimensions: { width: 16, height: 16 },
      fen: Array(16).fill("16").join("/"),
      lastMove: ["a@", "p@"],
      highlight: { custom: new Map([["p@", "variant-target"]]) },
    });
    const target = api.state.dom.elements.board.querySelector("square.variant-target")!;
    expect(target).not.toBeNull();
    expect(target.classList.contains("last-move")).toBe(true);
    api.set({ highlight: { custom: new Map([["b2", "other-target"]]) } });
    api.state.dom.redrawNow();
    expect(api.state.dom.elements.board.querySelector(".variant-target")).toBeNull();
    expect(api.state.dom.elements.board.querySelector(".other-target")).not.toBeNull();
    api.destroy();
  });

  it("does not deliver both touchstart and its compatibility mouse event as selections", () => {
    vi.useFakeTimers();
    frameQueue();
    const select = vi.fn();
    const { api } = mount({ fen: "8/8/8/8/8/8/8/R7", events: { select } });
    const event = {
      isTrusted: true,
      target: api.state.dom.elements.board,
      cancelable: true,
      clientX: 850,
      clientY: 50,
      preventDefault: vi.fn(),
    };
    startDrag(api.state, { ...event, touches: [{}], type: "touchstart" } as unknown as MouchEvent);
    startDrag(api.state, { ...event, button: 0, type: "mousedown" } as unknown as MouchEvent);
    vi.runAllTimers();
    expect(select).toHaveBeenCalledExactlyOnceWith("h8");
    api.destroy();
  });

  it.each([undefined, 1, 2])(
    "uses both cell dimensions for an opt-in touch radius %s",
    (radius) => {
      frameQueue();
      const { api } = mount({
        dimensions: { width: 9, height: 16 },
        fen: `${Array(15).fill("9").join("/")}/R8`,
        touchIgnoreRadius: radius,
      });
      const preventDefault = vi.fn();
      startDrag(api.state, {
        isTrusted: true,
        touches: [{}],
        type: "touchstart",
        cancelable: true,
        clientX: 140,
        clientY: 775,
        target: api.state.dom.elements.board,
        preventDefault,
      } as unknown as MouchEvent);
      expect(preventDefault).toHaveBeenCalledTimes(radius === 1 ? 0 : 1);
      api.destroy();
    },
  );

  it.each(["move", "drop", "premove"])(
    "cleans JS hover on exit and cancellation for %s",
    (mode) => {
      const fromPocket = mode === "drop";
      const step = frameQueue();
      const { api } = mount({
        dimensions: { width: 16, height: 16 },
        fen: `${Array(15).fill("16").join("/")}/R15[R]`,
        pocketRoles: { white: ["r-piece"], black: [] },
        jsHover: true,
        turnColor: mode === "premove" ? "black" : "white",
        premovable: { premoveFunc: () => ["p@"] },
        movable: {
          color: "white",
          free: false,
          dests: new Map([[fromPocket ? "R@" : "a1", mode === "premove" ? [] : ["p@"]]]),
        },
      });
      api.selectSquare("a1");
      if (fromPocket) api.selectPocket({ role: "r-piece", color: "white" });
      api.state.dom.redrawNow();
      const piece = { role: "r-piece" as const, color: "white" as const };
      if (fromPocket) api.state.boardState.pieces.set("a0", piece);
      api.state.draggable.current = {
        orig: fromPocket ? "a0" : "a1",
        piece,
        fromPocket,
        origPos: [0, 0],
        pos: [871.875, 25],
        started: true,
        element: document.createElement("piece"),
        originTarget: null,
        keyHasChanged: false,
      };
      processDrag(api.state);
      // A select redraw may have been queued before the drag frame.
      step();
      step();
      expect(
        api.state.dom.elements.board.querySelector("square.hover")?.getAttribute("data-key"),
      ).toBe("p@");
      api.state.draggable.current!.pos = [-20, -20];
      step();
      expect(api.state.dom.elements.board.querySelector("square.hover")).toBeNull();
      api.state.draggable.current!.pos = [871.875, 25];
      step();
      if (!fromPocket)
        endDrag(api.state, {
          type: "touchend",
          cancelable: false,
          target: document.body,
        } as unknown as MouchEvent);
      api.cancelMove();
      expect(api.state.dom.elements.board.querySelector("square.hover")).toBeNull();
      expect(api.state.boardState.pieces.has("a0")).toBe(false);
      api.destroy();
    },
  );

  it.each(["cancel", "end", "touch-origin", "frame", "api.set"])(
    "clears an existing hover after disabling jsHover via %s",
    (cleanup) => {
      const step = frameQueue();
      const { api } = mount({
        fen: "8/8/8/8/8/8/8/R7",
        jsHover: true,
        movable: { color: "white", free: false, dests: new Map([["a1", ["a2"]]]) },
      });
      const board = api.state.dom.elements.board;
      startDrag(api.state, {
        isTrusted: true,
        type: "mousedown",
        button: 0,
        clientX: 56.25,
        clientY: 750,
        target: board,
        preventDefault() {},
      } as unknown as MouchEvent);
      expect(api.state.draggable.current).toBeDefined();
      api.state.draggable.current!.started = true;
      api.state.draggable.current!.pos = [56.25, 650];
      api.state.dom.redrawNow();
      step();
      step();
      step();
      expect(board.querySelector("square.hover")?.getAttribute("data-key")).toBe("a2");

      if (cleanup === "api.set") api.set({ jsHover: false });
      else {
        api.state.jsHover = false;
        if (cleanup === "cancel") api.cancelMove();
        else if (cleanup === "end" || cleanup === "touch-origin")
          endDrag(api.state, {
            type: cleanup === "end" ? "mouseup" : "touchend",
            clientX: 56.25,
            clientY: 650,
            cancelable: false,
            target: cleanup === "end" ? board : document.body,
          } as unknown as MouchEvent);
        else {
          step();
        }
      }
      // Cleanup must be immediate, without relying on a subsequent board redraw.
      expect(board.querySelector(".hover")).toBeNull();
      if (cleanup === "api.set" || cleanup === "frame") {
        expect(api.state.draggable.current).toBeDefined();
        api.cancelMove();
      }
      api.destroy();
    },
  );

  it("adds hover keys when JS hover is enabled after destination nodes already exist", () => {
    const { api } = mount({
      fen: "8/8/8/8/8/8/8/R7",
      movable: { color: "white", free: false, dests: new Map([["a1", ["a2"]]]) },
    });
    api.selectSquare("a1");
    api.state.dom.redrawNow();
    const square = api.state.dom.elements.board.querySelector("square.move-dest")!;
    api.set({ jsHover: true });
    api.state.dom.redrawNow();
    expect(square.getAttribute("data-key")).toBe("a2");
    api.destroy();
  });

  it("cancels a drag safely if a position update removes its origin piece", () => {
    const step = frameQueue();
    const { api } = mount({ fen: "8/8/8/8/8/8/8/R7" });
    api.state.draggable.current = {
      orig: "a1",
      piece: { role: "r-piece", color: "white" },
      origPos: [0, 0],
      pos: [0, 0],
      started: true,
      element: document.createElement("piece"),
      originTarget: null,
      keyHasChanged: false,
    };
    api.state.boardState.pieces.delete("a1");
    processDrag(api.state);
    expect(() => step()).not.toThrow();
    expect(api.state.draggable.current).toBeUndefined();
    api.destroy();
  });
});
