-- Update the profiles table to properly store student_id from signup
UPDATE public.profiles 
SET student_id = (auth.users.raw_user_meta_data ->> 'student_id')
FROM auth.users 
WHERE public.profiles.user_id = auth.users.id 
AND public.profiles.student_id IS NULL 
AND auth.users.raw_user_meta_data ->> 'student_id' IS NOT NULL;

-- Update the trigger function to properly handle student_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role, student_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    CASE 
      WHEN NEW.email LIKE '%@admin.%' THEN 'admin'::user_role
      ELSE 'student'::user_role
    END,
    NEW.raw_user_meta_data->>'student_id'
  );
  RETURN NEW;
END;
$function$;