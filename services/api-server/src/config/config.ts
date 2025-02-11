import env from "dotenv";

env.config();

interface Config {
  PORT: string;
  JWT_SECRET: string;
  KAFKA_BROKER: string;
  KAFKA_USERNAME: string;
  KAFKA_PASSWORD: string;
}

export const config: Config = {
  PORT: process.env.PORT as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  KAFKA_BROKER: process.env.KAFKA_BROKER as string,
  KAFKA_USERNAME: process.env.KAFKA_USERNAME as string,
  KAFKA_PASSWORD: process.env.KAFKA_PASSWORD as string,
};
