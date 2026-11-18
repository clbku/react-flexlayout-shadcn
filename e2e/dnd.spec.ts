import { expect, test, type Locator, type Page } from "@playwright/test";

async function centerOf(locator: Locator) {
    const box = await locator.boundingBox();
    if (!box) {
        throw new Error("element has no bounding box");
    }
    return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

async function dragMouse(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 10, from.y + 5, { steps: 5 });
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 10 });
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.move(to.x + 1, to.y, { steps: 2 });
    await page.mouse.move(to.x, to.y, { steps: 2 });
    await page.mouse.up();
}

function tabsetWithTab(page: Page, name: string) {
    return page.locator(".flexlayout__tabset").filter({ has: page.getByRole("tab", { name, exact: true }) });
}

async function tabsetTabNames(page: Page, tabName: string) {
    return page.evaluate((name) => {
        const strips = Array.from(document.querySelectorAll('[data-layout-path$="/tabstrip"]'));
        const strip = strips.find((s) => Array.from(s.querySelectorAll('[role="tab"]')).some((t) => t.getAttribute("aria-label") === name));
        return strip ? Array.from(strip.querySelectorAll('[role="tab"]')).map((t) => t.getAttribute("aria-label")) : null;
    }, tabName);
}

async function expectDragCleanedUp(page: Page) {
    await expect(page.locator(".flexlayout__outline_rect, .flexlayout__outline_rect_edge")).toHaveCount(0);
    await expect(page.locator(".flexlayout__layout_overlay")).toBeHidden();
    await expect(page.locator('[data-layout-path="/drag-rectangle"]')).toHaveCount(0);
}

async function tabContentHeights(page: Page, tabName: string) {
    return page.evaluate((name) => {
        const button = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => t.getAttribute("aria-label") === name)!;
        const panel = document.getElementById(button.getAttribute("aria-controls")!)!;
        const scrollArea = panel.querySelector('[data-slot="scroll-area"]')!;
        const content = scrollArea.querySelector(".flexlayout__tab_moveable")!.firstElementChild!;
        return {
            panel: panel.getBoundingClientRect().height,
            scrollArea: scrollArea.getBoundingClientRect().height,
            content: content.getBoundingClientRect().height,
            position: getComputedStyle(scrollArea).position,
        };
    }, tabName);
}

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tab", { name: "Explorer", exact: true })).toBeVisible();
});

test("reorder a tab inside one tabset", async ({ page }) => {
    const explorer = page.getByRole("tab", { name: "Explorer", exact: true });
    const search = page.getByRole("tab", { name: "Search", exact: true });
    await expect.poll(() => tabsetTabNames(page, "Explorer")).toEqual(["Explorer", "Search"]);

    await search.click();
    const from = await centerOf(search);
    const target = await centerOf(explorer);
    await dragMouse(page, from, { x: target.box.x + target.box.width * 0.2, y: target.y });

    await expect.poll(() => tabsetTabNames(page, "Explorer")).toEqual(["Search", "Explorer"]);
    await expectDragCleanedUp(page);

    const again = await centerOf(search);
    const explorerNow = await centerOf(explorer);
    await dragMouse(page, again, { x: explorerNow.box.x + explorerNow.box.width * 0.8, y: explorerNow.y });
    await expect.poll(() => tabsetTabNames(page, "Explorer")).toEqual(["Explorer", "Search"]);
    await expectDragCleanedUp(page);
});

test("move a tab to another tabset", async ({ page }) => {
    const counter = page.getByRole("tab", { name: "Counter", exact: true });
    const inspectorSet = tabsetWithTab(page, "Inspector");
    await counter.click();
    const from = await centerOf(counter);
    const target = await centerOf(inspectorSet);
    await dragMouse(page, from, { x: target.x, y: target.box.y + target.box.height * 0.6 });

    await expect.poll(() => tabsetTabNames(page, "Counter")).toEqual(["Inspector", "Features", "Styles", "Counter"]);
    await expect.poll(() => tabsetTabNames(page, "App.tsx")).toEqual(["App.tsx", "Layout.tsx", "README.md", "CHANGELOG.md"]);
    await expectDragCleanedUp(page);
});

test("drop a tab on the right edge splits off a new tabset", async ({ page }) => {
    const before = await page.locator(".flexlayout__tabset").count();
    const features = page.getByRole("tab", { name: "Features", exact: true });
    const inspectorSet = tabsetWithTab(page, "Inspector");
    const from = await centerOf(features);
    const target = await centerOf(inspectorSet);
    await dragMouse(page, from, { x: target.box.x + target.box.width * 0.93, y: target.box.y + target.box.height * 0.55 });

    await expect(page.locator(".flexlayout__tabset")).toHaveCount(before + 1);
    await expect.poll(() => tabsetTabNames(page, "Features")).toEqual(["Features"]);
    await expect.poll(() => tabsetTabNames(page, "Inspector")).toEqual(["Inspector", "Styles"]);
    await expectDragCleanedUp(page);
});

test("drag a splitter changes the tabset weights", async ({ page }) => {
    const explorerContainer = page.locator(".flexlayout__tabset_container").filter({ has: page.getByRole("tab", { name: "Explorer", exact: true }) });
    const before = Number(await explorerContainer.evaluate((el) => (el as HTMLElement).style.flexGrow));
    expect(before).toBeGreaterThan(0);

    const splitter = page.locator('[role="separator"][aria-orientation="vertical"][aria-valuemax="100"]').first();
    const from = await centerOf(splitter);
    await dragMouse(page, from, { x: from.x + 120, y: from.y });

    await expect.poll(async () => Number(await explorerContainer.evaluate((el) => (el as HTMLElement).style.flexGrow))).toBeGreaterThan(before);
    await expect(page.locator(".flexlayout__splitter_drag")).toHaveCount(0);
});

test("maximize a tabset and restore it", async ({ page }) => {
    const appSet = tabsetWithTab(page, "App.tsx");
    const explorerContainer = page.locator(".flexlayout__tabset_container").filter({ has: page.getByRole("tab", { name: "Explorer", exact: true }) });
    const maxButton = appSet.locator('[data-layout-path$="/button/max"]');

    await maxButton.click();
    await expect(maxButton).toHaveAttribute("aria-pressed", "true");
    await expect(explorerContainer).toBeHidden();
    const portalBox = await appSet.evaluate((el) => {
        const r = el.parentElement!.parentElement!.getBoundingClientRect();
        return { width: r.width, height: r.height };
    });
    const maximizedBox = (await appSet.boundingBox())!;
    expect(maximizedBox.width).toBeGreaterThan(portalBox.width * 0.95);
    expect(maximizedBox.height).toBeGreaterThan(portalBox.height * 0.95);

    await maxButton.click();
    await expect(maxButton).toHaveAttribute("aria-pressed", "false");
    await expect(explorerContainer).toBeVisible();
});

test("tab content fills its tab in a tabset and a border", async ({ page }) => {
    for (const name of ["App.tsx", "Outline"]) {
        await page.getByRole("tab", { name, exact: true }).click();
        await expect.poll(async () => (await tabContentHeights(page, name)).position).toBe("absolute");
        const heights = await tabContentHeights(page, name);
        expect(heights.scrollArea).toBeCloseTo(heights.panel, 1);
        expect(heights.content).toBeCloseTo(heights.panel, 1);
    }

    await page.getByRole("tab", { name: "Output", exact: true }).click();
    await expect.poll(async () => {
        const heights = await tabContentHeights(page, "Output");
        return heights.scrollArea - heights.panel;
    }).toBeCloseTo(0, 1);
});