// A *minimal* Playwright + Express bot
const { chromium } = require('playwright');
const express = require('express');
const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Need email & password' });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    // 1. Login
    await page.goto('https://app.maddox.ai/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ timeout: 15000 });

    // 2. Dashboard
    await page.goto('https://app.maddox.ai/monitor');
    await page.waitForSelector('text=Items inspected', { timeout: 15000 });

    // 3. Grab a few visible metrics — adjust selectors as needed
    const inspected   = await page.textContent('text=Items inspected');
    const yieldMetric = await page.textContent('text=Yield');
    const defect      = await page.textContent('text=Most common defects');

    await browser.close();
    res.json({ inspected, yield: yieldMetric, mostCommonDefect: defect });

  } catch (err) {
    await browser.close();
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Bot up on ${PORT}`));
