/*eslint no-empty-pattern: ["error", { "allowObjectPatternsAsParameters": true }]*/
// Regression test for §9.1.
//
// Imports tests/assets/synthetic-grain.svg — three rectangular pieces,
// each with a grain line drawn by a different one of the brief's three
// detection rules at angles 0° / 45° / 90° — and asserts that every
// non-sheet part ends up with grainRule === 'lock' and
// grainSource === 'detected'. Pre-Phase 5f, the grain element was
// drawn (dashed cyan overlay) but the rule defaulted to 'free', so the
// piece nested without grain constraint.
//
// Designed to be run from CI (Linux + xvfb) or a developer machine.
// Cannot run from the Claude Code sandbox here — renderer subprocesses
// get reaped (separate issue, tracked in the Phase 5e design note).

import { _electron as electron, expect, test } from "@playwright/test";
import { OpenDialogReturnValue } from "electron";
import path from "path";

test("detected grain sets grainRule = 'lock' on every piece", async ({}, testInfo) => {
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

  // synthetic-grain.svg has three pieces — wait for the parts table to
  // catch up. Generous timeout so a hang surfaces as a meaningful
  // failure rather than a noisy timeout chain.
  await expect(mainWindow.locator("#parts tbody tr")).toHaveCount(3, {
    timeout: 15000,
  });

  const partState = await mainWindow.evaluate(() => {
    type Part = {
      filename?: string;
      sheet?: boolean;
      grainRule?: string;
      grainSource?: string;
      grainAngle?: number;
    };
    const dn = (window as unknown as { DeepNest: { parts: Part[] } }).DeepNest;
    return dn.parts.map((p) => ({
      filename: p.filename,
      sheet: !!p.sheet,
      grainRule: p.grainRule,
      grainSource: p.grainSource,
      grainAngle: p.grainAngle,
    }));
  });

  // Attach as JSON so debugging a future regression doesn't need a
  // re-run with extra logging — the captured state is always there.
  await testInfo.attach("grain-state.json", {
    body: JSON.stringify(partState, null, 2),
    contentType: "application/json",
  });

  const nonSheet = partState.filter((p) => !p.sheet);
  expect(nonSheet, "synthetic-grain.svg has 3 non-sheet pieces").toHaveLength(
    3,
  );

  for (const p of nonSheet) {
    expect(p.grainRule, `${p.filename}: grainRule must be 'lock'`).toBe("lock");
    expect(p.grainSource, `${p.filename}: grainSource must be 'detected'`).toBe(
      "detected",
    );
    expect(
      typeof p.grainAngle,
      `${p.filename}: grainAngle must be numeric`,
    ).toBe("number");
  }

  // Spot-check the three expected angles. synthetic-grain.svg encodes
  // them as 0° / 45° / 90°. The detector normalises into [0, 180).
  const angles = nonSheet.map((p) => p.grainAngle!).sort((a, b) => a - b);
  expect(angles).toEqual([0, 45, 90]);

  await electronApp.close();
});
