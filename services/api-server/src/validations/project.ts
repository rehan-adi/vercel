import { z } from "zod";

export const ProjectValidation = z.object({
  name: z
    .string()
    .min(2, "Project name must be at least 2 characters")
    .max(20, "Project name must be at most 20 characters"),
  github_url: z
    .string()
    .url("Invalid URL format")
    .refine(
      (url) => /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/.test(url),
      "Invalid GitHub repository URL"
    ),
});
