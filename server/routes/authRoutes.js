import express from 'express';
import { login, logout, register } from '../controllers/auth.controller.js';
import { verifyJWT } from '../middleware/verifyJWT.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);           // public
router.post('/logout', verifyJWT, logout); // must be logged in to log out

export default router;