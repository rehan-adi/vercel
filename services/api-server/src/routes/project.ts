import express from "express";
import { checkLogin } from "../middlewares/auth.middleware";
import { getProjects, createProject } from "../controllers/project";

export const projectRouter = express.Router();

projectRouter.get("/", checkLogin, getProjects);
projectRouter.post("/create", checkLogin, createProject);
