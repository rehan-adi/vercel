import express from 'express';
import { createProject } from '../controllers/project';

export const projectRouter = express.Router();

projectRouter.post('/create', createProject);