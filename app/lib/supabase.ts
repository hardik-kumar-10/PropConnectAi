import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Types ──────────────────────────────────────────────────────────────────

export interface Session {
    id?: string
    created_at?: string
    lead_name?: string
    phone?: string
    score?: number
}

export interface Message {
    id?: string
    session_id: string
    role: 'user' | 'assistant'
    content: string
    created_at?: string
}

export interface Lead {
    id?: string
    session_id: string
    budget?: string
    location?: string
    bhk_type?: string
    timeline?: string
    phone?: string
    preferences?: string
    score?: number
    created_at?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Create a new session at the start of a call. Returns the session id. */
export async function createSession(): Promise<string | null> {
    const { data, error } = await supabase
        .from('sessions')
        .insert({})
        .select('id')
        .single()

    if (error) {
        console.error('[Supabase] createSession error:', error.message)
        return null
    }
    return data.id
}

/** Save a single chat message tied to a session. */
export async function saveMessage(message: Message): Promise<void> {
    const { error } = await supabase.from('messages').insert(message)
    if (error) console.error('[Supabase] saveMessage error:', error.message)
}

/** Upsert extracted lead data for a session (overwrites on repeat calls). */
export async function upsertLead(lead: Lead): Promise<void> {
    const { error } = await supabase
        .from('leads')
        .upsert(lead, { onConflict: 'session_id' })
    if (error) console.error('[Supabase] upsertLead error:', error.message)
}

/** Update top-level session info (name, phone, score) once known. */
export async function updateSession(
    sessionId: string,
    updates: Partial<Session>
): Promise<void> {
    const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', sessionId)
    if (error) console.error('[Supabase] updateSession error:', error.message)
}