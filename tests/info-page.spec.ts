/*eslint no-empty-pattern: ["error", { "allowObjectPatternsAsParameters": true }]*/
// The info tab: its text used to run off the right edge (side padding added
// to a full-width page). It must fit, link to the public source code and
// list the licences the code is under.
// Run locally with CI=1 (video recording freezes the renderer timers).

import { _electron as electron, expect, test } from "@playwright/test";

test("Info tab fits the window and shows source and licences", async () => {
  const electronApp = await electron.launch({
    args: ["main.js", "--no-sandbox"],
  });
  const mainWindow = await electronApp.firstWindow();
  const info = mainWindow.locator("#info");
  // The tab only responds once the app has finished starting up.
  await expect(async () => {
    await mainWindow.click("#info_tab");
    await expect(info).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15000 });

  const fit = await info.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    right: el.getBoundingClientRect().right,
    windowWidth: window.innerWidth,
  }));
  expect(fit.scrollWidth).toBeLessThanOrEqual(fit.clientWidth);
  expect(fit.right).toBeLessThanOrEqual(fit.windowWidth);

  await expect(
    info.locator('a[href="https://github.com/UMhwoxhmE/Grain-Nest"]'),
  ).toBeVisible();
  const text = (await info.innerText()).toLowerCase();
  for (const words of [
    "mit",
    "gnu gpl v3",
    "boost software license",
    "jack qiao",
  ]) {
    expect(text).toContain(words);
  }
  expect(text).not.toContain("dave");

  await electronApp.close();
});
