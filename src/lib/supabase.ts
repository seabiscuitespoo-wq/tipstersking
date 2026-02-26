import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Create a dummy client for build time
const createDummyClient = () => {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Not configured' } }),
      signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Not configured' } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ data: [], error: null, order: () => ({ data: [], error: null }) }),
      insert: () => ({ data: null, error: { message: 'Not configured' }, select: () => ({ single: () => ({ data: null, error: { message: 'Not configured' } }) }) }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      delete: () => ({ eq: () => ({ data: null, error: null }) }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: { message: 'Not configured' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  } as unknown as SupabaseClient
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createDummyClient()

export const getSupabase = () => supabase
