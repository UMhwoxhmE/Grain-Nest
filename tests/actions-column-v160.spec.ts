// v1.6.0: the parts list's Actions column is pinned to the right edge of
// the panel, so narrowing the panel (or widening the preview) scrolls the
// other columns underneath it instead of hiding the buttons. Run locally
// with CI=1.

import { _electron as electron, expect, test } from "@playwright/test";
import { OpenDialogReturnValue } from "electron";
import path from "path";

test("Action buttons stay visible in a narrow parts list", async () => {
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

  for (const width of [420, 760]) {
    const where = await mainWindow.evaluate((px) => {
      const parts = document.querySelector("#parts") as HTMLElement;
      parts.style.width = px + "px";
      window.dispatchEvent(new Event("resize"));
      const scroll = document
        .querySelector("#partscroll")!
        .getBoundingClientRect();
      const button = document
        .querySelector("#partslist tbody tr a.markfold")!
        .getBoundingClientRect();
      return { right: scroll.right, buttonRight: button.right };
    }, width);
    expect(where.buttonRight).toBeLessThanOrEqual(where.right);
  }
  await rows.first().locator("a.markfold").click();
  await expect(mainWindow.locator("#grainmarker-banner")).toHaveClass(/active/);
  await electronApp.close();
});
