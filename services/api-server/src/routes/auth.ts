import express from 'express';
import { signup, signin } from '../controllers/auth';

export const authRouter = express.Router();

authRouter.post('/signup', signup);
authRouter.post('/signin', signin);