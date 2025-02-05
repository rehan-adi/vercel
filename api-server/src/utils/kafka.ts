import fs from "fs";
import path from "path";
import env from "dotenv";
import { Kafka } from "kafkajs";

env.config();

const kafka = new Kafka({
  clientId: "build-queue",
  brokers: [process.env.KAFKA_BROKER!],
  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_USERNAME!,
    password: process.env.KAFKA_PASSWORD!,
  },
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync(path.join(process.cwd(), "ca.pem"), "utf-8"),
  },
  retry: {
    initialRetryTime: 100,
    maxRetryTime: 30000,
    retries: 10,
    factor: 0.5,
  },
});

export const consumer = kafka.consumer({
  groupId: "build-logs-consumer-group",
});
