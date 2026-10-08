/*eslint no-empty-pattern: ["error", { "allowObjectPatternsAsParameters": true }]*/
// Regression test for §9.0.1 R6-A.
//
// DeepNest.placedBounds(part, placement) is the single source of truth for
// "how far does a placed piece reach" — used by the min-fabric-length stat,
// Trim sheets, and the cut-list "length used". It must reproduce the
// placement worker's convention exactly: rotate the baked polygontree about
// the ORIGIN by placement.rotation (degrees), then translate by (x, y).
// The bug it replaced (`p.x + part.bounds.width`) ignored rotation and the
// polygon's own coordinate offset (testing round 6: a 171.5 in "min length" on
// a 160 in sheet that held everything).

import { _electron as electron, expect, test } from "@playwright/test";
import { OpenDialogReturnValue } from "electron";
import path from "path";

test("placedBounds rotates about the origin then translates, like the placer", async ({}, testInfo) => {
  const electronApp = await electron.launch({
    args: ["main.js"],
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

  await expect(mainWindow.locator("#partslist tbody tr")).toHaveCount(3, {
    timeout: 15000,
  });

  const result = await mainWindow.evaluate(() => {
    type Pt = { x: number; y: number };
    type B = { x: number; y: number; width: number; height: number };
    const dn = (
      window as unknown as {
        DeepNest: {
          parts: Array<{ sheet?: boolean; polygontree: Pt[] }>;
          placedBounds(
            part: unknown,
            placement: { x: number; y: number; rotation: number },
          ): B | null;
        };
      }
    ).DeepNest;

    const bbox = (pts: Pt[]): B => {
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
      return { x: minx, y: miny, width: maxx - minx, height: maxy - miny };
    };
    // Independent reimplementation of the placement convention, for
    // cross-checking (same maths as background.js rotatePolygon).
    const place = (pts: Pt[], deg: number, dx: number, dy: number): Pt[] => {
      const rad = (deg * Math.PI) / 180;
      return pts.map((p) => ({
        x: p.x * Math.cos(rad) - p.y * Math.sin(rad) + dx,
        y: p.x * Math.sin(rad) + p.y * Math.cos(rad) + dy,
      }));
    };

    const part = dn.parts.find(
      (p) => !p.sheet && p.polygontree && p.polygontree.length >= 3,
    );
    if (!part) return { error: "no part" };
    const tree = part.polygontree;
    const raw = bbox(tree);

    const identity = dn.placedBounds(part, { x: 0, y: 0, rotation: 0 });
    const translated = dn.placedBounds(part, { x: 100, y: 50, rotation: 0 });
    const rot90 = dn.placedBounds(part, { x: 0, y: 0, rotation: 90 });
    const arbitrary = dn.placedBounds(part, { x: -30, y: 12, rotation: 37 });
    const reference = bbox(place(tree, 37, -30, 12));

    return { raw, identity, translated, rot90, arbitrary, reference };
  });

  await testInfo.attach("placed-bounds-result.json", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });

  const r = result as {
    error?: string;
    raw: { x: number; y: number; width: number; height: number };
    identity: { x: number; y: number; width: number; height: number };
    translated: { x: number; y: number; width: number; height: number };
    rot90: { x: number; y: number; width: number; height: number };
    arbitrary: { x: number; y: number; width: number; height: number };
    reference: { x: number; y: number; width: number; height: number };
  };
  expect(r.error, "an importable non-sheet piece should exist").toBeUndefined();
  const close = (a: number, b: number, msg: string) =>
    expect(Math.abs(a - b), msg).toBeLessThan(1e-6);

  // Identity placement reproduces the polygon's own bbox.
  close(r.identity.x, r.raw.x, "identity x");
  close(r.identity.y, r.raw.y, "identity y");
  close(r.identity.width, r.raw.width, "identity width");
  close(r.identity.height, r.raw.height, "identity height");

  // Pure translation shifts the box, size unchanged.
  close(r.translated.x, r.raw.x + 100, "translated x");
  close(r.translated.y, r.raw.y + 50, "translated y");
  close(r.translated.width, r.raw.width, "translated width");
  close(r.translated.height, r.raw.height, "translated height");

  // 90° about the origin swaps the box's dimensions.
  close(r.rot90.width, r.raw.height, "rot90 width = raw height");
  close(r.rot90.height, r.raw.width, "rot90 height = raw width");

  // Arbitrary rotation + translation matches the independent reference
  // (this is the case the old `p.x + bounds.width` shortcut got wrong).
  close(r.arbitrary.x, r.reference.x, "arbitrary x");
  close(r.arbitrary.y, r.reference.y, "arbitrary y");
  close(r.arbitrary.width, r.reference.width, "arbitrary width");
  close(r.arbitrary.height, r.reference.height, "arbitrary height");

  await electronApp.close();
});
