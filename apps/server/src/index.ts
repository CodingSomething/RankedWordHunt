import { createServer } from "http";
import express from "express";
import cors, { type CorsOptions } from "cors";
import { Server } from "socket.io";
import { env } from "./config";
import { prisma } from "./db/prisma";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";
import { leaderboardRouter } from "./routes/leaderboard";
import { registerSocketHandlers } from "./socket/handlers";
import { getWordListInfo, loadWordList } from "./game/engine";

const app = express();
const http = createServer(app);
const allowedOrigins = new Set(env.CLIENT_URLS);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Requests without Origin include server-to-server calls and Railway health checks.
    if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

if (env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(cors(corsOptions));
app.use(express.json({ limit: "32kb" }));

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/leaderboard", leaderboardRouter);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: "connected", dictionary: getWordListInfo() });
  } catch (error) {
    console.error("[health] database check failed", error);
    res.status(503).json({ ok: false, database: "unavailable" });
  }
});

const io = new Server(http, {
  cors: { origin: env.CLIENT_URLS, methods: ["GET", "POST"] },
});
registerSocketHandlers(io);

async function main(): Promise<void> {
  await prisma.$connect();
  const dictionary = loadWordList();
  http.listen(env.PORT, () => {
    console.log(`wordhunt server listening on port ${env.PORT}`);
    console.log(`allowed client origins: ${env.CLIENT_URLS.join(", ")}`);
    console.log(`dictionary: ${dictionary.source} (${dictionary.count.toLocaleString()} words)`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal}: shutting down`);
  io.close();
  http.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
