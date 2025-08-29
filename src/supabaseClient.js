// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

// --- THIS IS THE CRITICAL FIX ---
// Read the variables from process.env, which are now guaranteed to exist by vite.config.js
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)