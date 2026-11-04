
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const fs = require('fs');
const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Cargar contrato OpenAPI
const swaggerPath = path.join(
    __dirname,
    '../swagger/openapi.yaml'
);

const swaggerDocument = YAML.parse(
    fs.readFileSync(swaggerPath, 'utf8')
);

// Ruta principal
app.get('/', (req, res) => {
    res.json({
        mensaje: 'Bienvenido a ConectaLocal API',
        estado: 'Servidor funcionando'
    });
});

// Documentación Swagger
app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

// Servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`ConectaLocal API ejecutándose en puerto ${PORT}`);
    console.log(`Swagger: http://localhost:${PORT}/api-docs`);
});
