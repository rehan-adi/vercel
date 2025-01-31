import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { Kafka, Partitioners } from "kafkajs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const kafka = new Kafka({
    clientId: "build-queue",
    brokers: ["kafka-786be73-rehan-adi.b.aivencloud.com:15796"],
    sasl: {
        mechanism: "plain",
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
    },
    ssl: {
        rejectUnauthorized: false,
        ca: fs.readFileSync("/home/app/ca.pem", "utf-8"),
    },
    retry: {
        initialRetryTime: 100,
        maxRetryTime: 30000,
        retries: 10,
        factor: 0.5,
    },
});

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const producer = kafka.producer({
    createPartitioner: Partitioners.DefaultPartitioner
});

const outDir = "/home/app/output";
const projectName = process.env.PROJECT_NAME;

function getAllFiles(dir) {
    const files = [];
    function traverse(currentPath) {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                traverse(fullPath);
            } else {
                files.push(fullPath);
            }
        }
    }
    traverse(dir);
    return files;
}

async function uploadToS3(files, distFolderPath, projectName) {
    for (const filePath of files) {
        const fileContent = fs.readFileSync(filePath);

        const s3Key = `${projectName}/${path.relative(distFolderPath, filePath).replace(/\\/g, "/")}`;

        const params = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: s3Key,
            Body: fileContent,
        };

        try {
            await s3Client.send(new PutObjectCommand(params));
            console.log("✅ Successfully uploaded:", s3Key);
        } catch (err) {
            console.error("❌ Upload error:", err);
        }
    }
}

let isProducerConnected = false;
async function setupProducer() {
    await producer.connect();
    isProducerConnected = true;
    console.log("🚀 Producer connected to Kafka.");
}

async function produceMessage(message) {
    if (!isProducerConnected) {
        await setupProducer();
        isProducerConnected = true;
    }

    try {
        await producer.send({
            topic: "build-logs",
            messages: [{ value: message.toString() }],
        });
    } catch (err) {
        console.error("❌ Kafka Producer Error:", err);
    }
}

function init() {
    console.log("🚀 Build container service is running...");

    const outDirPath = path.resolve(outDir);

    if (!fs.existsSync(outDirPath)) {
        console.error("❌ Error: Output directory does not exist. Cloning may have failed.");
        process.exit(1);
    }

    const p = exec(`cd ${outDirPath} && pnpm install && pnpm run build`);

    p.stdout.on("data", async (data) => {
        console.log(data);
        await produceMessage(data);
    });

    p.stderr.on("data", async (data) => {
        console.error(data.toString());
        await produceMessage(`[ERROR] ${data.toString()}`);
    });

    p.on("error", async (err) => {
        console.error("❌ Build process error:", err.toString());
        await produceMessage(`[ERROR] Build process error: ${err.toString()}`);
    });

    p.on("exit", async (code) => {
        console.log(`✅ Build completed with exit code ${code}`);
        await produceMessage(`[INFO] Build completed with exit code ${code}`);

        const distFolderPath = path.join(outDir, "dist");
        if (!fs.existsSync(distFolderPath)) {
            console.error("❌ Error: dist folder does not exist. Nothing to upload.");
            process.exit(1);
        }

        const files = getAllFiles(distFolderPath);
        console.log(`📂 Found ${files.length} files to upload.`);

        await uploadToS3(files, distFolderPath, projectName);

        console.log("🚀 All files uploaded successfully!");
        await produceMessage("Done");
        process.exit(0);
    });
}

init();

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("🛑 Shutting down...");
    try {
        await producer.disconnect();
        console.log("✅ Kafka Producer disconnected.");
    } catch (err) {
        console.error("❌ Error disconnecting Kafka Producer:", err);
    }
    process.exit(0);
});
