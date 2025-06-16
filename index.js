const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Need email & password' });
  }

  let browser;
  try {
    // 1) Launch bundled Chromium
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // 2) Login
    await page.goto('https://app.maddox.ai/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 3) Go to dashboard
    await page.goto('https://app.maddox.ai/monitor', { waitUntil: 'networkidle2' });
    await page.waitForSelector('text=Items inspected');

    // 4) Scrape
    const itemsInspected     = await page.$eval('text=Items inspected', el => el.innerText);
    const yieldMetric        = await page.$eval('text=Yield', el => el.innerText);
    const mostCommonDefect   = await page.$eval('text=Most common defects', el => el.innerText);

    res.json({ itemsInspected, yield: yieldMetric, mostCommonDefect });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Bot up on ${PORT}`));
