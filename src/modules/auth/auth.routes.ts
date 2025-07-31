import express from 'express';
import { register } from './auth.controller';
import { login } from './auth.controller';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

export default router;
