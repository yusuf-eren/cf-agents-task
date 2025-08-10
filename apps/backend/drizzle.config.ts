import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .dev.vars
dotenv.config({
  path: path.join(process.cwd(), ".dev.vars"),
});

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://localhost:5432/agents",
  },
});
