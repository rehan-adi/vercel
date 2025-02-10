import fs from "fs";
import path from "path";
import env from "dotenv";
import { Kafka } from "kafkajs";
import { dbConnect } from "./db/connection";
import { LogModel } from "./models/log.model";

env.config();

dbConnect();

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
    ca: fs.readFileSync(path.join(__dirname, "..", "ca.pem"), "utf-8"),
  },
  retry: {
    initialRetryTime: 100,
    maxRetryTime: 30000,
    retries: 10,
    factor: 0.5,
  },
});

const consumer = kafka.consumer({
  groupId: "build-logs-consumer-group-2",
});

const logs: any[] = [];

const BATCH_SIZE = 10;
const BATCH_TIME_MS = 5000;

async function flushLogs() {
  if (logs.length > 0) {
    try {
      await LogModel.insertMany(logs);
      logs.length = 0;
    } catch (error) {
      console.error("Error inserting logs:", error);
    }
  }
}

setInterval(flushLogs, BATCH_TIME_MS);

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: "build-logs", fromBeginning: true });

  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      let logData;

      try {
        logData = JSON.parse(message.value?.toString() || "{}");
      } catch (error) {
        console.error("Invalid JSON log:", message.value?.toString());
        return;
      }

      logs.push({
        logs: logData.log || logData,
        projectName: logData.projectName || "unknown",
        createdAt: new Date(),
      });

      if (logs.length >= BATCH_SIZE) {
        await flushLogs();
      }

      console.log(logData.log || logData);
    },
  });

  console.log("Listening for messages on the 'build-logs' topic...");
}

start().catch(console.error);
