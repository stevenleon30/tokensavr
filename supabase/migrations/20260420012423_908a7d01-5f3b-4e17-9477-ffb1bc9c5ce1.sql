ALTER TABLE public.strategies
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_strategies_is_public ON public.strategies (is_public) WHERE is_public = true;

CREATE POLICY "Public strategies are viewable by anyone"
ON public.strategies
FOR SELECT
TO anon, authenticated
USING (is_public = true);