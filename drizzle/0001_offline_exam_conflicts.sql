CREATE TABLE IF NOT EXISTS "offline_exam_conflicts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "offline_attempt_id" text NOT NULL,
  "session_id" uuid NOT NULL,
  "exam_id" uuid NOT NULL,
  "student_name" text NOT NULL,
  "school_id" uuid NOT NULL,
  "grade" integer NOT NULL,
  "device_id" text,
  "reason" text NOT NULL,
  "status" text DEFAULT 'pending_review' NOT NULL,
  "snapshot_version" timestamp,
  "current_version" timestamp,
  "answers_payload" jsonb NOT NULL,
  "exam_snapshot_payload" jsonb,
  "sync_payload" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "resolved_at" timestamp
);

DO $$ BEGIN
 ALTER TABLE "offline_exam_conflicts"
 ADD CONSTRAINT "offline_exam_conflicts_session_id_student_sessions_id_fk"
 FOREIGN KEY ("session_id") REFERENCES "public"."student_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "offline_exam_conflicts"
 ADD CONSTRAINT "offline_exam_conflicts_exam_id_exams_id_fk"
 FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "offline_exam_conflicts"
 ADD CONSTRAINT "offline_exam_conflicts_school_id_schools_id_fk"
 FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "offline_exam_conflicts_offline_attempt_id_idx"
ON "offline_exam_conflicts" ("offline_attempt_id");
