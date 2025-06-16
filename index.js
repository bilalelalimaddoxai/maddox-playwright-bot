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
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // 1) Login
    await page.goto('https://app.maddox.ai/login', { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
    ]);

    // 2) Dashboard
    await page.goto('https://app.maddox.ai/monitor', { waitUntil: 'networkidle2' });

    // 3) Scrape using evaluate()
    const itemsInspected = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div'))
        .find(d => d.textContent.includes('Items inspected'));
      return el ? el.textContent.trim() : null;
    });

    const yieldMetric = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div'))
        .find(d => d.textContent.includes('Yield'));
      return el ? el.textContent.trim() : null;
    });

    const mostCommonDefect = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('div'))
        .find(d => d.textContent.includes('Most common defects'));
      return el ? el.textContent.trim() : null;
    });

    res.json({ itemsInspected, yield: yieldMetric, mostCommonDefect });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Bot up on ${PORT}`));
