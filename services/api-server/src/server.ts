import http from "http";
import cors from "cors";
import env from "dotenv";
import morgan from "morgan";
import helmet from "helmet";
import express from "express";
import { WebSocketServer } from "ws";
import { consumer } from "./utils/kafka";
import { authRouter } from "./routes/auth";

env.config();

const server = express();
const httpServer = http.createServer(server);

// Middleware
server.use(express.json());
server.use(cors());
server.use(helmet());
server.use(morgan("dev"));

// Routes
server.use("/api/v1/auth", authRouter);

// health check endpoint
server.get("/", (req, res) => {
  res.status(200).json("OK");
});

const wss = new WebSocketServer({ server: httpServer });
const clients = new Map();

wss.on("connection", (ws) => {
  console.log("🔗 WebSocket client connected");

  ws.on("message", (message: string) => {
    try {
      const { action, projectName } = JSON.parse(message);

      if (action === "subscribe") {
        if (!clients.has(projectName)) {
          clients.set(projectName, new Set());
        }
        clients.get(projectName).add(ws);
        console.log(`✅ Client subscribed to project: ${projectName}`);
      }
    } catch (err) {
      console.error("❌ Invalid WebSocket message format", err);
    }
  });

  ws.on("close", () => {
    console.log("❌ WebSocket client disconnected");
    clients.forEach((clientSet) => clientSet.delete(ws));
  });
});

async function startKafkaConsumer() {
  await consumer.connect();
  await consumer.subscribe({ topic: "build-logs", fromBeginning: false });

  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const logData = JSON.parse(message.value?.toString() || "{}");
      console.log("📥 Received log:", logData);

      const projectClients = clients.get(logData.projectName);
      if (projectClients) {
        projectClients.forEach((ws: any) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(logData));
          }
        });
      }
    },
  });
}

startKafkaConsumer().catch(console.error);

httpServer.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
