import { Router } from 'express';
import { openApiDocument } from './openapi';

const router = Router();

router.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

router.get('/api-docs', (_req, res) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https://unpkg.com; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://fastapi.tiangolo.com; font-src 'self' https://unpkg.com; connect-src 'self';"
  );

  res.type('html').send(`<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WeLive Swagger Docs</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
    />
    <style>
      body {
        margin: 0;
        background: #fafafa;
      }
      .topbar {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        displayRequestDuration: true,
        persistAuthorization: true,
      });
    </script>
  </body>
</html>`);
});

export default router;
