/*eslint no-empty-pattern: ["error", { "allowObjectPatternsAsParameters": true }]*/
// v1.5.0 folding:
//   - "Mark fold": click a piece's edge in the import preview and it is cut
//     on the fold along that edge.
//   - A mirror copy of a cut-on-fold piece is cut on the fold too (it used
//     to be nested doubled but drawn and exported as the half).
//   - Mirror-then-fold gives the same piece as fold-then-mirror.
//   - Grain lines found in the file can be re-marked.
// Uses examples/example-pattern.svg. Run locally with CI=1.

import { _electron as electron, expect, test } from "@playwright/test";
import { OpenDialogReturnValue } from "electron";
import path from "path";

type B = { x: number; y: number; width: number; height: number };
type P = {
  name?: string;
  bounds: B;
  cutOnFold?: boolean;
  foldLine?: unknown;
  mirror?: boolean;
  polygontree: { x: number; y: number }[];
};
type DN = {
  parts: P[];
  foldPart(i: number): boolean;
  mirrorPart(i: number): void;
  mirrorCopyPart(i: number): number;
};

test("Mark fold, folded mirror copies, mirror-then-fold, re-mark", async () => {
  test.setTimeout(120000);
  const electronApp = await electron.launch({
    args: ["main.js", "--no-sandbox"],
  });
  const mainWindow = await electronApp.firstWindow();
  const pattern = path.resolve(
    __dirname,
    "..",
    "examples",
    "example-pattern.svg",
  );
  await electronApp.evaluate(({ dialog }, p) => {
    dialog.showOpenDialog = async (): Promise<OpenDialogReturnValue> => ({
      filePaths: [p],
      canceled: false,
    });
  }, pattern);
  await mainWindow.click("id=import");
  const rows = mainWindow.locator("#partslist tbody tr");
  await expect(rows).toHaveCount(11, { timeout: 20000 });

  const index = (name: string) =>
    mainWindow.evaluate(
      (n) =>
        (window as unknown as { DeepNest: DN }).DeepNest.parts.findIndex(
          (p) => p.name === n,
        ),
      name,
    );
  const bounds = (i: number) =>
    mainWindow.evaluate(
      (k) => (window as unknown as { DeepNest: DN }).DeepNest.parts[k].bounds,
      i,
    );

  // Grain lines read from the file can be re-marked now.
  await expect(rows.first().locator("a.markgrain")).toHaveText("Re-mark");

  // ---- Mark fold: fold a piece along its straight top edge, clicked in
  // the preview (the first of these pieces that's on screen).
  await rows.first().locator("a.markfold").click(); // shows the preview
  await mainWindow.keyboard.press("Escape");
  const pick = await mainWindow.evaluate(() => {
    const dn = (window as unknown as { DeepNest: DN }).DeepNest;
    const svg = document.querySelector("#import-0 svg") as SVGSVGElement;
    const frame = svg.querySelector("path") as SVGGraphicsElement;
    const r = svg.getBoundingClientRect();
    for (const name of [
      "10 Cuff C2R",
      "5 Pocket C2M C2I",
      "8 Waist Tie C2M",
      "INT1 Waistband Interfacing",
    ]) {
      const k = dn.parts.findIndex((p) => p.name === name);
      const b = dn.parts[k].bounds;
      const p = new DOMPoint(b.x + b.width / 2, b.y).matrixTransform(
        frame.getScreenCTM()!,
      );
      if (
        p.x > r.left + 2 &&
        p.x < r.right - 2 &&
        p.y > r.top + 2 &&
        p.y < r.bottom - 2
      )
        return { k, x: p.x, y: p.y, name };
    }
    return null;
  });
  expect(
    pick,
    "a straight-topped piece is visible in the preview",
  ).not.toBeNull();
  const before = await bounds(pick!.k);
  await rows.nth(pick!.k).locator("a.markfold").click();
  await expect(mainWindow.locator("#grainmarker-banner")).toHaveClass(/active/);
  await mainWindow.mouse.click(pick!.x, pick!.y);
  await expect(mainWindow.locator("#grainmarker-banner")).not.toHaveClass(
    /active/,
  );
  const after = await bounds(pick!.k);
  expect(
    await mainWindow.evaluate(
      (k) =>
        !!(window as unknown as { DeepNest: DN }).DeepNest.parts[k].cutOnFold,
      pick!.k,
    ),
    `${pick!.name} is cut on the fold`,
  ).toBe(true);
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height * 2, 0);

  // ---- A mirror copy of a folded piece is folded too.
  const skirt = await index("6 Skirt Front C1MOF");
  const copy = await mainWindow.evaluate((k) => {
    const dn = (window as unknown as { DeepNest: DN }).DeepNest;
    dn.foldPart(k);
    const c = dn.mirrorCopyPart(k);
    const src = dn.parts[k];
    const cp = dn.parts[c];
    return {
      cutOnFold: !!cp.cutOnFold,
      foldLine: !!cp.foldLine,
      mirror: !!cp.mirror,
      width: cp.bounds.width,
      srcWidth: src.bounds.width,
    };
  }, skirt);
  expect(copy).toEqual({
    cutOnFold: true,
    foldLine: true,
    mirror: true,
    width: copy.srcWidth,
    srcWidth: copy.srcWidth,
  });

  // ---- Mirror then fold == fold then mirror (same doubled piece).
  const front = await index("1 Bodice Front C1MOF");
  const compare = await mainWindow.evaluate((k) => {
    const dn = (window as unknown as { DeepNest: DN }).DeepNest;
    const a = dn.mirrorCopyPart(k); // mirrored copy, then fold it
    dn.foldPart(a);
    dn.foldPart(k); // fold the original, then a mirrored copy of it
    const b = dn.mirrorCopyPart(k);
    const round = (bb: B) =>
      [bb.x, bb.y, bb.width, bb.height].map((v) => Math.round(v));
    return {
      a: round(dn.parts[a].bounds),
      b: round(dn.parts[b].bounds),
      aFold: !!dn.parts[a].cutOnFold,
    };
  }, front);
  expect(compare.aFold).toBe(true);
  expect(compare.a).toEqual(compare.b);

  // ---- A mirror copy of a mirrored piece is the un-mirrored piece (flag
  // and outline agree), and a copy that's unmirrored isn't "(mirrored)".
  const back = await index("2 Bodice Back C2M");
  const mm = await mainWindow.evaluate((k) => {
    const dn = (window as unknown as { DeepNest: DN }).DeepNest;
    const xs = (i: number) =>
      dn.parts[i].polygontree.map((p) => Math.round(p.x)).join(",");
    const original = xs(k);
    dn.mirrorPart(k);
    const c = dn.mirrorCopyPart(k);
    return { copyMirror: !!dn.parts[c].mirror, same: xs(c) === original };
  }, back);
  expect(mm).toEqual({ copyMirror: false, same: true });

  await electronApp.close();
});
