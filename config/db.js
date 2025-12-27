import pkg from "pg";
import { DATABASE_CONFIG } from "./config.js";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: DATABASE_CONFIG.connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;
