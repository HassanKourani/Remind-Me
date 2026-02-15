-- Reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'time' CHECK (type IN ('time', 'location')),
  title TEXT NOT NULL,
  notes TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT NOT NULL DEFAULT 'personal' CHECK (category IN ('personal', 'work', 'health', 'shopping', 'finance', 'travel', 'education', 'other')),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- Time-based fields
  date_time TIMESTAMPTZ,
  repeat_type TEXT NOT NULL DEFAULT 'none' CHECK (repeat_type IN ('none', 'daily', 'weekly', 'monthly', 'custom')),
  repeat_interval INTEGER,
  repeat_unit TEXT CHECK (repeat_unit IN ('days', 'weeks')),
  repeat_days JSONB,

  -- Location-based fields
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_address TEXT,
  location_radius DOUBLE PRECISION,
  location_trigger TEXT CHECK (location_trigger IN ('enter', 'leave', 'both')),
  location_notify TEXT CHECK (location_notify IN ('once', 'every_time')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_owner_id ON public.reminders(owner_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date_time ON public.reminders(date_time);
CREATE INDEX IF NOT EXISTS idx_reminders_updated_at ON public.reminders(updated_at);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Row Level Security
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own reminders"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own reminders"
  ON public.reminders FOR DELETE
  USING (auth.uid() = owner_id);
