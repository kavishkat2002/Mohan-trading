-- Tasks table
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, -- Linked to vehicle inventory
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_tasks_business_id ON public.tasks(business_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE
UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view tasks in their business" ON public.tasks FOR
SELECT TO authenticated USING (business_id = public.current_user_business_id());

CREATE POLICY "Admins+ can insert tasks" ON public.tasks FOR
INSERT TO authenticated WITH CHECK (
    business_id = public.current_user_business_id()
    AND public.is_business_admin(auth.uid())
);

CREATE POLICY "Admins+ can update any task in business" ON public.tasks FOR
UPDATE TO authenticated USING (
    business_id = public.current_user_business_id()
    AND public.is_business_admin(auth.uid())
);

CREATE POLICY "Users can update their assigned tasks status" ON public.tasks FOR
UPDATE TO authenticated USING (
    assigned_to = (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
    -- Only allow updating status if not admin
    (SELECT count(*) FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'admin')) > 0
    OR 
    (status IN ('pending', 'in_progress', 'completed'))
);

CREATE POLICY "Owners can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (
  business_id = public.current_user_business_id()
  AND public.has_role(auth.uid(), 'owner')
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
