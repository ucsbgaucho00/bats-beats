// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// --- DEBUG LOGS ---
console.log('Supabase URL being used:', supabaseUrl)
console.log('Supabase Anon Key being used:', supabaseAnonKey)
// --- END DEBUG LOGS ---

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'bats_and_beats',
  },
})