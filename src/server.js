import dotenv from 'dotenv';
dotenv.config();
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path, { dirname } from 'path';

import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import foodRouter from './routers/food.router.js';
import userRouter from './routers/user.router.js';
import orderRouter from './routers/order.router.js';
import uploadRouter from './routers/upload.router.js';
// import paymentRoutes from './routers/paymentRoutes.js';
import { dbconnect, dbclose } from './config/database.config.js';
import monitoringRouter from './routers/monitoring.router.js';
import { cache } from './utils/simpleCache.js';
import { graphqlHTTP } from 'express-graphql';
import { schema } from './graphQL/schema.js';

import paymentRoutes from './routers/paymentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Setup log directory
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}
const logFilePath = path.join(logDirectory, 'access.log');
const accessLogStream = fs.createWriteStream(logFilePath, { flags: 'a' });

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(morgan('dev'));
app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.json());

const allowedOrigins = [
  'https://delish-frontend-ctniwh08u-john-michaels-projects-49379021.vercel.app/'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed from this origin: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: true }));

// Monitoring routes
app.use('/api/monitoring', monitoringRouter);

// Cache metrics endpoint
app.get('/metrics/cache', async (req, res) => {
  try {
    const stats = {
      hitRatio: cache.metrics.hitRatio,
      totalRequests: cache.metrics.totalRequests,
      hits: cache.metrics.hits,
      misses: cache.metrics.misses,
      lastUpdated: cache.metrics.lastUpdated,
      timestamp: new Date().toISOString()
    };
    res.json(stats);
  } catch (error) {
    console.error('Error getting cache metrics:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// Swagger Setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Delish Food Delivery API',
      version: '1.0.0',
      description: 'Auto-generated API documentation for Delish using Swagger',
    },
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
  },
  apis: ['./src/routers/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.get("/test", (req, res) => res.send("API working"));
app.use('/api/foods', foodRouter);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/payment', paymentRoutes);
// ✅ Move GraphQL route above fallback
app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    graphiql: true,
  })
);

// Serve static files
const publicFolder = path.join(__dirname, 'public');
app.use(express.static(publicFolder));

// Fallback for SPA

// Error handler
app.use((err, req, res, next) => {
  console.error(`Error in ${req.method} ${req.url}:`, err.stack);
  res.setHeader('Content-Type', 'application/json');
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// app.get('*', (req, res) => {
//   const indexFilePath = path.join(publicFolder, 'index.html');
//   res.sendFile(indexFilePath);
// });


// Graceful shutdown logic
const gracefulShutdown = async (server, dbConnection) => {
  try {
    console.log('Received shutdown signal');

    // Close HTTP server
    await new Promise((resolve) => server.close(resolve));
    console.log('HTTP server closed');

    // Close Redis
    if (cache?.client?.isReady) {
      await cache.client.quit();
      console.log('Redis connection closed');
    }

    // Close MongoDB
    if (dbConnection) {
      await dbclose();
      console.log('Database connection closed');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

// Server bootstrapping
const PORT = process.env.PORT || 5000;
async function initializeServer() {
  let dbConnection = null;
  try {
    dbConnection = await dbconnect();
    console.log('Database connection established');

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    const shutdown = () => gracefulShutdown(server, dbConnection);
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      shutdown();
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
      shutdown();
    });

    app.server = server;
    return server;

  } catch (error) {
    console.error('Server initialization failed:', error);
    process.exit(1);
  }
}

initializeServer();

export default app;
