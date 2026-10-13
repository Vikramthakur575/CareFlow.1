import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './server/routes/auth.routes.ts';
import doctorRoutes from './server/routes/doctor.routes.ts';
import appointmentRoutes from './server/routes/appointment.routes.ts';
import adminRoutes from './server/routes/admin.routes.ts';
import { errorHandler } from './server/middleware/errorHandler.ts';
import { initDatabase } from './server/database/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Core Express Middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Initialize and Seed PostgreSQL database schema
  try {
    await initDatabase();
  } catch (dbErr) {
    console.error('[CareFlow] Database bootstrap failed:', dbErr);
  }

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'CareFlow Clinical API',
      timestamp: new Date().toISOString(),
      engine: 'PostgreSQL (Embedded ACID Engine)',
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/admin', adminRoutes);

  // Centralized Error Handling Middleware for API routes
  app.use('/api', errorHandler);

  // Mount Vite middleware in development or static assets in production
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CareFlow Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[CareFlow Fatal Startup Error]', err);
  process.exit(1);
});
