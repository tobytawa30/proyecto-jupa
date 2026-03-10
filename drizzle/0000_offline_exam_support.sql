DO $$ BEGIN
 CREATE TYPE "session_source" AS ENUM('ONLINE', 'OFFLINE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "student_sessions"
ADD COLUMN IF NOT EXISTS "offline_attempt_id" text,
ADD COLUMN IF NOT EXISTS "source" "session_source" DEFAULT 'ONLINE' NOT NULL,
ADD COLUMN IF NOT EXISTS "synced_at" timestamp,
ADD COLUMN IF NOT EXISTS "device_id" text,
ADD COLUMN IF NOT EXISTS "exam_snapshot_version" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "student_sessions_offline_attempt_id_idx"
ON "student_sessions" ("offline_attempt_id");

CREATE UNIQUE INDEX IF NOT EXISTS "exam_answers_session_question_idx"
ON "exam_answers" ("session_id", "question_id");
