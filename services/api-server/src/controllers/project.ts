import prisma from "database";
import { Request, Response } from "express";
import { ProjectValidation } from "../validations/project";

export const createProject = async (req: Request, res: Response) => {
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

    const Project = await prisma.project.create({
      data: {
        name,
        github_url,
        userId,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        projectId: Project.id,
        name: Project.name,
        github_url: Project.github_url,
      },
      message: "Project Created",
    });
  } catch (error: unknown) {
    console.log("Error while create project", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: error });
  }
};
