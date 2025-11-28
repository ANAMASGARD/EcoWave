import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Prevent accidental client-side import
if (typeof window !== "undefined") {
  throw new Error(
    "Do not import utils/db/dbConfig.jsx from client-side code. Use a server action or API route instead."
  );
}

// Load local .env in development so process.env.DATABASE_URL is available
if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local or your environment variables."
  );
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema }); 