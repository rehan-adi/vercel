import Redis from "ioredis";
import { Queue } from "bullmq";

const connection = new Redis({
  host: "localhost",
  port: 6379,
});

const buildQueue = new Queue("build-queue", {
  connection,
});

export const addToBuildQueue = async (
  projectId: string,
  projectName: string,
  repositoryUrl: string
): Promise<void> => {
  try {
    await buildQueue.add("build-queue", {
      projectId,
      projectName,
      repositoryUrl,
    });

    console.log(
      `Job added to the queue: ${projectId}, ${projectName}, ${repositoryUrl}`
    );
  } catch (error) {
    console.error("Error adding job to the queue:", error);
    throw error;
  }
};
