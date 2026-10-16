import { describe, expect, it, vi } from "vitest";
import { syncShapes, type SyncableShape } from "../src/sync";

describe("shape synchronization", () => {
  it.each(["html", "svg"])("ignores non-element children in the %s layer", (kind) => {
    const create = (tag: string) =>
      kind === "svg"
        ? document.createElementNS("http://www.w3.org/2000/svg", tag)
        : document.createElement(tag);
    const root = create(kind === "svg" ? "g" : "div");
    const kept = create("piece");
    kept.setAttribute("cgHash", "kept");
    const stale = create("piece");
    stale.setAttribute("cgHash", "stale");
    root.append("\n", kept, document.createComment("layer separator"), stale, "\n");
    const shapes: SyncableShape[] = ["kept", "new"].map((hash) => ({
      shape: { orig: "a1", brush: "green" },
      current: false,
      hash,
    }));
    const render = vi.fn(({ hash }: SyncableShape) => {
      const element = create("piece");
      element.setAttribute("cgHash", hash);
      return element;
    });

    syncShapes(shapes, root, render);

    expect(root.firstElementChild).toBe(kept);
    expect([...root.children].map((element) => element.getAttribute("cgHash"))).toEqual([
      "kept",
      "new",
    ]);
    expect(stale.parentNode).toBeNull();
    expect(render).toHaveBeenCalledTimes(1);
    syncShapes(shapes, root, render);
    expect(render).toHaveBeenCalledTimes(1);
  });
});
