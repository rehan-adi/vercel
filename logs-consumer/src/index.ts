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
  groupId: "build-logs-consumer-group",
});

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: "build-logs", fromBeginning: true });

  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const logMessage = message.value?.toString();
      console.log(logMessage);
    },
  });

  console.log("Listening for messages on the 'build-logs' topic...");
}

start().catch(console.error);
