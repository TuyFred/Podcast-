import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Fetch profile via backend (service-role key — bypasses RLS completely)
async function fetchProfileViaBackend(userId, token) {
  try {
    const { data } = await axios.get(`${API}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    })
    return data
  } catch (err) {
    console.warn('[AuthStore] Backend profile fetch failed:', err.message)
    return null
  }
}

// Prevent concurrent fetchProfile calls for the same user
let _fetchingFor = null

const useAuthStore = create((set, get) => ({
  user:        null,
  session:     null,
  profile:     null,
  loading:     true,
  initialized: false,

  setUser:        (user)        => set({ user }),
  setSession:     (session)     => set({ session }),
  setProfile:     (profile)     => set({ profile }),
  setLoading:     (loading)     => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),

  // ── fetchProfile: use backend API first, fallback to Supabase direct ──
  fetchProfile: async (userId) => {
    // Prevent duplicate simultaneous fetches
    if (_fetchingFor === userId) return get().profile
    _fetchingFor = userId

    try {
      const token = get().session?.access_token
      if (!token) {
        _fetchingFor = null
        return null
      }

      // 1. Try backend (bypasses RLS)
      const profileData = await fetchProfileViaBackend(userId, token)

      if (profileData) {
        set({ profile: profileData })
        _fetchingFor = null
        return profileData
      }

      // 2. Fallback: direct Supabase (works if RLS is fixed)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        set({ profile: data })
        _fetchingFor = null
        return data
      }

      // 3. Absolute fallback: minimal profile so app doesn't break
      const minimal = {
        id:   userId,
        email: get().user?.email || '',
        role: 'user',
        is_active: true,
        subscription_status: 'free',
      }
      set({ profile: minimal })
      _fetchingFor = null
      return minimal
    } catch (err) {
      console.error('[AuthStore] fetchProfile error:', err.message)
      const minimal = {
        id:   userId,
        email: get().user?.email || '',
        role: 'user',
        is_active: true,
        subscription_status: 'free',
      }
      set({ profile: minimal })
      _fetchingFor = null
      return minimal
    }
  },

  // ── Initialize (once at app startup) ──────────────────────────
  initialize: async () => {
    set({ loading: true })

    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      set({ session, user: session.user })
      await get().fetchProfile(session.user.id)
    }

    set({ loading: false, initialized: true })

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Avoid unnecessary profile refetches on TOKEN_REFRESHED
        if (event === 'TOKEN_REFRESHED') {
          set({ session: newSession })
          return
        }

        set({ session: newSession, user: newSession?.user ?? null })

        if (event === 'SIGNED_OUT') {
          set({ user: null, session: null, profile: null })
          _fetchingFor = null
          return
        }

        if (newSession?.user && event === 'SIGNED_IN') {
          await get().fetchProfile(newSession.user.id)
        }
      }
    )

    set({ _authSubscription: subscription })
  },

  // ── Logout ─────────────────────────────────────────────────────
  logout: async () => {
    const { _authSubscription } = get()
    if (_authSubscription) _authSubscription.unsubscribe()
    _fetchingFor = null
    await supabase.auth.signOut()
    set({
      user: null, session: null, profile: null,
      initialized: false, _authSubscription: null,
    })
  },

  _authSubscription: null,
}))

export default useAuthStore
