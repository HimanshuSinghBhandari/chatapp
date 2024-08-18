import { neon } from '@neondatabase/serverless';
import dotenv from "dotenv"
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./schema"
dotenv.config();
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql,{schema});

// Function to check database connection
export async function checkDatabaseConnection() {
    try {
      // Perform a simple query to check the connection
      await sql`SELECT 1`;
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Error connecting to the database:', error);
      throw error; // Re-throw the error so the server can handle it
    }
  }