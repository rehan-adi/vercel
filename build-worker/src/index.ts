import env from "dotenv";
import Redis from "ioredis";
import { Queue, Worker, Job } from "bullmq";
import { RunTaskCommand, ECSClient } from "@aws-sdk/client-ecs";

env.config();

const connection = new Redis({
  host: "localhost",
  port: 6379,
});

const queue = new Queue("build-queue", {
  connection: {
    host: "localhost",
    port: 6379,
  },
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
    }
  },
  {
    connection: {
      host: "localhost",
      port: 6379,
    },
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job} failed with error:`, err);
});
