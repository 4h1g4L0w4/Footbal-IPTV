const express = require('express');
const fetch = require('node-fetch');
const url = require('url');

const app = express();
const SCRAPER_BASE_URL = 'http://scraper:5000/stream-info';

// Sirve el archivo .m3u8 desde el enlace que devuelve el scraper
app.get('/proxy/:stream.m3u8', async (req, res) => {
  const stream = req.params.stream;

  try {
    const scraperResponse = await fetch(`${SCRAPER_BASE_URL}?stream=${encodeURIComponent(stream)}`);
    const data = await scraperResponse.json();

    if (data.status !== 'success') {
      return res.status(500).send('Error al obtener el enlace del scraper');
    }

    const m3u8Url = data.redirect_url;
    const segmentBaseUrl = m3u8Url.substring(0, m3u8Url.lastIndexOf('/') + 1);

    const m3u8Response = await fetch(m3u8Url);
    if (!m3u8Response.ok) return res.status(500).send('Error al obtener el archivo .m3u8');

    let body = await m3u8Response.text();

    // Reescribe los nombres de los segmentos para que pasen por el proxy
    body = body.replace(/([^\n]+\.ts)/g, (match) => `/proxy/segment/${encodeURIComponent(Buffer.from(segmentBaseUrl + match).toString('base64'))}`);

    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(body);
  } catch (err) {
    console.error('Error en proxy:', err);
    res.status(500).send('Error interno');
  }
});

// Sirve los segmentos .ts usando base64 de la URL
app.get('/proxy/segment/:base64', async (req, res) => {
  const encoded = req.params.base64;
  let decodedUrl;

  try {
    decodedUrl = Buffer.from(encoded, 'base64').toString('utf-8');
  } catch (e) {
    return res.status(400).send('URL inválida');
  }

  try {
    const segmentResponse = await fetch(decodedUrl);
    if (!segmentResponse.ok) return res.status(500).send('Error al obtener segmento');

    res.set('Content-Type', segmentResponse.headers.get('content-type') || 'application/octet-stream');
    segmentResponse.body.pipe(res);
  } catch (err) {
    console.error('Error en segmento:', err);
    res.status(500).send('Error al servir segmento');
  }
});

app.listen(3000, () => console.log('Proxy dinámico escuchando en http://localhost:3000'));
