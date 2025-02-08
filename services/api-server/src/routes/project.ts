import express from "express";
import { checkLogin } from "../middlewares/auth.middleware";
import {
  getProjects,
  createProject,
  deleteProject,
  buildProject,
} from "../controllers/project";

export const projectRouter = express.Router();

projectRouter.get("/", checkLogin, getProjects);
projectRouter.post("/create", checkLogin, createProject);
projectRouter.delete("/:projectId", checkLogin, deleteProject);

// build routes
projectRouter.post("/:projectId/build", checkLogin, buildProject);
