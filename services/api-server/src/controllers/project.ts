import prisma from "database";
import { Request, Response } from "express";
import { addToBuildQueue } from "../utils/queue";
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

export const deleteProject = async (
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

    const projectId = req.params.projectId;

    if (!projectId) {
      res
        .status(400)
        .json({ success: false, message: "Project Id is missing" });
      return;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found or you do not have access to it",
      });
      return;
    }

    await prisma.project.delete({
      where: {
        id: projectId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Project deleted successfully.",
    });
  } catch (error: unknown) {
    console.error("Error while deleting project:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const buildProject = async (
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

    const projectId = req.params.projectId;

    if (!projectId) {
      res
        .status(400)
        .json({ success: false, message: "Project Id is missing" });
      return;
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found or you do not have access to it",
      });
      return;
    }

    await addToBuildQueue(project.id, project.name, project.github_url);

    const build = await prisma.build.create({
      data: {
        projectId: project.id,
        status: "QUEUED",
        startedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        id: build.id,
        status: build.status,
        projectId: build.projectId,
        startedAt: build.startedAt,
      },
      message: "Build triggered successfully",
    });
  } catch (error: unknown) {
    console.error("Error while triggering build:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProjectBuilds = async (
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

    const projectId = req.params.projectId;

    if (!projectId) {
      res
        .status(400)
        .json({ success: false, message: "Project Id is missing" });
      return;
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      res.status(404).json({
        success: false,
        message: "Project not found or access denied.",
      });
      return;
    }

    const builds = await prisma.build.findMany({
      where: {
        projectId,
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      builds,
    });
  } catch (error: unknown) {
    console.error("Error fetching project builds:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getBuildStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { projectId, buildId } = req.params;

  if (!projectId || !buildId) {
    res.status(400).json({
      success: false,
      message: "Both projectId and buildId are required.",
    });
    return;
  }

  try {
    // Fetch build status from the database
    const build = await prisma.build.findUnique({
      where: {
        id: buildId,
      },
    });

    if (!build || build.projectId !== projectId) {
      res.status(404).json({
        message: "Build not found for the specified project.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        status: build.status,
        startedAt: build.startedAt,
        completedAt: build.completedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching build status:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
