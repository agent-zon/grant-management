import express from 'express';
import cors from 'cors';
import compression from 'compression';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import domain routes
import grantRouter from './domains/grant-simple.js';
import mcpRouter from './domains/mcp-integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Grant Management API',
      version: '2.0.0',
      description: 'OAuth 2.0 Grant Management API with SSR for Agent Authorization System'
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    }
  },
  apis: ['./server/domains/*.tsx', './server/index.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0-ssr'
  });
});

// Mount domain routes
app.use('/', grantRouter);
app.use('/', mcpRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'internal_server_error',
    message: 'An internal server error occurred',
    timestamp: new Date().toISOString()
  });
});

// Create data directory
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Grant Management Server (SSR) running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🎨 Grant Management UI: http://localhost:${PORT}/grants`);
});

export default app;