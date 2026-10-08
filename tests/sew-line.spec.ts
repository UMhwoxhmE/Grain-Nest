/*eslint no-empty-pattern: ["error", { "allowObjectPatternsAsParameters": true }]*/
// Regression test for §9.3.9 sew lines.
//
// Guards the geometry core of the sew-line feature: drawing a sew line is
// `DeepNest.polygonOffset(part.polygontree, -allowance)`. This asserts that
// a negative offset actually *insets* the nesting polygon — bounding box
// and area both shrink, the contour survives (non-empty result), and the
// input polygontree is not mutated. The offset is derived from the piece's
// own size so the test is independent of how the SVG scales on import.
//
// The *visual* half (a dashed magenta layer appears in the exported SVG,
// correctly placed for mirrored / cut-on-fold pieces) is inherently visual
// and is covered by the manual smoke test in the design note — the only
// harness here is Electron + Playwright e2e, same constraint noted in
// mirror-grain.spec.ts.

import { _electron as electron, expect, test } from "@playwright/test";
import { OpenDialogReturnValue } from "electron";
import path from "path";

test("polygonOffset insets the nesting polygon for a sew line", async ({}, testInfo) => {
  const electronApp = await electron.launch({
    args: ["main.js", "--no-sandbox"], // CI runs non-root: no Electron SUID sandbox
  });

  const mainWindow = await electronApp.firstWindow();

  const inputDir = path.resolve(__dirname, "assets");
  const files = [path.resolve(inputDir, "synthetic-grain.svg")];

  await electronApp.evaluate(({ dialog }, paths) => {
    dialog.showOpenDialog = async (): Promise<OpenDialogReturnValue> => ({
      filePaths: paths,
      canceled: false,
    });
  }, files);

  await mainWindow.click("id=import");

  await expect(mainWindow.locator("#parts tbody tr")).toHaveCount(3, {
    timeout: 15000,
  });

  const result = await mainWindow.evaluate(() => {
    type Pt = { x: number; y: number };
    type Tree = Pt[];
    const dn = (
      window as unknown as {
        DeepNest: {
          parts: Array<{ sheet?: boolean; polygontree: Tree }>;
          polygonOffset: (poly: Tree, off: number) => Pt[][];
        };
      }
    ).DeepNest;

    const bbox = (pts: Pt[]) => {
      let minx = Infinity,
        miny = Infinity,
        maxx = -Infinity,
        maxy = -Infinity;
      for (const p of pts) {
        if (p.x < minx) minx = p.x;
        if (p.y < miny) miny = p.y;
        if (p.x > maxx) maxx = p.x;
        if (p.y > maxy) maxy = p.y;
      }
      return { w: maxx - minx, h: maxy - miny };
    };
    // Shoelace area (absolute).
    const area = (pts: Pt[]) => {
      let a = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
      }
      return Math.abs(a / 2);
    };

    const idx = dn.parts.findIndex(
      (p) => !p.sheet && p.polygontree && p.polygontree.length >= 3,
    );
    const tree = dn.parts[idx].polygontree;
    const before = bbox(tree);
    const beforeArea = area(tree);
    const beforeLen = tree.length;
    const beforeFirst = { x: tree[0].x, y: tree[0].y };

    // Inset by 10% of the smaller bbox dimension — comfortably inside the
    // piece, so it can't collapse.
    const off = Math.min(before.w, before.h) * 0.1;
    const insets = dn.polygonOffset(tree, -off);
    const inset = insets && insets.length ? insets[0] : null;

    return {
      idx,
      off,
      count: insets ? insets.length : 0,
      before,
      beforeArea,
      after: inset ? bbox(inset) : null,
      afterArea: inset ? area(inset) : null,
      mutated:
        tree.length !== beforeLen ||
        tree[0].x !== beforeFirst.x ||
        tree[0].y !== beforeFirst.y,
    };
  });

  await testInfo.attach("sew-line-offset-result.json", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });

  expect(
    result.idx,
    "an importable non-sheet piece should exist",
  ).toBeGreaterThan(-1);
  expect(result.off, "a positive inset distance was derived").toBeGreaterThan(
    0,
  );
  expect(
    result.count,
    "the inset returns at least one contour",
  ).toBeGreaterThan(0);
  expect(result.after, "the inset contour has geometry").not.toBeNull();

  // The defining behaviour: a negative offset shrinks the shape.
  expect(result.after!.w, "inset width is smaller").toBeLessThan(
    result.before.w,
  );
  expect(result.after!.h, "inset height is smaller").toBeLessThan(
    result.before.h,
  );
  expect(result.afterArea!, "inset area is smaller").toBeLessThan(
    result.beforeArea,
  );
  // ...but it didn't collapse to nothing.
  expect(result.after!.w, "inset didn't collapse").toBeGreaterThan(0);
  expect(result.after!.h, "inset didn't collapse").toBeGreaterThan(0);

  // polygonOffset must not mutate its input (the part still nests/cuts at
  // the original outline).
  expect(result.mutated, "polygontree was not mutated").toBe(false);

  await electronApp.close();
});
