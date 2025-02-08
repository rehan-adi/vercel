import prisma from "database";
import { Request, Response } from "express";
import { ProjectValidation } from "../validations/project";

export const createProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "You are not authenticated. Please Signin",
      });
      return;
    }

    const parsedData = ProjectValidation.parse(req.body);
    const { name, github_url } = parsedData;

    const project = await prisma.project.create({
      data: {
        name,
        github_url,
        userId,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        projectId: project.id,
        name: project.name,
        github_url: project.github_url,
      },
      message: "Project created successfully.",
    });
  } catch (error: unknown) {
    console.error("Error while creating project:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
    return;
  }
};

export const getProjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "You are not authenticated. Please Signin",
      });
      return;
    }

    const projects = await prisma.project.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        name: true,
        github_url: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      data: projects,
      message: "Projects retrieved successfully.",
    });
  } catch (error: unknown) {
    console.error("Error while getting projects:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
    return;
  }
};
