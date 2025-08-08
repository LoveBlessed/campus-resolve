-- Fix infinite recursion in RLS policies by creating security definer functions

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Students can view their own complaints" ON public.complaints;
DROP POLICY IF EXISTS "Admins can update any complaint" ON public.complaints;

-- Recreate policies using security definer functions
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_current_user_admin() OR auth.uid() = user_id);

CREATE POLICY "Students can view their own complaints" 
ON public.complaints 
FOR SELECT 
USING (student_id = auth.uid() OR public.is_current_user_admin());

CREATE POLICY "Admins can update any complaint" 
ON public.complaints 
FOR UPDATE 
USING (public.is_current_user_admin());