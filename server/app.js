import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import { verifyJWT } from './middleware/verifyJWT.js';

const app = express();

// Middleware
app.use(express.json()); // parse JSON request bodies
app.use(cookieParser()); // required to read req.cookies.token

// Allow credentials (cookies) from your Vite frontend
app.use(
  cors({
    origin: 'http://localhost:5173', // your Vite dev server URL
    credentials: true,
  })
);

// Routes
app.use('/api/auth', authRoutes);

// Simple health check route (optional but useful for testing server is up)
app.get('/', (req, res) => {
  res.send('Roster Management System API is running');
});

export default app;