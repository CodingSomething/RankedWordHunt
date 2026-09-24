import "dotenv/config";
import { z } from "zod";

const RawEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_URL: z.string().optional(),
  CLIENT_URLS: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const raw = RawEnvSchema.parse(process.env);
const clientUrls = (raw.CLIENT_URLS ?? raw.CLIENT_URL ?? "http://localhost:3000")
  .split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

if (clientUrls.length === 0) {
  throw new Error("At least one client URL must be configured");
}

export const env = {
  ...raw,
  CLIENT_URLS: clientUrls,
};
