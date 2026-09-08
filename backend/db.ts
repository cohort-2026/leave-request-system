import "./load-env.js";
import pg from "pg";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL is missing. Copy backend/.env.example to backend/.env and fill it in.",
  );
}

export const pool = new pg.Pool({ connectionString: url });
