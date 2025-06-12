const express = require('express');
const fetch = require('node-fetch');
const url = require('url');

const app = express();

// Middleware: CORS + sin caché
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// 🔄 Endpoint HLS M3U8 con reescritura
app.get('/proxy/:canal.m3u8', async (req, res) => {
  const canal = req.params.canal;
  console.log(`📺 [M3U8] Petición para canal: ${canal}`);

  try {
    const scraperUrl = `http://scraper:5000/stream-info?stream=${canal}`;
    console.log(`🔍 Consultando scraper: ${scraperUrl}`);

    const scraperRes = await fetch(scraperUrl);
    const data = await scraperRes.json();

    if (data.status !== 'success' || !data.redirect_url) {
      console.error('❌ Respuesta inválida del scraper');
      return res.status(502).send('Scraper falló o sin URL válida');
    }

    const redirectUrl = data.redirect_url;
    const baseSegmentUrl = redirectUrl.substring(0, redirectUrl.lastIndexOf('/') + 1);

    console.log(`➡️ Redireccionando a stream: ${redirectUrl}`);

    const m3u8Res = await fetch(redirectUrl);
    let body = await m3u8Res.text();

    // 📝 Reescritura de .ts para que pasen por el proxy
    body = body.replace(/^(?!#)(.*\.ts(\?.*)?)$/gm, (line) => {
	return baseSegmentUrl + line;
//      const encodedSegment = encodeURIComponent(line);
//      const encodedBase = encodeURIComponent(baseSegmentUrl);
//      const full = `/proxy/segment/${encodedSegment}?base=${encodedBase}`;
//      console.log(`🔁 Reescrito: ${line} ➜ ${full}`);
//      return full;
    });

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(body);
  } catch (e) {
    console.error('🔥 Error al servir el M3U8:', e);
    res.status(500).send('Error interno en el proxy');
  }
});

// 🧩 Endpoint para los segmentos TS
app.get('/proxy/segment/:file', async (req, res) => {
  const file = decodeURIComponent(req.params.file);
  const base = req.query.base;

  if (!base) {
    console.warn('⚠️ Falta parámetro base');
    return res.status(400).send('Falta parámetro base');
  }

  const segmentUrl = base + file;
  console.log(`🎞️ Solicitando segmento: ${segmentUrl}`);

  try {
    const segmentRes = await fetch(segmentUrl);

    if (!segmentRes.ok) {
      console.error(`❌ Segmento con error HTTP: ${segmentRes.status}`);
      return res.status(segmentRes.status).send('Segmento no disponible');
    }

    res.set('Content-Type', segmentRes.headers.get('content-type') || 'video/MP2T');
    segmentRes.body.pipe(res);
  } catch (e) {
    console.error('🔥 Error al servir segmento:', e);
    res.status(500).send('Error interno en el segmento');
  }
});

app.listen(3000, () => {
  console.log('🚀 Proxy dinámico escuchando en http://localhost:3000');
});
