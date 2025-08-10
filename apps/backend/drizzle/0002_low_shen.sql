ALTER TABLE "integration_connections" ADD COLUMN "session_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_connections" DROP COLUMN "user_id";