import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dyxdtlbqurnovrymopch.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eGR0bGJxdXJub3ZyeW1vcGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzY4OTgsImV4cCI6MjEwMzE1Mjg5OH0.YyfoQ6b5DUlqQS7-AN-p-zH3GLK00zvtEIBcoMhAYPA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
