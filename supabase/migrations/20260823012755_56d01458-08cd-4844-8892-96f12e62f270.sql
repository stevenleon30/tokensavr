CREATE TABLE public.pricing_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  models_updated integer NOT NULL DEFAULT 0,
  models_checked integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pricing_sync_log_run_at ON public.pricing_sync_log (run_at DESC);

GRANT SELECT ON public.pricing_sync_log TO anon, authenticated;
GRANT ALL ON public.pricing_sync_log TO service_role;

ALTER TABLE public.pricing_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to sync log"
ON public.pricing_sync_log FOR SELECT
TO anon, authenticated
USING (true);

SELECT cron.unschedule('sync-model-pricing-daily');

SELECT cron.schedule(
  'sync-model-pricing-6h',
  '0 */6 * * *',
  $$
  select net.http_post(
    url:='https://project--e46ad49f-3dfe-41d2-908d-cdf603646bea.lovable.app/api/public/sync-model-pricing',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer 0IFweth2qBUJsTlqpC0FnCymleaMGAAWub3nlWqAHNp9qi3O"}'::jsonb,
    body:='{}'::jsonb,
    timeout_milliseconds:=120000
  ) as request_id;
  $$
);