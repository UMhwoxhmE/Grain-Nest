/*eslint no-empty-pattern: ["error", { "allowObjectPatternsAsParameters": true }]*/
// v1.4.0: the app uses the logo's colours (aubergine #3B1F6E, spring leaf
// #9ED35B, moss #4F8A26, lilac white #F4F0FA) in light and dark mode, and
// none of Deepnest's cyan is left on the main screen.
// Run locally with CI=1 (video recording freezes the renderer timers).

import { _electron as electron, expect, test } from "@playwright/test";

test("Light and dark mode use the logo colours", async () => {
  const electronApp = await electron.launch({
    args: ["main.js", "--no-sandbox"],
  });
  const mainWindow = await electronApp.firstWindow();
  await expect(mainWindow.locator("#import")).toBeVisible();

  const colours = () =>
    mainWindow.evaluate(() => {
      const bg = (sel: string) =>
        getComputedStyle(document.querySelector(sel)!).backgroundColor;
      return {
        button: bg("#import"),
        buttonText: getComputedStyle(document.querySelector("#import")!).color,
        sidebar: bg("#sidenav"),
        page: getComputedStyle(document.body).backgroundColor,
        hatchLightness: getComputedStyle(document.body)
          .getPropertyValue("--hatch-lightness")
          .trim(),
      };
    });
  const setDark = async (dark: boolean) => {
    await expect(async () => {
      const isDark = await mainWindow.evaluate(() =>
        document.body.classList.contains("dark-mode"),
      );
      if (isDark !== dark) await mainWindow.click("#darkmode_tab");
      expect(
        await mainWindow.evaluate(() =>
          document.body.classList.contains("dark-mode"),
        ),
      ).toBe(dark);
    }).toPass({ timeout: 15000 });
  };

  await setDark(false);
  expect(await colours()).toEqual({
    button: "rgb(59, 31, 110)", // aubergine
    buttonText: "rgb(255, 255, 255)",
    sidebar: "rgb(59, 31, 110)",
    page: "rgb(244, 240, 250)", // lilac white
    hatchLightness: "45%",
  });

  await setDark(true);
  expect(await colours()).toEqual({
    button: "rgb(79, 138, 38)", // moss
    buttonText: "rgb(255, 255, 255)",
    sidebar: "rgb(43, 34, 54)", // very dark aubergine
    page: "rgb(23, 18, 31)",
    hatchLightness: "80%",
  });

  // No Deepnest cyan (#24c7ed / #1a98b8) on any visible element.
  const cyan = await mainWindow.evaluate(() =>
    Array.from(document.querySelectorAll("body *"))
      .filter((e) => (e as HTMLElement).offsetParent !== null)
      .filter((e) => {
        const s = getComputedStyle(e);
        return [s.backgroundColor, s.color, s.borderTopColor].some(
          (c) => c === "rgb(36, 199, 237)" || c === "rgb(26, 152, 184)",
        );
      })
      .map((e) => e.id || e.className || e.tagName),
  );
  expect(cyan).toEqual([]);
  await setDark(false);

  await electronApp.close();
});
