import express from "express";
import { checkLogin } from "../middlewares/auth.middleware";
import {
  getProjects,
  createProject,
  deleteProject,
  buildProject,
  getProjectBuilds,
} from "../controllers/project";

export const projectRouter = express.Router();

projectRouter.get("/", checkLogin, getProjects);
projectRouter.post("/create", checkLogin, createProject);
projectRouter.delete("/:projectId", checkLogin, deleteProject);

// build routes
projectRouter.post("/:projectId/build", checkLogin, buildProject);
projectRouter.get("/:projectId/builds", checkLogin, getProjectBuilds);
