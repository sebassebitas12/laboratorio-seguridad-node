const express = require('express');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');

app.get('/', (req, res) => {
  res.json({
    proyecto: 'Laboratorio de seguridad con Node.js',
    estado: 'Servidor inicial en funcionamiento',
    etapa: 'La aplicación de notas y los controles de seguridad están pendientes.'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor iniciado en el puerto ${port}`);
});
