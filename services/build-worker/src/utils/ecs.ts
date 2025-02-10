import prisma from "database";
import { config } from "../config/config";
import { DescribeTasksCommand, ECSClient } from "@aws-sdk/client-ecs";

export const ecs = new ECSClient({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

export async function waitForTaskCompletion(taskArn: string, buildId: string) {
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 sec

    const { tasks } = await ecs.send(
      new DescribeTasksCommand({
        cluster: config.AWS_ECS_CLUSTER,
        tasks: [taskArn],
      })
    );

    if (!tasks || tasks.length === 0) {
      console.error("ECS Task not found, assuming failure.");
      break;
    }

    const { lastStatus, desiredStatus, stopCode } = tasks[0];

    console.log(`ECS Task ${taskArn} - Status: ${lastStatus}`);

    if (lastStatus === "STOPPED") {
      if (stopCode && stopCode !== "EssentialContainerExited") {
        console.error(`Task ${taskArn} stopped unexpectedly: ${stopCode}`);
      }

      const exitCode = tasks[0]?.containers?.[0]?.exitCode;

      if (exitCode === 0) {
        console.log(`Build ${buildId} completed successfully.`);
        await prisma.build.update({
          where: { id: buildId },
          data: { status: "SUCCESS", completedAt: new Date() },
        });
      } else {
        console.error(`Build ${buildId} failed with exit code: ${exitCode}`);
        await prisma.build.update({
          where: { id: buildId },
          data: { status: "FAILED", completedAt: new Date() },
        });
      }
      return;
    }

    attempts++;
  }

  console.error(`ECS Task ${taskArn} timed out after ${maxAttempts * 10} sec.`);
  await prisma.build.update({
    where: { id: buildId },
    data: { status: "FAILED", completedAt: new Date() },
  });
}
