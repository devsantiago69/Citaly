import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Nota: Este archivo se mantiene para compatibilidad con código existente
// pero la funcionalidad principal ahora usa MySQL a través de api-client.ts
// Se usan valores placeholder para evitar errores de inicialización
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper para migración
export const isSupabaseConfigured = () => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co'
  );
};

export default supabase;
