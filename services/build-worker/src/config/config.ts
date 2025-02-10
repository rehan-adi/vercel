import env from "dotenv";

env.config();

interface Config {
  AWS_REGION: string;
  AWS_ECS_CLUSTER: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_ECS_TASKDEFINITION: string;
}

export const config: Config = {
  AWS_REGION: process.env.AWS_REGION as string,
  AWS_ECS_CLUSTER: process.env.AWS_ECS_CLUSTER as string,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID as string,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY as string,
  AWS_ECS_TASKDEFINITION: process.env.AWS_ECS_TASKDEFINITION as string,
};
