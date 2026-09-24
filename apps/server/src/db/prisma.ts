import { PrismaClient } from "@prisma/client";

// Single shared instance across the whole server process
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
});
