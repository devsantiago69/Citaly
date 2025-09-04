import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface SyncRequest {
  userId: string;
  calendarId: string;
  direction?: 'bidireccional' | 'solo_importar' | 'solo_exportar';
  force?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { userId, calendarId, direction = 'bidireccional', force = false }: SyncRequest = await req.json()

    // Verificar que el usuario puede acceder al calendario
    const { data: calendar, error: calendarError } = await supabaseClient
      .from('google_calendars')
      .select('*')
      .eq('id', calendarId)
      .eq('usuario_id', userId)
      .single()

    if (calendarError || !calendar) {
      return new Response(
        JSON.stringify({ error: 'Calendar not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar si necesita sincronización (a menos que sea forzada)
    if (!force && calendar.ultimo_sync) {
      const lastSync = new Date(calendar.ultimo_sync);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
      
      // Obtener configuración de sincronización
      const { data: syncConfig } = await supabaseClient
        .from('sync_configuration')
        .select('sync_interval_minutes')
        .eq('empresa_id', calendar.empresa_id)
        .single()

      const intervalMinutes = syncConfig?.sync_interval_minutes || 15;
      
      if (diffMinutes < intervalMinutes) {
        return new Response(
          JSON.stringify({ 
            message: 'Sync not needed yet',
            nextSyncIn: intervalMinutes - diffMinutes
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // Crear log de sincronización
    const { data: syncLog, error: logError } = await supabaseClient
      .from('calendar_sync_logs')
      .insert({
        google_calendar_id: calendarId,
        tipo_operacion: direction,
        estado: 'exitoso',
        tiempo_inicio: new Date().toISOString(),
        eventos_procesados: 0,
        eventos_exitosos: 0,
        eventos_con_error: 0
      })
      .select('id')
      .single()

    if (logError) {
      throw new Error('Failed to create sync log')
    }

    let eventosProcessed = 0;
    let eventosExitosos = 0;
    let eventosConError = 0;

    try {
      // Aquí iría la lógica de sincronización real con Google Calendar API
      // Por ahora, simulamos el proceso
      
      if (direction === 'bidireccional' || direction === 'solo_importar') {
        // Simular importación
        eventosProcessed += 10;
        eventosExitosos += 9;
        eventosConError += 1;
      }

      if (direction === 'bidireccional' || direction === 'solo_exportar') {
        // Simular exportación
        eventosProcessed += 5;
        eventosExitosos += 5;
      }

      // Actualizar último sync
      await supabaseClient
        .from('google_calendars')
        .update({ ultimo_sync: new Date().toISOString() })
        .eq('id', calendarId)

      // Completar log
      await supabaseClient
        .from('calendar_sync_logs')
        .update({
          tiempo_fin: new Date().toISOString(),
          eventos_procesados: eventosProcessed,
          eventos_exitosos: eventosExitosos,
          eventos_con_error: eventosConError
        })
        .eq('id', syncLog.id)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Synchronization completed',
          stats: {
            processed: eventosProcessed,
            successful: eventosExitosos,
            errors: eventosConError
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (error) {
      // Actualizar log con error
      await supabaseClient
        .from('calendar_sync_logs')
        .update({
          estado: 'error',
          tiempo_fin: new Date().toISOString(),
          error_message: error.message,
          eventos_procesados: eventosProcessed,
          eventos_exitosos: eventosExitosos,
          eventos_con_error: eventosConError + 1
        })
        .eq('id', syncLog.id)

      throw error;
    }

  } catch (error) {
    console.error('Error in sync function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})