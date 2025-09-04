import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-goog-channel-id, x-goog-channel-token, x-goog-resource-id, x-goog-resource-state, x-goog-resource-uri, x-goog-message-number',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Obtener headers de Google
    const channelId = req.headers.get('x-goog-channel-id')
    const resourceState = req.headers.get('x-goog-resource-state')
    const resourceId = req.headers.get('x-goog-resource-id')
    const resourceUri = req.headers.get('x-goog-resource-uri')

    console.log('Google Calendar webhook received:', {
      channelId,
      resourceState,
      resourceId,
      resourceUri
    })

    // Verificar que es una notificación válida
    if (!channelId || !resourceState) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook headers' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Procesar según el tipo de cambio
    switch (resourceState) {
      case 'sync':
        // Sincronización inicial - no hacer nada
        console.log('Initial sync notification received')
        break;
        
      case 'exists':
        // Cambios en el calendario - programar sincronización
        console.log('Calendar changes detected, scheduling sync')
        
        // Buscar el calendario correspondiente
        const { data: calendars } = await supabaseClient
          .from('google_calendars')
          .select('*')
          .eq('google_calendar_id', resourceId)
          .eq('sincronizacion_activa', true)

        // Programar sincronización para cada calendario afectado
        for (const calendar of calendars || []) {
          await supabaseClient
            .from('calendar_sync_logs')
            .insert({
              google_calendar_id: calendar.id,
              tipo_operacion: 'import',
              estado: 'exitoso',
              tiempo_inicio: new Date().toISOString(),
              detalles: {
                trigger: 'webhook',
                resourceState,
                channelId
              }
            })

          // Aquí se podría disparar una función de sincronización asíncrona
          // Por ahora, solo registramos que se necesita sincronizar
          console.log(`Sync scheduled for calendar: ${calendar.nombre}`)
        }
        break;
        
      default:
        console.log('Unknown resource state:', resourceState)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    
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