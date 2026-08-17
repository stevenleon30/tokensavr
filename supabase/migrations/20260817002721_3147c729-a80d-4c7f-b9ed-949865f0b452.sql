CREATE TABLE public.strategy_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  view_count integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  payload jsonb NOT NULL
);

GRANT SELECT ON public.strategy_shares TO anon, authenticated;
GRANT ALL ON public.strategy_shares TO service_role;

ALTER TABLE public.strategy_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared strategies"
ON public.strategy_shares FOR SELECT
TO anon, authenticated
USING (true);