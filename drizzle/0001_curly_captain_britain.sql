ALTER TABLE "db_roles" ADD COLUMN "password_enc" text;--> statement-breakpoint
ALTER TABLE "instances" ADD COLUMN "pooler_session_port" integer DEFAULT 6433 NOT NULL;