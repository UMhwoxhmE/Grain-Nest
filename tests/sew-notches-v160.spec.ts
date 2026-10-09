// v1.6.0: notches cut into the cutting line (small triangles, as
// many commercial patterns and the grading script draw them, or slits) are left out of
// the sew line. Before, insetting them made the sew line spike into the
// piece. Real points and corners must be kept. Run locally with CI=1.

import { _electron as electron, expect, test } from "@playwright/test";

type Pt = { x: number; y: number };

test("Sew line ignores notches but keeps real points", async () => {
  const electronApp = await electron.launch({
    args: ["main.js", "--no-sandbox"],
  });
  const mainWindow = await electronApp.firstWindow();
  await mainWindow.evaluate(async () => {
    const start = Date.now();
    while (!(window as unknown as { DeepNest?: unknown }).DeepNest) {
      if (Date.now() - start > 20000) throw new Error("app not ready");
      await new Promise((r) => setTimeout(r, 50));
    }
  });

  const result = await mainWindow.evaluate(async () => {
    const mod = (await import(
      // @ts-expect-error -- built file, loaded in the app window
      "../build/ui/services/export.service.js"
    )) as { withoutNotches(ring: Pt[], max: number): Pt[] };
    const dn = (
      window as unknown as {
        DeepNest: { polygonOffset(p: Pt[], d: number): Pt[][] };
      }
    ).DeepNest;
    const mm = 96 / 25.4;
    const P = (x: number, y: number): Pt => ({ x: x * mm, y: y * mm });
    // 200 x 100 mm with a triangle notch (6.4 mm base, 7 mm sides) on the
    // top edge, a 6 mm slit on the right edge and a 40 mm point at the
    // bottom (like a collar point), which is not a notch.
    const piece = [
      P(0, 0),
      P(96.8, 0),
      P(100, -6.2),
      P(103.2, 0),
      P(200, 0),
      P(200, 50),
      P(206, 50),
      P(200, 50.01),
      P(200, 100),
      P(120, 100),
      P(100, 140),
      P(80, 100),
      P(0, 100),
    ];
    const clean = mod.withoutNotches(piece, 12 * mm);
    const sew = dn.polygonOffset(clean, -15 * mm)[0];
    const ys = sew.map((p) => p.y / mm);
    const xs = sew.map((p) => p.x / mm);
    return {
      keptPoint: clean.some((p) => Math.abs(p.y / mm - 140) < 0.01),
      noTip: !clean.some((p) => p.y / mm < -1 || p.x / mm > 201),
      // The sew line stays 15 mm in from the top and right edges.
      top: Math.min(...ys),
      right: Math.max(...xs),
    };
  });

  expect(result.keptPoint).toBe(true);
  expect(result.noTip).toBe(true);
  expect(result.top).toBeCloseTo(15, 1);
  expect(result.right).toBeCloseTo(185, 1);
  await electronApp.close();
});
