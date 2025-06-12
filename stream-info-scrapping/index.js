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

  // Interceptamos las peticiones para detectar el .m3u8 correcto
  page.on('request', request => {
    const url = request.url();
    const type = request.resourceType();

    if ((type === 'media' || type === 'xhr' || type === 'fetch') && url.includes('.m3u8')) {
      // Ignoramos algunas variantes conocidas no deseadas
      if (
        !url.includes('audio') &&
        !url.includes('preview') &&
        !url.includes('low') &&
        !url.includes('subtitles')
      ) {
        m3u8Url = url;
        console.log('🎯 Detectado m3u8 válido:', m3u8Url);
      }
    }
  });

  try {
    const fullUrl = `https://stream196tp.com/global1.php?stream=${encodeURIComponent(stream)}`;
    console.log('🌐 Navegando a:', fullUrl);

    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: 20000
    });

    await page.waitForTimeout(3000); // tiempo extra para que cargue bien el player

    // Validamos que sea un master playlist
    let isMaster = false;

    if (m3u8Url) {
      try {
        const content = await page.evaluate(async (url) => {
          const res = await fetch(url);
          return await res.text();
        }, m3u8Url);

        if (content.includes('#EXT-X-STREAM-INF')) {
          isMaster = true;
          console.log('✅ Confirmado como master playlist');
        } else {
          console.log('⚠️ No es master playlist. Puede ser segmento directo.');
        }
      } catch (err) {
        console.error('❌ Error al validar playlist:', err.message);
      }
    }

    await browser.close();

    if (m3u8Url) {
      res.json({
        status: 'success',
        nombre: m3u8Url.split('/').pop().split('?')[0],
        redirect_url: m3u8Url,
        master: isMaster
      });
    } else {
      res.status(404).json({ status: 'error', message: 'No se encontró archivo .m3u8 válido' });
    }
  } catch (err) {
    await browser.close();
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.listen(5000, () => {
  console.log('🚀 Servidor scraper corriendo en http://localhost:5000');
});
