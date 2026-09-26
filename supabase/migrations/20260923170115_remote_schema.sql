CREATE TABLE "public"."focus_sessions" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"           uuid                     NOT NULL,
  "task_id"           uuid,
  "started_at"        timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "active_started_at" timestamp with time zone,
  "paused_at"         timestamp with time zone,
  "ended_at"          timestamp with time zone,
  "duration_seconds"  integer                  NOT NULL DEFAULT 0,
  "status"            text                     NOT NULL DEFAULT 'active'::text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT "focus_sessions_check1"
    CHECK ((((status = ANY (ARRAY['active'::text, 'paused'::text])) AND (ended_at IS NULL)) OR (status = ANY (ARRAY['completed'::text, 'abandoned'::text])))),
  CONSTRAINT "focus_sessions_check2" CHECK ((((status = 'active'::text) AND (active_started_at IS NOT NULL)) OR (status <> 'active'::text))),
  CONSTRAINT "focus_sessions_check" CHECK (((ended_at IS NULL) OR (ended_at >= started_at))),
  CONSTRAINT "focus_sessions_duration_seconds_check" CHECK ((duration_seconds >= 0)),
  CONSTRAINT "focus_sessions_pkey" PRIMARY KEY (id),
  CONSTRAINT "focus_sessions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text, 'abandoned'::text])))
);

ALTER TABLE "public"."focus_sessions"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."tasks"
  ADD COLUMN "estimated_minutes" integer;

ALTER TABLE "public"."focus_sessions"
  ADD CONSTRAINT "focus_sessions_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

ALTER TABLE "public"."focus_sessions"
  ADD CONSTRAINT "focus_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_estimated_minutes_check" CHECK (((estimated_minutes IS NULL) OR ((estimated_minutes >= 1) AND (estimated_minutes <= 1440))));

CREATE UNIQUE INDEX focus_sessions_one_open_per_user_idx ON public.focus_sessions USING btree (user_id)
  WHERE (status = ANY (ARRAY['active'::text, 'paused'::text]));

CREATE INDEX focus_sessions_user_created_at_idx ON public.focus_sessions USING btree (user_id, created_at DESC);

CREATE INDEX focus_sessions_user_task_idx ON public.focus_sessions USING btree (user_id, task_id);

CREATE TRIGGER focus_sessions_set_updated_at
  BEFORE UPDATE ON public.focus_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "focus sessions owner access" ON "public"."focus_sessions"
  FOR ALL
  TO "authenticated"
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."focus_sessions" TO "anon", "authenticated", "postgres", "service_role";

