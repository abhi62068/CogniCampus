import { createClient } from "@supabase/supabase-js";

// Centralized Supabase client to avoid multiple GoTrueClient instances in the browser.
const supabaseUrl = "https://esojecwsoumsezwrplcl.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzb2plY3dzb3Vtc2V6d3JwbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDk1MjQsImV4cCI6MjA4OTU4NTUyNH0.6ToR4xAjWtxSSAhnt5zkBEz6bXAq8InKVGCferp_HAk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;

