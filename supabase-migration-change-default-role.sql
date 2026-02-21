-- Change default user role from 'insurance' to 'lawyer'
-- This migration only changes the default value for NEW users
-- Existing users keep their current role and can switch freely via settings

alter table public.user_settings
  alter column user_role set default 'lawyer';
