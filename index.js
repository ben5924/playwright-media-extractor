const express = require("express");
const { chromium } = require("playwright");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post("/extract-media", async (req, res) => {
  const { url, options = {} } = req.body;
  if (!url) return res.status(400).json({ success: false, error: "Missing URL" });

  console.log(`Extracting media from: ${url}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { timeout: options.timeout || 30000 });
    await page.waitForSelector(options.waitForSelector || "img, video", { timeout: options.timeout || 30000 });

    const mediaHandles = await page.$$("img, video");
    const mediaUrls = await Promise.all(mediaHandles.map(el => el.getAttribute("src")));

    await browser.close();

    res.json({
      success: true,
      mediaUrls: mediaUrls.filter(Boolean),
      mediaType: mediaUrls.some(url => url && url.includes(".mp4")) ? "video" : "image",
      metadata: { method: "playwright", count: mediaUrls.length },
    });
  } catch (e) {
    await browser.close();
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Playwright media extractor running on port ${PORT}`);
});
