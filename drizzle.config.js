import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

export default {
    dialect: "postgresql",
    schema: "./utils/db/schema.ts",
    out: "./drizzle",
    dbCredentials: {
      url: process.env.DATABASE_URL,
    },
  };