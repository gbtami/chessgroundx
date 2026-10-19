import { afterEach, describe, expect, it, vi } from "vitest";
import { Chessground } from "../src/chessground";
import { cancel, end, start } from "../src/draw";
import type { DrawShape } from "../src/draw";
import type { Key } from "../src/types";

function mount(previewErase?: boolean) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 400,
    height: 400,
    right: 400,
    bottom: 400,
    toJSON: () => ({}),
  });
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  const root = document.createElement("div");
  document.body.append(root);
  const onChange = vi.fn();
  const api = Chessground(root, {
    fen: "8/8/8/8/8/8/8/8",
    animation: { enabled: false },
    drawable: { ...(previewErase === undefined ? {} : { previewErase }), onChange },
  });
  const redraw = () => api.state.dom.redrawNow();
  const gesture = (orig: Key, dest?: Key, brush = "green") => {
    api.state.drawable.current = {
      orig,
      dest,
      mouseSq: dest ?? orig,
      pos: [25, 375],
      brush,
      snapToValidMove: false,
    };
    redraw();
  };
  const drawn = (cls = "cg-shapes") => [...root.querySelector(`svg.${cls} > g`)!.children];
  return { root, api, onChange, redraw, gesture, drawn };
}

afterEach(() => vi.restoreAllMocks());

describe("optional pending-erase preview", () => {
  it.each([undefined, false])(
    "retains duplicate gesture rendering when previewErase is %s",
    (flag) => {
      const f = mount(flag);
      f.api.setShapes([{ orig: "a1", dest: "h8", brush: "green" }]);
      f.gesture("a1", "h8");
      expect(f.drawn()).toHaveLength(2);
      expect(f.drawn().map((el) => el.getAttribute("opacity"))).toEqual(["1", "0.9"]);
      expect(f.onChange).not.toHaveBeenCalled();
      f.api.destroy();
    },
  );

  it("fades only the matching arrow without changing shortening, markers or callbacks", () => {
    const f = mount(true);
    f.api.setShapes([
      { orig: "a1", dest: "h8", brush: "green" },
      { orig: "b1", dest: "h8", brush: "blue" },
    ]);
    f.redraw();
    const geometry = () =>
      f
        .drawn()
        .map((el) =>
          ["x1", "y1", "x2", "y2", "stroke-width", "marker-end"].map((a) => el.getAttribute(a)),
        );
    const before = geometry();
    f.gesture("a1", "h8");
    expect(f.drawn()).toHaveLength(2);
    const green = f.drawn().find((el) => el.getAttribute("stroke") === "#15781B")!;
    expect(green.getAttribute("opacity")).toBe("0.6");
    expect(geometry()).toEqual(expect.arrayContaining(before));
    expect(
      f
        .drawn()
        .find((el) => el.getAttribute("stroke") === "#003088")!
        .getAttribute("opacity"),
    ).toBe("1");
    expect(f.onChange).not.toHaveBeenCalled();
    end(f.api.state);
    f.redraw();
    expect(f.api.state.drawable.shapes).toEqual([{ orig: "b1", dest: "h8", brush: "blue" }]);
    expect(f.onChange).toHaveBeenCalledOnce();
    expect(f.drawn()).toHaveLength(1);
    f.api.destroy();
  });

  it.each([
    {
      orig: "a1",
      dest: "h8",
      brush: "green",
      below: true,
      modifiers: { hilite: "#fff" },
      label: { text: "A" },
    },
    {
      orig: "a1",
      brush: "green",
      customSvg: '<rect width="100" height="100" opacity="0.4"/>',
      label: { text: "B" },
    },
    {
      orig: "a1",
      brush: "green",
      below: true,
      customSvg: '<rect width="100" height="100" opacity="0.4"/>',
    },
  ] satisfies DrawShape[])(
    "fades/restores whole annotations without mutating them: %j",
    (shape) => {
      const f = mount(true);
      const authored = Object.freeze(shape);
      const before = JSON.stringify(authored);
      f.api.setShapes([authored]);
      f.redraw();
      const cls = shape.below ? "cg-custom-below" : "cg-custom-svgs";
      const overlayBefore = f.drawn(cls)[0].outerHTML;
      f.gesture(shape.orig, "dest" in shape ? shape.dest : undefined);
      expect(f.drawn(cls)[0].getAttribute("opacity")).toBe("0.6");
      if ("modifiers" in shape) {
        const outlined = f.drawn("cg-shapes-below")[0];
        expect(outlined.getAttribute("opacity")).toBe("0.6");
        expect([...outlined.children].map((el) => el.getAttribute("opacity"))).toEqual(["1", "1"]);
      }
      if ("customSvg" in shape)
        expect(f.root.querySelector("rect")!.getAttribute("opacity")).toBe("0.4");
      cancel(f.api.state);
      f.redraw();
      expect(f.drawn(cls)[0].outerHTML).toBe(overlayBefore);
      expect(f.api.state.drawable.shapes[0]).toBe(authored);
      expect(JSON.stringify(authored)).toBe(before);
      expect(f.onChange).not.toHaveBeenCalled();
      f.api.destroy();
    },
  );

  it("scales a custom brush's opacity once for the entire outlined arrow", () => {
    const f = mount(true);
    f.api.set({
      drawable: {
        brushes: { teaching: { key: "teaching", color: "#789", opacity: 0.5, lineWidth: 12 } },
      },
    });
    f.api.setShapes([{ orig: "a1", dest: "h8", brush: "teaching", modifiers: { hilite: "#fff" } }]);
    f.redraw();
    expect(f.drawn()[0].getAttribute("opacity")).toBe("0.5");
    f.gesture("a1", "h8", "teaching");
    expect(f.drawn()).toHaveLength(1);
    expect(f.drawn()[0].getAttribute("opacity")).toBe("0.3");
    expect([...f.drawn()[0].children].map((el) => el.getAttribute("opacity"))).toEqual(["1", "1"]);
    cancel(f.api.state);
    f.redraw();
    expect(f.drawn()[0].getAttribute("opacity")).toBe("0.5");
    expect(f.onChange).not.toHaveBeenCalled();
    f.api.destroy();
  });

  it("restores a circle when leaving the board or disabling the preview mid-gesture", () => {
    const f = mount(true);
    f.api.setShapes([{ orig: "a1", brush: "green" }]);
    f.gesture("a1");
    expect(f.drawn()[0].getAttribute("opacity")).toBe("0.6");
    f.api.state.drawable.current!.mouseSq = undefined;
    f.redraw();
    expect(f.drawn()).toHaveLength(1);
    expect(f.drawn()[0].getAttribute("opacity")).toBe("1");
    f.api.state.drawable.current!.mouseSq = "a1";
    f.redraw();
    expect(f.drawn()[0].getAttribute("opacity")).toBe("0.6");
    f.api.set({ drawable: { previewErase: false } });
    f.redraw();
    expect(f.drawn().map((el) => el.getAttribute("opacity"))).toEqual(["1", "0.9"]);
    cancel(f.api.state);
    f.redraw();
    expect(f.drawn()).toHaveLength(1);
    expect(f.onChange).not.toHaveBeenCalled();
    f.api.destroy();
  });

  it("uses the existing first-match toggle rule for duplicate endpoints and different brushes", () => {
    const f = mount(true);
    const green: DrawShape = { orig: "a1", dest: "h8", brush: "green" };
    const red: DrawShape = { ...green, brush: "red" };
    f.api.setShapes([red, green]);
    f.gesture("a1", "h8");
    expect(f.drawn()).toHaveLength(3);
    expect(f.drawn().every((el) => el.getAttribute("opacity") !== "0.6")).toBe(true);
    end(f.api.state);
    expect(f.api.state.drawable.shapes).toEqual([green]);
    expect(f.onChange).toHaveBeenCalledOnce();
    f.api.setShapes([green, red]);
    f.gesture("a1", "h8");
    expect(f.drawn().map((el) => el.getAttribute("opacity"))).toEqual(["0.6", "0.6"]);
    end(f.api.state);
    f.redraw();
    expect(f.api.state.drawable.shapes).toEqual([]);
    expect(f.drawn()).toHaveLength(0);
    expect(f.onChange).toHaveBeenCalledTimes(2);
    f.api.destroy();
  });

  it("leaves automatic hints and piece ghosts alone", () => {
    const f = mount(true);
    const shared: DrawShape = { orig: "a1", dest: "h8", brush: "green" };
    f.api.setShapes([shared]);
    f.api.setAutoShapes([
      { ...shared, modifiers: { lineWidth: 14 } },
      { orig: "b2", piece: { role: "pr-piece", color: "white", promoted: true } },
    ]);
    f.redraw();
    const ghost = f.root.querySelector("cg-auto-pieces")!.innerHTML;
    f.gesture("a1", "h8");
    expect(f.drawn().map((el) => el.getAttribute("opacity"))).toEqual(["1", "0.6"]);
    expect(f.root.querySelector("cg-auto-pieces")!.innerHTML).toBe(ghost);
    f.api.setShapes([]);
    f.redraw();
    expect(f.drawn().every((el) => el.getAttribute("opacity") !== "0.6")).toBe(true);
    cancel(f.api.state);
    f.redraw();
    expect(f.drawn()).toHaveLength(1);
    expect(f.onChange).not.toHaveBeenCalled();
    f.api.destroy();
  });

  it("cancels an opted-in touch gesture and rejects a multi-finger start without changing shapes", () => {
    const f = mount(true);
    f.api.setShapes([{ orig: "a1", brush: "green" }]);
    start(f.api.state, {
      touches: [
        { clientX: 25, clientY: 375 },
        { clientX: 30, clientY: 380 },
      ],
    } as unknown as Parameters<typeof start>[1]);
    expect(f.api.state.drawable.current).toBeUndefined();
    f.gesture("a1");
    document.dispatchEvent(new Event("touchcancel"));
    f.redraw();
    expect(f.api.state.drawable.current).toBeUndefined();
    expect(f.drawn()[0].getAttribute("opacity")).toBe("1");
    expect(f.api.state.drawable.shapes).toEqual([{ orig: "a1", brush: "green" }]);
    expect(f.onChange).not.toHaveBeenCalled();
    f.api.destroy();
  });
});
