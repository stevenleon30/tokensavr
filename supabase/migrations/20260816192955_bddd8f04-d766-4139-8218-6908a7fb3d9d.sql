CREATE OR REPLACE FUNCTION public.schedule_pricing_sync(secret text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
DECLARE
  cmd text;
BEGIN
  PERFORM cron.unschedule('sync-model-pricing-daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-model-pricing-daily');

  cmd := format($fmt$select extensions.http_post(
      url:='https://project--e46ad49f-3dfe-41d2-908d-cdf603646bea.lovable.app/api/public/sync-model-pricing',
      headers:=%L::jsonb,
      body:='{}'::jsonb,
      timeout_milliseconds:=120000
  ) as request_id;$fmt$,
    jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret)::text);

  PERFORM cron.schedule('sync-model-pricing-daily', '0 6 * * *', cmd);
  RETURN 'scheduled';
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_pricing_sync(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.schedule_pricing_sync(text) FROM anon;
REVOKE ALL ON FUNCTION public.schedule_pricing_sync(text) FROM authenticated;
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.schedule_pricing_sync(text) TO sandbox_exec';
  END IF;
END
$do$;