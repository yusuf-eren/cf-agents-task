import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

const createDrizzle = (conn: Sql) => drizzle(conn, { schema });

export type DB = ReturnType<typeof createDrizzle>;

/**
 * Database manager that maintains a single connection per Durable Object instance
 * This avoids I/O sharing violations while preventing connection overhead
 */
export class DatabaseManager {
  private db: DB | null = null;
  private conn: Sql | null = null;
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  /**
   * Get database instance - creates connection on first call, reuses afterwards
   */
  getDb(): { db: DB; conn: Sql } {
    if (!this.db || !this.conn) {
      this.conn = postgres(this.connectionString, {
        max: 1, // Single connection for this Durable Object
        idle_timeout: 0, // Never timeout idle connections
        connect_timeout: 10,
        max_lifetime: 0, // Never expire connections
      });
      this.db = createDrizzle(this.conn);
      console.log("DatabaseManager: New connection established");
    }
    return { db: this.db, conn: this.conn };
  }

  /**
   * Check if connection is established
   */
  isConnected(): boolean {
    return this.db !== null && this.conn !== null;
  }

  /**
   * Close connection (cleanup on Durable Object close)
   */
  async close(): Promise<void> {
    if (this.conn) {
      try {
        await this.conn.end();
        console.log("DatabaseManager: Connection closed");
      } catch (error) {
        console.warn("DatabaseManager: Error closing connection:", error);
      } finally {
        this.db = null;
        this.conn = null;
      }
    }
  }
}

// Legacy function for backward compatibility
export const createDb = (url: string) => {
  const conn = postgres(url);
  const db = createDrizzle(conn);
  return { db, conn };
};
