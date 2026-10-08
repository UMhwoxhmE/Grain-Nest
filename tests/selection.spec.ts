/*eslint no-empty-pattern: ["error", { "allowObjectPatternsAsParameters": true }]*/
// v1.1.2:
//   - Apply-to-selected actions unselect the rows they changed (it was easy to
//     flip a piece back by forgetting it was still selected).
//   - Deleting asks first; Backspace while typing in a box never deletes.
//   - Row actions sit in their own column, and every column — the last one
//     too — can be resized.
// Run locally with CI=1 (video recording freezes the renderer timers).

import { _electron as electron, expect, test } from "@playwright/test";
import { OpenDialogReturnValue } from "electron";
import path from "path";

type P = { name?: string; selected?: boolean; topFlip?: boolean };

test("actions unselect, deletes confirm, typing never deletes", async () => {
  test.setTimeout(120000);
  const electronApp = await electron.launch({
    args: ["main.js", "--no-sandbox"],
  });
  const mainWindow = await electronApp.firstWindow();
  await electronApp.evaluate(
    ({ dialog }, p) => {
      dialog.showOpenDialog = async (): Promise<OpenDialogReturnValue> => ({
        filePaths: [p],
        canceled: false,
      });
    },
    path.resolve(__dirname, "assets", "synthetic-top.svg"),
  );
  await mainWindow.click("id=import");
  const rows = mainWindow.locator("#partslist tbody tr");
  await expect(rows).toHaveCount(5, { timeout: 15000 });

  const state = () =>
    mainWindow.evaluate(() =>
      (window as unknown as { DeepNest: { parts: P[] } }).DeepNest.parts.map(
        (p) => ({ selected: !!p.selected, topFlip: !!p.topFlip }),
      ),
    );

  // ---- Every column has a resize grip, and the actions have their own.
  const ths = await mainWindow.locator("#partslist thead th").count();
  await expect(mainWindow.locator("#partslist thead .col-resizer")).toHaveCount(
    ths,
  );
  await expect(mainWindow.locator("#partslist thead th").last()).toHaveText(
    "Actions",
  );
  await expect(rows.nth(0).locator("td.rowactions a.fliptop")).toHaveCount(1);

  // ---- Select two rows, Flip top from the toolbar: flipped, then unselected.
  await rows.nth(1).click({ position: { x: 5, y: 5 } });
  await rows.nth(2).click({ position: { x: 5, y: 5 }, modifiers: ["Shift"] });
  let s = await state();
  const picked = s.map((p, i) => (p.selected ? i : -1)).filter((i) => i >= 0);
  expect(picked.length).toBeGreaterThan(0);
  await mainWindow.click("#partstools >> text=Flip top");
  s = await state();
  for (const i of picked) expect(s[i].topFlip, `row ${i} flipped`).toBe(true);
  expect(
    s.every((p) => !p.selected),
    "nothing left selected",
  ).toBe(true);

  // ---- Backspace while typing in a name box deletes nothing.
  await mainWindow.evaluate(() => {
    const dn = (window as unknown as { DeepNest: { parts: P[] } }).DeepNest;
    dn.parts[0].selected = true;
  });
  let deleteAsked = false;
  const onDialog = (d: { dismiss: () => Promise<void> }) => {
    deleteAsked = true;
    void d.dismiss();
  };
  mainWindow.on("dialog", onDialog);
  const nameBox = rows.nth(3).locator("input.partname");
  await nameBox.click();
  await nameBox.press("End");
  await nameBox.press("Backspace");
  await mainWindow.waitForTimeout(300);
  mainWindow.off("dialog", onDialog);
  expect(deleteAsked, "Backspace in a box must not start a delete").toBe(false);
  await expect(rows).toHaveCount(5);

  // ---- Delete asks first; saying no keeps the row, yes removes it.
  let asked = "";
  mainWindow.once("dialog", (d) => {
    asked = d.message();
    void d.dismiss();
  });
  await mainWindow.evaluate(() => {
    const dn = (window as unknown as { DeepNest: { parts: P[] } }).DeepNest;
    dn.parts.forEach((p, i) => (p.selected = i === 0));
  });
  await mainWindow.selectOption("#nestjob", "all"); // nudge a re-render
  await mainWindow.click("#partstools a.delete");
  await expect.poll(() => asked).toContain("Delete 1 row?");
  expect(asked).toContain("A Upright");
  await expect(rows).toHaveCount(5);
  mainWindow.once("dialog", (d) => void d.accept());
  await mainWindow.click("#partstools a.delete");
  await expect(rows).toHaveCount(4);

  await electronApp.close();
});
