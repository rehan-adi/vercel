import fs from "fs";
import path from "path";
import { Kafka } from "kafkajs";
import { config } from "../config/config";

const kafka = new Kafka({
  clientId: "build-queue",
  brokers: [config.KAFKA_BROKER],
  sasl: {
    mechanism: "plain",
    username: config.KAFKA_USERNAME,
    password: config.KAFKA_PASSWORD,
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
  groupId: "build-logs-consumer-group-1",
});
