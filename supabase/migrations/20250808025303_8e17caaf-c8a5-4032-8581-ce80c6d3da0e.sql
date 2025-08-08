-- Fix security warnings by setting proper search_path for functions
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE user_id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin';
END;
$$;