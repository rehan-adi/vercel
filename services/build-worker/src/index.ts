import env from "dotenv";
import Redis from "ioredis";
import prisma from "database";
import { Queue, Worker, Job } from "bullmq";
import { RunTaskCommand, ECSClient } from "@aws-sdk/client-ecs";

env.config();

const connection = new Redis({
  host: "localhost",
  port: 6379,
});

const queue = new Queue("build-queue", {
  connection,
});

const ecs = new ECSClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const worker = new Worker(
  "build-queue",
  async (job: Job) => {
    console.log(`Processing job ${job.id} with data:`, job.data);

    let buildId: string;
    try {
      const build = await prisma.build.create({
        data: {
          projectId: job.data.projectId,
          status: "BUILDING",
          startedAt: new Date(),
        },
      });
      buildId = build.id;
      console.log(
        `Build ${buildId} created for project ${job.data.projectName}`
      );
    } catch (error) {
      console.error("Failed to create build record:", error);
      throw error;
    }

    const command = new RunTaskCommand({
      cluster: process.env.AWS_ECS_CLUSTER,
      taskDefinition: process.env.AWS_ECS_TASKDEFINITION,
      launchType: "FARGATE",
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",
          subnets: [
            "subnet-0951a6540a35772cf",
            "subnet-0cb82b0688c3b712f",
            "subnet-0edde8e98c6cb867b",
          ],
          securityGroups: ["sg-07026ab69bc60e6da"],
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: "build-image",
            environment: [
              { name: "REPOSITORY_URL", value: job.data.repositoryUrl },
              { name: "PROJECT_NAME", value: job.data.projectName },
            ],
          },
        ],
      },
    });

    try {
      await ecs.send(command);
    } catch (error) {
      console.error(error);

      await prisma.build.update({
        where: { id: buildId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
        },
      });
      throw error;
    }
  },
  {
    connection: {
      host: "localhost",
      port: 6379,
    },
  }
);

worker.on("completed", async (job) => {
  const { projectId } = job.data;

  console.log(`Job completed for project: ${projectId}`);

  const build = await prisma.build.findFirst({
    where: {
      projectId,
      status: "BUILDING",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!build) {
    console.error(`No building build found for project: ${projectId}`);
    return;
  }

  await prisma.build.update({
    where: { id: build.id },
    data: {
      status: "SUCCESS",
      completedAt: new Date(),
    },
  });
  console.log(`Build ${build.id} for project ${projectId} marked as SUCCESS.`);
});

worker.on("failed", async (job, error) => {
  const { projectId } = job?.data;

  console.error(`Job failed for project: ${projectId}`, error);

  const build = await prisma.build.findFirst({
    where: {
      projectId,
      status: "BUILDING",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!build) {
    console.error(`No building build found for project: ${projectId}`);
    return;
  }

  await prisma.build.update({
    where: { id: build.id },
    data: {
      status: "FAILED",
      completedAt: new Date(),
    },
  });
  console.log(`Build ${build.id} for project ${projectId} marked as FAILED.`);
});
