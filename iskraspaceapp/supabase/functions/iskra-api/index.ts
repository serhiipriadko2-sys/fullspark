/**
 * Supabase Edge Function: Iskra GPT Actions API
 *
 * API endpoints for ChatGPT custom GPT "Искра" to interact with Supabase database.
 * Provides memory, metrics, journal, and task management.
 *
 * Deploy: supabase functions deploy iskra-api
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://typcvaszcfdpkzbjzuur.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const path = url.pathname.replace('/iskra-api', '');

  // Get user ID from header or use default
  const userId = req.headers.get('x-user-id') || 'chatgpt-iskra-user';

  try {
    // Ensure user exists
    await ensureUser(supabase, userId);

    // Route handling
    switch (true) {
      // ==================== METRICS ====================
      case path === '/metrics' && req.method === 'GET':
        return await getLatestMetrics(supabase, userId);

      case path === '/metrics' && req.method === 'POST':
        return await saveMetrics(supabase, userId, await req.json());

      case path === '/metrics/history' && req.method === 'GET':
        const limit = url.searchParams.get('limit') || '10';
        return await getMetricsHistory(supabase, userId, parseInt(limit));

      // ==================== MEMORY ====================
      case path === '/memory' && req.method === 'GET':
        const layer = url.searchParams.get('layer');
        return await getMemoryNodes(supabase, userId, layer);

      case path === '/memory' && req.method === 'POST':
        return await addMemoryNode(supabase, userId, await req.json());

      case path === '/memory/search' && req.method === 'GET':
        const query = url.searchParams.get('q') || '';
        return await searchMemory(supabase, userId, query);

      case path === '/memory/mantra' && req.method === 'GET':
        return await getMantra(supabase, userId);

      case path === '/memory/mantra' && req.method === 'POST':
        return await setMantra(supabase, userId, await req.json());

      // ==================== JOURNAL ====================
      case path === '/journal' && req.method === 'GET':
        const journalLimit = url.searchParams.get('limit') || '10';
        return await getJournalEntries(supabase, userId, parseInt(journalLimit));

      case path === '/journal' && req.method === 'POST':
        return await addJournalEntry(supabase, userId, await req.json());

      case path.startsWith('/journal/') && req.method === 'GET':
        const entryId = path.split('/')[2];
        return await getJournalEntry(supabase, userId, entryId);

      // ==================== TASKS ====================
      case path === '/tasks' && req.method === 'GET':
        return await getTasks(supabase, userId);

      case path === '/tasks' && req.method === 'POST':
        return await addTask(supabase, userId, await req.json());

      case path.startsWith('/tasks/') && req.method === 'PUT':
        const taskId = path.split('/')[2];
        return await updateTask(supabase, taskId, await req.json());

      case path.startsWith('/tasks/') && req.method === 'DELETE':
        const deleteTaskId = path.split('/')[2];
        return await deleteTask(supabase, deleteTaskId);

      // ==================== VOICE PREFERENCES ====================
      case path === '/voice-preferences' && req.method === 'GET':
        return await getVoicePreferences(supabase, userId);

      case path === '/voice-preferences' && req.method === 'POST':
        return await saveVoicePreferences(supabase, userId, await req.json());

      // ==================== AUDIT ====================
      case path === '/audit' && req.method === 'POST':
        return await logAudit(supabase, userId, await req.json());

      case path === '/audit' && req.method === 'GET':
        const auditLimit = url.searchParams.get('limit') || '50';
        return await getAuditLog(supabase, userId, parseInt(auditLimit));

      // ==================== USER ====================
      case path === '/user' && req.method === 'GET':
        return await getUser(supabase, userId);

      case path === '/user' && req.method === 'PUT':
        return await updateUser(supabase, userId, await req.json());

      // ==================== HEALTH ====================
      case path === '/health':
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });

      default:
        return jsonResponse({ error: 'Not found', path }, 404);
    }
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
});

// ==================== HELPER FUNCTIONS ====================

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function ensureUser(supabase: any, userId: string) {
  const { data } = await supabase.from('users').select('id').eq('id', userId).single();
  if (!data) {
    await supabase.from('users').insert({ id: userId, name: 'ChatGPT Искра' });
  }
}

// ==================== METRICS ====================

async function getLatestMetrics(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('metrics_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (!data) {
    return jsonResponse({
      rhythm: 75, trust: 0.8, clarity: 0.7, pain: 0.1,
      drift: 0.2, chaos: 0.3, echo: 0.5, silence_mass: 0.1,
      mirror_sync: 0.6, phase: 'CLARITY'
    });
  }

  return jsonResponse({
    rhythm: data.rhythm,
    trust: data.trust,
    clarity: data.clarity,
    pain: data.pain,
    drift: data.drift,
    chaos: data.chaos,
    echo: data.echo,
    silence_mass: data.silence_mass,
    mirror_sync: data.mirror_sync,
    interrupt: data.interrupt,
    ctx_switch: data.ctx_switch,
    phase: data.phase,
    timestamp: data.created_at,
  });
}

async function saveMetrics(supabase: any, userId: string, body: any) {
  const { data, error } = await supabase
    .from('metrics_snapshots')
    .insert({
      user_id: userId,
      rhythm: body.rhythm || 75,
      trust: body.trust || 0.8,
      clarity: body.clarity || 0.7,
      pain: body.pain || 0.1,
      drift: body.drift || 0.2,
      chaos: body.chaos || 0.3,
      echo: body.echo || 0.5,
      silence_mass: body.silence_mass || 0.1,
      mirror_sync: body.mirror_sync || 0.6,
      interrupt: body.interrupt || 0,
      ctx_switch: body.ctx_switch || 0,
      phase: body.phase || 'CLARITY',
    })
    .select()
    .single();

  if (error) throw error;
  return jsonResponse({ success: true, id: data.id });
}

async function getMetricsHistory(supabase: any, userId: string, limit: number) {
  const { data, error } = await supabase
    .from('metrics_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return jsonResponse(data || []);
}

// ==================== MEMORY ====================

async function getMemoryNodes(supabase: any, userId: string, layer: string | null) {
  let query = supabase
    .from('memory_nodes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (layer) {
    query = query.eq('layer', layer);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return jsonResponse(data || []);
}

async function addMemoryNode(supabase: any, userId: string, body: any) {
  const { data, error } = await supabase
    .from('memory_nodes')
    .insert({
      user_id: userId,
      layer: body.layer || 'archive',
      type: body.type || 'insight',
      title: body.title,
      content: body.content,
      doc_type: body.doc_type,
      trust_level: body.trust_level || 1.0,
      tags: body.tags || [],
      facet: body.facet,
      evidence: body.evidence || [],
    })
    .select()
    .single();

  if (error) throw error;
  return jsonResponse({ success: true, id: data.id });
}

async function searchMemory(supabase: any, userId: string, query: string) {
  const { data, error } = await supabase
    .from('memory_nodes')
    .select('*')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return jsonResponse(data || []);
}

async function getMantra(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('memory_nodes')
    .select('*')
    .eq('user_id', userId)
    .eq('layer', 'mantra')
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return jsonResponse(data || null);
}

async function setMantra(supabase: any, userId: string, body: any) {
  // Delete existing mantra
  await supabase.from('memory_nodes').delete().eq('user_id', userId).eq('layer', 'mantra');

  // Create new mantra
  const { data, error } = await supabase
    .from('memory_nodes')
    .insert({
      user_id: userId,
      layer: 'mantra',
      type: 'insight',
      title: 'Core Mantra',
      content: body.content,
      trust_level: 1.0,
    })
    .select()
    .single();

  if (error) throw error;
  return jsonResponse({ success: true, id: data.id });
}

// ==================== JOURNAL ====================

async function getJournalEntries(supabase: any, userId: string, limit: number) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return jsonResponse(data || []);
}

async function addJournalEntry(supabase: any, userId: string, body: any) {
  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      text: body.text,
      prompt_question: body.prompt_question,
      prompt_why: body.prompt_why,
      analysis_reflection: body.analysis_reflection,
      analysis_mood: body.analysis_mood,
      analysis_signature: body.analysis_signature || 'Iskra',
      user_mood: body.user_mood,
      user_energy: body.user_energy,
    })
    .select()
    .single();

  if (error) throw error;
  return jsonResponse({ success: true, id: data.id, timestamp: data.created_at });
}

async function getJournalEntry(supabase: any, userId: string, id: string) {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .single();

  if (error) throw error;
  return jsonResponse(data);
}

// ==================== TASKS ====================

async function getTasks(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return jsonResponse(data || []);
}

async function addTask(supabase: any, userId: string, body: any) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: body.title,
      ritual_tag: body.ritual_tag || 'FIRE',
      done: body.done || false,
      date: body.date,
      priority: body.priority,
      duration: body.duration,
    })
    .select()
    .single();

  if (error) throw error;
  return jsonResponse({ success: true, id: data.id });
}

async function updateTask(supabase: any, id: string, body: any) {
  const { error } = await supabase
    .from('tasks')
    .update({
      title: body.title,
      ritual_tag: body.ritual_tag,
      done: body.done,
      date: body.date,
      priority: body.priority,
      duration: body.duration,
    })
    .eq('id', id);

  if (error) throw error;
  return jsonResponse({ success: true });
}

async function deleteTask(supabase: any, id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
  return jsonResponse({ success: true });
}

// ==================== VOICE PREFERENCES ====================

async function getVoicePreferences(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('voice_preferences')
    .select('voice_name, weight')
    .eq('user_id', userId);

  if (error) throw error;

  const prefs: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    prefs[row.voice_name] = row.weight;
  });

  return jsonResponse(prefs);
}

async function saveVoicePreferences(supabase: any, userId: string, body: any) {
  for (const [voice, weight] of Object.entries(body)) {
    await supabase
      .from('voice_preferences')
      .upsert({
        user_id: userId,
        voice_name: voice,
        weight: weight as number,
      }, { onConflict: 'user_id,voice_name' });
  }

  return jsonResponse({ success: true });
}

// ==================== AUDIT ====================

async function logAudit(supabase: any, userId: string, body: any) {
  const { error } = await supabase.from('audit_log').insert({
    user_id: userId,
    action: body.action,
    category: body.category || 'general',
    details: body.details,
  });

  if (error) throw error;
  return jsonResponse({ success: true });
}

async function getAuditLog(supabase: any, userId: string, limit: number) {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return jsonResponse(data || []);
}

// ==================== USER ====================

async function getUser(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return jsonResponse(data);
}

async function updateUser(supabase: any, userId: string, body: any) {
  const { error } = await supabase
    .from('users')
    .update({
      name: body.name,
      settings: body.settings,
    })
    .eq('id', userId);

  if (error) throw error;
  return jsonResponse({ success: true });
}
