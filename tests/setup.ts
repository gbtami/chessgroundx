import { afterEach } from "vitest";

// Tests should not depend on DOM state left by earlier cases.
afterEach(() => {
  document.body.replaceChildren();
  document.head.querySelectorAll("[data-test-owned]").forEach((element) => element.remove());
});
