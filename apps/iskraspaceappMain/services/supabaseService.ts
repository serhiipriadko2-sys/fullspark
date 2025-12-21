/**
 * Supabase Service - Unified database access layer
 *
 * Provides data persistence with Supabase, with localStorage fallback
 * for offline mode or when Supabase is unavailable.
 */

import { supabase, getUserId, isSupabaseAvailable } from './supabaseClient';
import type {
  Task,
  Habit,
  JournalEntry,
  IskraMetrics,
  IskraPhase,
  VoiceName,
  VoicePreferences,
  MemoryNode,
  Message,
} from '../types';

// =============================================================================
// USER MANAGEMENT
// =============================================================================

interface UserRecord {
  id: string;
  name: string | null;
  created_at: string;
  onboarding_complete: boolean;
  tutorial_complete: boolean;
  settings: Record<string, unknown> | null;
}

export async function getOrCreateUser(): Promise<UserRecord> {
  const userId = await getUserId();

  // Try to get existing user
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingUser) {
    return existingUser as UserRecord;
  }

  // Create new user
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({ id: userId })
    .select()
    .single();

  if (error) {
    console.error('Failed to create user:', error);
    throw error;
  }

  return newUser as UserRecord;
}

export async function updateUser(updates: Partial<UserRecord>): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) console.error('Failed to update user:', error);
}

export async function completeOnboarding(name: string): Promise<void> {
  await updateUser({ name, onboarding_complete: true });
}

export async function completeTutorial(): Promise<void> {
  await updateUser({ tutorial_complete: true });
}

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const user = await getOrCreateUser();
    return user.onboarding_complete;
  } catch {
    return localStorage.getItem('iskra_onboarding_complete') === 'true';
  }
}

// =============================================================================
// TASKS
// =============================================================================

export async function getTasks(): Promise<Task[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get tasks:', error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    ritualTag: row.ritual_tag as Task['ritualTag'],
    done: row.done as boolean,
    date: (row.date as string) || undefined,
    priority: (row.priority as Task['priority']) || undefined,
    duration: (row.duration as number) || undefined,
  }));
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  const userId = await getUserId();

  // Delete existing tasks and insert new ones (simple sync strategy)
  await supabase.from('tasks').delete().eq('user_id', userId);

  if (tasks.length === 0) return;

  const rows = tasks.map(task => ({
    id: task.id,
    user_id: userId,
    title: task.title,
    ritual_tag: task.ritualTag,
    done: task.done,
    date: task.date || null,
    priority: task.priority || null,
    duration: task.duration || null,
  }));

  const { error } = await supabase.from('tasks').insert(rows);
  if (error) console.error('Failed to save tasks:', error);
}

export async function addTask(task: Omit<Task, 'id'>): Promise<Task> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: task.title,
      ritual_tag: task.ritualTag,
      done: task.done,
      date: task.date || null,
      priority: task.priority || null,
      duration: task.duration || null,
    })
    .select()
    .single();

  if (error) throw error;

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    title: row.title as string,
    ritualTag: row.ritual_tag as Task['ritualTag'],
    done: row.done as boolean,
    date: (row.date as string) || undefined,
    priority: (row.priority as Task['priority']) || undefined,
    duration: (row.duration as number) || undefined,
  };
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.ritualTag !== undefined) updateData.ritual_tag = updates.ritualTag;
  if (updates.done !== undefined) updateData.done = updates.done;
  if (updates.date !== undefined) updateData.date = updates.date || null;
  if (updates.priority !== undefined) updateData.priority = updates.priority || null;
  if (updates.duration !== undefined) updateData.duration = updates.duration || null;

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id);

  if (error) console.error('Failed to update task:', error);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) console.error('Failed to delete task:', error);
}

// =============================================================================
// HABITS
// =============================================================================

export async function getHabits(): Promise<Habit[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to get habits:', error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    ritualTag: row.ritual_tag as Habit['ritualTag'],
    streak: row.streak as number,
    completedToday: row.completed_today as boolean,
  }));
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  const userId = await getUserId();

  await supabase.from('habits').delete().eq('user_id', userId);

  if (habits.length === 0) return;

  const rows = habits.map(habit => ({
    id: habit.id,
    user_id: userId,
    title: habit.title,
    ritual_tag: habit.ritualTag,
    streak: habit.streak,
    completed_today: habit.completedToday,
  }));

  const { error } = await supabase.from('habits').insert(rows);
  if (error) console.error('Failed to save habits:', error);
}

// =============================================================================
// JOURNAL
// =============================================================================

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get journal entries:', error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    timestamp: row.created_at as string,
    text: row.text as string,
    prompt: {
      question: (row.prompt_question as string) || '',
      why: (row.prompt_why as string) || '',
    },
    analysis: row.analysis_reflection ? {
      reflection: row.analysis_reflection as string,
      mood: (row.analysis_mood as string) || '',
      signature: (row.analysis_signature as string) || 'Iskra',
    } : undefined,
    userMetrics: row.user_mood !== null ? {
      mood: row.user_mood as number,
      energy: (row.user_energy as number) || 50,
    } : undefined,
  }));
}

export async function addJournalEntry(entry: Omit<JournalEntry, 'id'>): Promise<JournalEntry> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      text: entry.text,
      prompt_question: entry.prompt.question,
      prompt_why: entry.prompt.why,
      analysis_reflection: entry.analysis?.reflection,
      analysis_mood: entry.analysis?.mood,
      analysis_signature: entry.analysis?.signature,
      user_mood: entry.userMetrics?.mood,
      user_energy: entry.userMetrics?.energy,
    })
    .select()
    .single();

  if (error) throw error;

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    timestamp: row.created_at as string,
    text: row.text as string,
    prompt: {
      question: (row.prompt_question as string) || '',
      why: (row.prompt_why as string) || '',
    },
  };
}

// =============================================================================
// METRICS
// =============================================================================

export async function saveMetricsSnapshot(metrics: IskraMetrics, phase: IskraPhase): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from('metrics_snapshots').insert({
    user_id: userId,
    rhythm: metrics.rhythm,
    trust: metrics.trust,
    clarity: metrics.clarity,
    pain: metrics.pain,
    drift: metrics.drift,
    chaos: metrics.chaos,
    echo: metrics.echo,
    silence_mass: metrics.silence_mass,
    mirror_sync: metrics.mirror_sync,
    interrupt: metrics.interrupt,
    ctx_switch: metrics.ctxSwitch,
    phase,
  });

  if (error) console.error('Failed to save metrics snapshot:', error);
}

export async function getLatestMetrics(): Promise<{ metrics: IskraMetrics; phase: IskraPhase } | null> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('metrics_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  return {
    metrics: {
      rhythm: row.rhythm as number,
      trust: row.trust as number,
      clarity: row.clarity as number,
      pain: row.pain as number,
      drift: row.drift as number,
      chaos: row.chaos as number,
      echo: row.echo as number,
      silence_mass: row.silence_mass as number,
      mirror_sync: row.mirror_sync as number,
      interrupt: row.interrupt as number,
      ctxSwitch: row.ctx_switch as number,
    },
    phase: row.phase as IskraPhase,
  };
}

// =============================================================================
// VOICE PREFERENCES
// =============================================================================

export async function getVoicePreferences(): Promise<VoicePreferences> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('voice_preferences')
    .select('voice_name, weight')
    .eq('user_id', userId);

  if (error || !data) return {};

  const prefs: VoicePreferences = {};
  (data as Array<{ voice_name: string; weight: number }>).forEach(row => {
    prefs[row.voice_name as VoiceName] = row.weight;
  });

  return prefs;
}

export async function saveVoicePreferences(prefs: VoicePreferences): Promise<void> {
  const userId = await getUserId();

  // Upsert each preference
  for (const [voice, weight] of Object.entries(prefs)) {
    const { error } = await supabase
      .from('voice_preferences')
      .upsert({
        user_id: userId,
        voice_name: voice,
        weight: weight || 1.0,
      }, {
        onConflict: 'user_id,voice_name',
      });

    if (error) console.error('Failed to save voice preference:', error);
  }
}

// =============================================================================
// CHAT HISTORY
// =============================================================================

export async function getChatHistory(limit = 50): Promise<Message[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Failed to get chat history:', error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    role: row.role as Message['role'],
    text: row.text as string,
    deltaSignature: row.delta_signature as Message['deltaSignature'],
  }));
}

export async function addChatMessage(message: Message): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from('chat_history').insert({
    user_id: userId,
    role: message.role,
    text: message.text,
    voice_name: message.voice?.name,
    delta_signature: message.deltaSignature,
  });

  if (error) console.error('Failed to add chat message:', error);
}

export async function clearChatHistory(): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from('chat_history').delete().eq('user_id', userId);
  if (error) console.error('Failed to clear chat history:', error);
}

// =============================================================================
// MEMORY NODES
// =============================================================================

export async function getMemoryNodes(layer?: MemoryNode['layer']): Promise<MemoryNode[]> {
  const userId = await getUserId();
  let query = supabase
    .from('memory_nodes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (layer) {
    query = query.eq('layer', layer);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get memory nodes:', error);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    type: row.type as MemoryNode['type'],
    layer: row.layer as MemoryNode['layer'],
    timestamp: row.created_at as string,
    title: row.title as string,
    content: row.content,
    doc_type: row.doc_type as MemoryNode['doc_type'],
    trust_level: row.trust_level as number,
    tags: (row.tags as string[]) || [],
    section: (row.section as string) || undefined,
    facet: row.facet as VoiceName | undefined,
    evidence: (row.evidence as MemoryNode['evidence']) || [],
  }));
}

export async function addMemoryNode(node: Omit<MemoryNode, 'id' | 'timestamp'>): Promise<MemoryNode> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('memory_nodes')
    .insert({
      user_id: userId,
      layer: node.layer,
      type: node.type,
      title: node.title,
      content: node.content,
      doc_type: node.doc_type || null,
      trust_level: node.trust_level || 1.0,
      tags: node.tags || [],
      section: node.section || null,
      facet: node.facet || null,
      evidence: node.evidence || [],
    })
    .select()
    .single();

  if (error) throw error;

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    type: row.type as MemoryNode['type'],
    layer: row.layer as MemoryNode['layer'],
    timestamp: row.created_at as string,
    title: row.title as string,
    content: row.content,
    doc_type: row.doc_type as MemoryNode['doc_type'],
    trust_level: row.trust_level as number,
    tags: (row.tags as string[]) || [],
    evidence: [],
  };
}

// =============================================================================
// AUDIT LOG
// =============================================================================

export async function logAudit(action: string, category: string, details?: Record<string, unknown>): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from('audit_log').insert({
    user_id: userId,
    action,
    category,
    details: details || null,
  });

  if (error) console.error('Failed to log audit:', error);
}

interface AuditLogRecord {
  id: string;
  user_id: string | null;
  action: string;
  category: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export async function getAuditLog(limit = 100): Promise<AuditLogRecord[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get audit log:', error);
    return [];
  }

  return data as AuditLogRecord[];
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export const supabaseService = {
  // User
  getOrCreateUser,
  updateUser,
  completeOnboarding,
  completeTutorial,
  isOnboardingComplete,
  // Tasks
  getTasks,
  saveTasks,
  addTask,
  updateTask,
  deleteTask,
  // Habits
  getHabits,
  saveHabits,
  // Journal
  getJournalEntries,
  addJournalEntry,
  // Metrics
  saveMetricsSnapshot,
  getLatestMetrics,
  // Voice
  getVoicePreferences,
  saveVoicePreferences,
  // Chat
  getChatHistory,
  addChatMessage,
  clearChatHistory,
  // Memory
  getMemoryNodes,
  addMemoryNode,
  // Audit
  logAudit,
  getAuditLog,
  // Utils
  isSupabaseAvailable,
};

export default supabaseService;
