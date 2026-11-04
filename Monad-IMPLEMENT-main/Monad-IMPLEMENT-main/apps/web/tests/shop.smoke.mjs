// Frontend-only browser checks. Start a local Next server, then run:
// node tests/shop.smoke.mjs http://127.0.0.1:3100 <absolute-artifact-directory>
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const base = process.argv[2] ?? "http://127.0.0.1:3100";
const output = path.resolve(process.argv[3] ?? ".next/shop-qa");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
const assetFailures = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => { if (response.url().includes("/agents/") && /\.(webp|png)/.test(response.url()) && response.status() >= 400) assetFailures.push(`${response.status()} ${response.url()}`); });
page.setDefaultTimeout(15000);
const visit = async (route) => { const response = await page.goto(`${base}${route}`); assert.equal(response.status(), 200, route); await page.locator("h1").waitFor(); };
const visibleImages = async () => {
  for (const img of await page.locator(".agent-character img").all()) {
    assert(await img.evaluate((el) => el.complete && el.naturalWidth > 0), "Character image must load");
  }
};
try {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit("/");
  for (const name of ["Clawd", "Happy Nailong", "Chotu"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.locator(".agent-showcase").getByRole("heading", { name, exact: true }).waitFor();
    assert(await page.locator(".agent-showcase").getByRole("link", { name: `Meet ${name}`, exact: true }).isVisible());
  }
  await visit("/agents");
  for (const [category, name] of [["Development", "Clawd"], ["Creative", "Happy Nailong"], ["Research", "Chotu"]]) {
    await page.getByRole("button", { name: category, exact: true }).click();
    assert.equal(await page.locator("article").count(), 1);
    assert(await page.locator("article").getByRole("heading", { name, exact: true }).isVisible());
  }
  await page.getByRole("button", { name: "All agents", exact: true }).click();
  await page.getByRole("textbox", { name: "Search agents" }).fill("  CLawD  ");
  assert.equal(await page.locator("article").count(), 1);
  await page.getByRole("textbox", { name: "Search agents" }).fill("nothing-matches");
  await page.getByRole("heading", { name: "No companions found" }).waitFor();
  await page.getByRole("button", { name: "Show all agents" }).click();
  assert.equal(await page.locator("article").count(), 3);
  await page.locator("article").first().getByRole("link", { name: "Meet agent", exact: true }).click();
  await page.waitForURL("**/agents/clawd");
  const trigger = page.getByRole("button", { name: /^Hire / });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const brief = dialog.getByRole("textbox");
  await brief.fill("   ");
  assert(await dialog.getByRole("button", { name: "Save my brief" }).isDisabled());
  await brief.fill("Review my frontend accessibility.");
  await dialog.getByRole("button", { name: "Save my brief" }).click();
  await dialog.getByRole("button", { name: "Brief saved" }).waitFor();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    assert(await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)), "Focus must stay in dialog");
  }
  await page.keyboard.press("Escape");
  assert(await trigger.evaluate((el) => el === document.activeElement), "Trigger regains focus");
  await page.reload();
  await trigger.click();
  assert.equal(await brief.inputValue(), "Review my frontend accessibility.");
  await brief.fill("Updated accessibility brief.");
  assert(await dialog.getByRole("button", { name: "Save my brief" }).isEnabled());
  await dialog.getByRole("button", { name: "Save my brief" }).click();
  await page.keyboard.press("Escape");
  await visit("/agents/chotu");
  await trigger.click();
  assert.equal(await brief.inputValue(), "", "Briefs are separate per character");
  await page.keyboard.press("Escape");

  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 900 });
    for (const route of ["/", "/agents", "/agents/clawd", "/agents/happynailong", "/agents/chotu"]) {
      await visit(route);
      await visibleImages();
      await page.waitForFunction(() => [...document.querySelectorAll("h1 span")].every((el) => Number(getComputedStyle(el).opacity) > 0.99));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow: ${route} at ${width}`);
      await page.screenshot({ path: path.join(output, `${route.replaceAll("/", "-") || "home"}-${width}.png`), fullPage: true, animations: "disabled" });
    }
    await trigger.click();
    assert(await dialog.evaluate((el) => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }), `Dialog fits at ${width}`);
    await page.screenshot({ path: path.join(output, `dialog-${width}.png`), animations: "disabled" });
    await page.keyboard.press("Escape");
    if (width <= 768) {
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await page.getByRole("navigation", { name: "Mobile", exact: true }).getByRole("link", { name: "Agents", exact: true }).click();
      await page.waitForURL("**/agents");
      assert(await page.getByRole("button", { name: "Open menu", exact: true }).isVisible());
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit("/agents");
  assert(await page.locator(".agent-character img").evaluateAll((images) => images.every((img) => img.currentSrc.endsWith("-still.png"))), "Reduced motion selects stills");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const failureContext = await browser.newContext();
  const failurePage = await failureContext.newPage();
  await failurePage.route("**/agents/clawd-idle.webp", (route) => route.abort());
  await failurePage.goto(`${base}/agents`);
  await failurePage.getByRole("img", { name: "Clawd preview unavailable" }).waitFor();
  await failureContext.close();
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error("Storage blocked"); };
    Storage.prototype.setItem = () => { throw new Error("Storage blocked"); };
  });
  await visit("/agents/clawd");
  await trigger.click();
  await brief.fill("Keep this brief available when storage fails.");
  await dialog.getByRole("button", { name: "Save my brief" }).click();
  await dialog.getByText("Your browser could not save the brief. Copy the text to keep it.").waitFor();
  assert.equal(await brief.inputValue(), "Keep this brief available when storage fails.");
  await page.keyboard.press("Escape");
  const missing = await page.goto(`${base}/agents/unknown-character`);
  assert.equal(missing.status(), 404);
  await page.getByRole("heading", { name: "This agent isn’t in the crew." }).waitFor();
  assert.deepEqual(errors, [], "No browser runtime errors");
  assert.deepEqual(assetFailures, [], "No failed character responses");
  console.log(JSON.stringify({ result: "passed", widths: [1440, 768, 390, 320], screenshots: output, checks: "Selectors, search, filters, navigation, briefs, storage failure, keyboard, reduced motion, missing images, 404, overflow and console" }, null, 2));
} finally {
  await browser.close();
}
