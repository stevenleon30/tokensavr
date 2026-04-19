-- Track real per-step completion and actual credit/token spend per strategy
CREATE TABLE public.step_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  actual_cost_credits NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (strategy_id, step_number)
);

CREATE INDEX idx_step_progress_strategy ON public.step_progress(strategy_id);
CREATE INDEX idx_step_progress_user ON public.step_progress(user_id);

ALTER TABLE public.step_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own step progress"
  ON public.step_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own step progress"
  ON public.step_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own step progress"
  ON public.step_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own step progress"
  ON public.step_progress FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_step_progress_updated_at
  BEFORE UPDATE ON public.step_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();