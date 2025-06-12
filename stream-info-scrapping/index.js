const puppeteer = require('puppeteer-core');
const express = require('express');
const app = express();

const BROWSER_PATH = process.env.BROWSER_PATH || '/usr/bin/google-chrome';

app.get('/stream-info', async (req, res) => {
  const stream = req.query.stream;

  if (!stream) {
    return res.status(400).json({ status: 'error', message: 'Falta el parámetro ?stream=' });
  }

  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  let m3u8Url = null;

  page.on('request', request => {
    const url = request.url();
    if (url.includes('.m3u8')) {
      m3u8Url = url;
    }
  });

  try {
    const fullUrl = `https://stream196tp.com/global1.php?stream=${encodeURIComponent(stream)}`;

    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: 20000
    });

    await page.waitForTimeout(5000); // tiempo para que cargue el player

    await browser.close();

    if (m3u8Url) {
      res.json({
        status: 'success',
        nombre: m3u8Url.split('/').pop().split('?')[0],
        redirect_url: m3u8Url
      });
    } else {
      res.status(404).json({ status: 'error', message: 'No se encontró archivo .m3u8' });
    }
  } catch (err) {
    await browser.close();
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.listen(5000, () => {
  console.log('Servidor corriendo en http://localhost:5000');
});
