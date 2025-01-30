import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
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

function init() {
    console.log("🚀 Build container service is running...");

    const outDirPath = path.resolve(outDir);

    if (!fs.existsSync(outDirPath)) {
        console.error("❌ Error: Output directory does not exist. Cloning may have failed.");
        process.exit(1);
    }

    const p = exec(`cd ${outDirPath} && pnpm install && pnpm run build`);

    p.stdout.on("data", (data) => console.log(data));
    p.stderr.on("error", (err) => console.error(err));

    p.on("exit", async (code) => {
        console.log(`✅ Build completed with exit code ${code}`);

        const distFolderPath = path.join(outDir, "dist");
        if (!fs.existsSync(distFolderPath)) {
            console.error("❌ Error: dist folder does not exist. Nothing to upload.");
            process.exit(1);
        }

        const files = getAllFiles(distFolderPath);
        console.log(`📂 Found ${files.length} files to upload.`);

        await uploadToS3(files, distFolderPath, projectName);

        console.log("🚀 All files uploaded successfully!");
    });
}

init();