import env from "dotenv";
import Redis from "ioredis";
import prisma from "database";
import { config } from "./config/config";
import { Queue, Worker, Job } from "bullmq";
import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { ecs, waitForTaskCompletion } from "./utils/ecs";

env.config();

const connection = new Redis({
  host: "localhost",
  port: 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

connection.on("connect", () => {
  console.log("Connected to Redis");
});

connection.on("error", (error) => {
  console.error("Redis connection error:", error);
});

const queue = new Queue("build-queue", {
  connection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});

const worker = new Worker(
  "build-queue",
  async (job: Job) => {
    console.log(`Processing job ${job.id} with data:`, job.data);

    let buildId: string;
    try {
      const build = await prisma.build.findFirst({
        where: {
          projectId: job.data.projectId,
          status: "QUEUED",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!build) {
        throw new Error(
          `No QUEUED build found for project ${job.data.projectId}`
        );
      }

      buildId = build.id;

      await prisma.build.update({
        where: { id: buildId },
        data: {
          status: "BUILDING",
          updatedAt: new Date(),
        },
      });

      console.log(
        `Build ${buildId} updated to BUILDING for project ${job.data.projectName}`
      );
    } catch (error) {
      console.error("Failed to update build record to BUILDING:", error);
      throw error;
    }

    const command = new RunTaskCommand({
      cluster: config.AWS_ECS_CLUSTER,
      taskDefinition: config.AWS_ECS_TASKDEFINITION,
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
      const response = await ecs.send(command);
      const taskArn = response.tasks?.[0]?.taskArn;

      if (!taskArn) {
        throw new Error("Failed to retrieve ECS Task ARN");
      }

      await waitForTaskCompletion(taskArn, buildId);
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
