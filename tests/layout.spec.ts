/*eslint no-empty-pattern: ["error", { "allowObjectPatternsAsParameters": true }]*/
// v1.1.1: the parts layout.
//   - Column widths and the parts-panel width are remembered across launches
//     (a window reload stands in for a relaunch), and "Reset layout" goes
//     back to the original.
//   - The Quantity / Seam boxes fit their column when it's narrowed.
//   - Add sheet opens as a pop-up over the window.
// Run locally with CI=1 (video recording freezes the renderer timers).

import { _electron as electron, expect, test } from "@playwright/test";
import { OpenDialogReturnValue } from "electron";
import path from "path";

test("layout is remembered, resettable; boxes fit columns; Add sheet pops up", async () => {
  test.setTimeout(120000);
  const electronApp = await electron.launch({
    args: ["main.js", "--no-sandbox"],
  });
  const mainWindow = await electronApp.firstWindow();
  await mainWindow.waitForSelector("#import");
  await mainWindow.evaluate(() =>
    localStorage.removeItem("grainnest.layout.v1"),
  );

  const importFixture = async () => {
    await electronApp.evaluate(
      ({ dialog }, p) => {
        dialog.showOpenDialog = async (): Promise<OpenDialogReturnValue> => ({
          filePaths: [p],
          canceled: false,
        });
      },
      path.resolve(__dirname, "assets", "synthetic-grain.svg"),
    );
    await mainWindow.click("id=import");
    await expect(mainWindow.locator("#partslist tbody tr")).toHaveCount(3, {
      timeout: 15000,
    });
  };
  await importFixture();

  // ---- Drag the Quantity column narrower (6th column, index 5).
  const qtyTh = mainWindow.locator("#partslist thead th").nth(5);
  const grip = qtyTh.locator(".col-resizer");
  const g = (await grip.boundingBox())!;
  await mainWindow.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await mainWindow.mouse.down();
  await mainWindow.mouse.move(g.x - 400, g.y + g.height / 2, { steps: 5 });
  await mainWindow.mouse.up();
  const qtyCol = await mainWindow.evaluate(
    () =>
      (document.querySelectorAll("#partslist col")[5] as HTMLElement).style
        .width,
  );
  expect(parseInt(qtyCol)).toBeLessThanOrEqual(40);

  // The quantity box fits inside its narrowed cell.
  const fit = await mainWindow.evaluate(() => {
    const td = document.querySelectorAll("#partslist tbody tr")[0].children[5];
    const input = td.querySelector("input")!;
    return {
      td: td.getBoundingClientRect().right,
      input: input.getBoundingClientRect().right,
    };
  });
  expect(fit.input).toBeLessThanOrEqual(fit.td + 0.5);

  // ---- Widen the panel (as the side-drag would) and "relaunch".
  await mainWindow.evaluate(() => {
    localStorage.setItem(
      "grainnest.layout.v1",
      JSON.stringify({
        ...JSON.parse(localStorage.getItem("grainnest.layout.v1") || "{}"),
        partsWidth: 900,
      }),
    );
  });
  await mainWindow.reload();
  await mainWindow.waitForSelector("#import");
  await importFixture();
  const restored = await mainWindow.evaluate(() => ({
    parts: (document.getElementById("parts") as HTMLElement).style.width,
    qty: (document.querySelectorAll("#partslist col")[5] as HTMLElement).style
      .width,
    frozen: document
      .getElementById("partslist")!
      .classList.contains("cols-frozen"),
  }));
  expect(restored.parts).toBe("900px");
  expect(restored.qty).toBe(qtyCol);
  expect(restored.frozen).toBe(true);

  // ---- Reset layout: back to the original, nothing remembered.
  await mainWindow.click("#resetlayout");
  const reset = await mainWindow.evaluate(() => ({
    saved: localStorage.getItem("grainnest.layout.v1"),
    parts: (document.getElementById("parts") as HTMLElement).style.width,
    qty: (document.querySelectorAll("#partslist col")[5] as HTMLElement).style
      .width,
    frozen: document
      .getElementById("partslist")!
      .classList.contains("cols-frozen"),
  }));
  expect(reset).toEqual({ saved: null, parts: "", qty: "", frozen: false });

  // ---- Add sheet opens as a fixed pop-up, and Cancel closes it.
  await mainWindow.click("id=addsheet");
  const dialog = mainWindow.locator("#sheetdialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => getComputedStyle(el).position)).toBe(
    "fixed",
  );
  await mainWindow.click("id=cancelsheet");
  await expect(dialog).toBeHidden();

  await electronApp.close();
});
