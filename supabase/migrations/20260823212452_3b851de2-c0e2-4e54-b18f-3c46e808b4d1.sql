DROP POLICY IF EXISTS "Public read access" ON public.model_pricing;
DROP POLICY IF EXISTS "Anyone can view shared strategies" ON public.strategy_shares;

REVOKE SELECT ON public.model_pricing FROM anon, authenticated;
REVOKE SELECT ON public.strategy_shares FROM anon, authenticated;
REVOKE ALL ON public.model_pricing_per_million FROM anon, authenticated;

GRANT ALL ON public.model_pricing TO service_role;
GRANT ALL ON public.strategy_shares TO service_role;
GRANT ALL ON public.model_pricing_per_million TO service_role;