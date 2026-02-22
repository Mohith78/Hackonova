import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://aayezfpwrvtxnxeywtjn.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFheWV6ZnB3cnZ0eG54ZXl3dGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjI1ODgsImV4cCI6MjA4Njk5ODU4OH0.L5YhEAo7pnK981zWb0cXbyKPgAZJ_iEItgZ9LlTjj9o"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

