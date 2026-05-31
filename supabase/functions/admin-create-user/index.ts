// Edge Function: admin-create-user
// Crea un usuario en Supabase Auth (passwordless / OTP). Solo un ADMIN puede
// invocarla. Requiere la service_role key, por eso vive en el servidor y NO en
// el cliente.
//
// Deploy:  supabase functions deploy admin-create-user
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY se
//          inyectan automáticamente en el entorno de la función.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Respondemos siempre 200 con { ok, error? } para simplificar el manejo de
// errores en el cliente (functions.invoke).
function json(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ ok: false, error: 'No autorizado' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // 1) Verificar que quien llama es ADMIN (usando su propio JWT + RLS).
    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: isAdmin, error: adminErr } = await caller.rpc('is_admin')
    if (adminErr) throw adminErr
    if (!isAdmin) return json({ ok: false, error: 'Requiere rol ADMIN' })

    // 2) Validar payload.
    const { email, full_name, role } = await req.json()
    if (!email || typeof email !== 'string') {
      return json({ ok: false, error: 'Correo requerido' })
    }
    const finalRole = role === 'ADMIN' ? 'ADMIN' : 'OPERATOR'

    // 3) Crear el usuario con la service_role. El trigger handle_new_user crea
    //    el profile con el rol indicado en user_metadata.
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      email_confirm: true, // confirmado → puede entrar por OTP de inmediato
      user_metadata: { full_name: full_name ?? '', role: finalRole },
    })
    if (error) return json({ ok: false, error: error.message })

    return json({ ok: true, user: data.user })
  } catch (e) {
    return json({
      ok: false,
      error: e instanceof Error ? e.message : 'Error inesperado',
    })
  }
})
