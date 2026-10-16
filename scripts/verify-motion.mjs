import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = process.env.MOTION_TEST_URL || "http://localhost:3000";
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDirectory = ".next/motion-qa";
const browser = await chromium.launch({ executablePath: chromePath, headless: true });
const runtimeErrors = [];
const publicRoutes = ["/ecosystem", "/accreditations", "/leadership", "/career", "/talk-to-us"];

await mkdir(outputDirectory, { recursive: true });

function watchPage(page, label) {
  page.on("pageerror", (error) => runtimeErrors.push(`${label}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource")) runtimeErrors.push(`${label}: ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) runtimeErrors.push(`${label}: HTTP ${response.status()} ${response.url()}`);
  });
}

const status = (page) => page.locator(".carousel-status").textContent();

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  const page = await desktop.newPage();
  watchPage(page, "desktop-home");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator(".hero.swiper-initialized").waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.classList.contains("motion-live")), "motion system should take over the intro");

  // Layered hero artwork: base, dust, orbit plane with rotating rings.
  const art = await page.locator(".swiper-slide-active .art").evaluate((element) => ({
    planes: element.querySelectorAll(".art-plane").length,
    rings: [...element.querySelectorAll(".art-ring")].map((ring) => getComputedStyle(ring).animationName),
    stageHeight: element.querySelector(".art-stage").getBoundingClientRect().height
  }));
  assert.equal(art.planes, 3);
  assert.ok(art.rings.length > 0 && art.rings.every((name) => name === "art-spin"), "text rings should rotate");
  assert.ok(art.stageHeight >= 1000, "artwork stage should cover the hero");

  // Carousel controls.
  assert.equal(await status(page), "Highlight 1 of 3");
  await page.locator(".hero-next").click();
  await page.waitForTimeout(1300);
  assert.equal(await status(page), "Highlight 2 of 3");
  await page.locator(".ind").first().click();
  await page.waitForTimeout(1300);
  assert.equal(await status(page), "Highlight 1 of 3");

  // Autoplay progress is a compositor animation, paused together with autoplay.
  await page.mouse.move(5, 500);
  await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
  await page.waitForTimeout(900);
  const progress = await page.locator(".ind.is-active").evaluate((element) => {
    const [animation] = element.getAnimations({ subtree: true });
    return { name: animation?.animationName, state: animation?.playState, time: Number(animation?.currentTime ?? 0) };
  });
  assert.equal(progress.name, "ind-progress");
  assert.equal(progress.state, "running");
  assert.ok(progress.time > 0, "progress bar should be advancing");

  await page.locator("#pauseBtn").click();
  assert.equal(await page.locator("#pauseBtn").getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator(".hero").getAttribute("data-playback"), "paused");
  const pausedStatus = await status(page);
  await page.waitForTimeout(1200);
  assert.equal(await status(page), pausedStatus);
  await page.locator("#pauseBtn").click();

  // Drag to change slide.
  const heroBox = await page.locator(".hero").boundingBox();
  assert.ok(heroBox);
  await page.mouse.move(heroBox.x + heroBox.width * 0.78, heroBox.y + heroBox.height * 0.48);
  await page.mouse.down();
  await page.mouse.move(heroBox.x + heroBox.width * 0.2, heroBox.y + heroBox.height * 0.48, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1300);
  assert.notEqual(await status(page), pausedStatus, "pointer drag should advance the carousel");

  // Scroll reveals settle, and section artwork keeps its ambient loop.
  await page.locator("#home-about").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600);
  const about = await page.locator("#home-about").evaluate((section) => ({
    art: getComputedStyle(section.querySelector(".sec-art")).animationName,
    hidden: [...section.querySelectorAll(".rv:not(.in)")].length,
    headingLines: section.querySelectorAll(".h2 .line").length
  }));
  assert.match(about.art, /sec-parallax|none/);
  assert.equal(about.hidden, 0, "revealed content should be visible");
  assert.ok(about.headingLines > 0, "section headings should be split into lines");
  await page.screenshot({ path: `${outputDirectory}/desktop-home.png`, fullPage: false });

  // Client-side navigation: no document reload, header persists, nav indicator follows.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => {
    window.__sameDocument = true;
  });
  await page.locator('.mainnav [data-nav="ecosystem"]').click();
  await page.waitForFunction(() => document.querySelector("main .page")?.getAttribute("data-page") === "ecosystem");
  assert.equal(await page.evaluate(() => window.__sameDocument), true, "navigation should not reload the document");
  assert.equal(await page.locator('.mainnav [data-nav="ecosystem"]').getAttribute("aria-current"), "page");
  await page.waitForTimeout(2500);
  const innerHero = await page.locator(".ihero").evaluate((hero) => ({
    title: getComputedStyle(hero.querySelector(".display")).opacity,
    lines: hero.querySelectorAll(".display .line").length,
    rings: hero.querySelectorAll(".art-ring").length
  }));
  assert.equal(innerHero.title, "1");
  assert.ok(innerHero.lines > 0 && innerHero.rings === 3, "ecosystem hero intro should run after client navigation");
  await desktop.close();

  // Mobile.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference", isMobile: true, hasTouch: true });
  const mobilePage = await mobile.newPage();
  watchPage(mobilePage, "mobile-home");
  await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
  await mobilePage.locator(".hero.swiper-initialized").waitFor();
  assert.equal(await mobilePage.locator("#menuBtn").isVisible(), true);
  await mobilePage.locator("#menuBtn").click();
  await mobilePage.waitForTimeout(700);
  assert.equal(await mobilePage.locator("#menuBtn").getAttribute("aria-expanded"), "true");
  assert.equal(await mobilePage.locator('.mainnav [data-nav="leadership"]').isVisible(), true);
  await mobilePage.locator("#menuBtn").click();
  await mobilePage.locator(".hero").evaluate((element) => element.swiper.slideNext());
  await mobilePage.waitForTimeout(1300);
  assert.equal(await status(mobilePage), "Highlight 2 of 3");
  const overflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `mobile page should not scroll horizontally (overflow ${overflow}px)`);
  await mobilePage.screenshot({ path: `${outputDirectory}/mobile-home.png`, fullPage: false });
  await mobile.close();

  // Reduced motion: no loops, no autoplay, content immediately visible.
  const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  watchPage(reducedPage, "reduced-motion");
  await reducedPage.goto(baseUrl, { waitUntil: "networkidle" });
  await reducedPage.locator(".hero.swiper-initialized").waitFor();
  assert.equal(await reducedPage.locator("#pauseBtn").getAttribute("aria-pressed"), "true");
  assert.equal(await reducedPage.locator("#home-about .sec-art").evaluate((element) => getComputedStyle(element).animationName), "none");
  assert.equal(await reducedPage.locator(".rv").count(), 0, "reduced motion should not hide content for reveals");
  await reduced.close();

  // Every public page: layered hero art, per-page identity, atmospheric sections.
  for (const route of publicRoutes) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "no-preference" });
    const routePage = await context.newPage();
    watchPage(routePage, route);
    await routePage.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await routePage.waitForTimeout(3200);
    const hero = await routePage.locator(".ihero").evaluate((element) => ({
      art: element.querySelector(".art")?.getAttribute("data-art"),
      planes: element.querySelectorAll(".art-plane").length,
      titleVisible: getComputedStyle(element.querySelector(".display")).opacity === "1"
    }));
    assert.ok(hero.art, `${route} should have layered hero artwork`);
    assert.equal(hero.planes, 3, `${route} hero should have three depth planes`);
    assert.ok(hero.titleVisible, `${route} hero title should be visible after the intro`);
    assert.ok((await routePage.locator(".sec-art").count()) > 0, `${route} should have atmospheric section artwork`);
    await context.close();
  }

  assert.deepEqual(runtimeErrors, [], `Browser runtime errors:\n${runtimeErrors.join("\n")}`);
  console.log("Motion QA passed: layered heroes, carousel controls/progress/drag, reveals, client navigation, mobile menu, reduced motion, all public routes.");
} finally {
  await browser.close();
}
