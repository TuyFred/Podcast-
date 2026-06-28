import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * useSummaries — manage AI-generated note summaries.
 */
export function useSummaries() {
  const [summaries, setSummaries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { user, session } = useAuthStore()

  // ── Fetch summaries — via backend (bypasses RLS) ──────────
  const fetchSummaries = useCallback(async (notesId = null) => {
    if (!user) return []
    setLoading(true)
    setError(null)
    try {
      const token = useAuthStore.getState().session?.access_token
      const url = notesId
        ? `${API_URL}/api/summaries/supabase-list?notesId=${notesId}`
        : `${API_URL}/api/summaries/supabase-list`
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSummaries(data || [])
      return data
    } catch (err) {
      setError(err.message)
      setSummaries([])
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  // ── Generate summary via backend ───────────────────────────
  const generateSummary = useCallback(async (notesId, type = 'comprehensive') => {
    setLoading(true)
    try {
      const { data } = await axios.post(
        `${API_URL}/api/summaries/generate`,
        { notesId, type },
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      toast.success('Summary generated! 📝')
      await fetchSummaries(notesId)
      return { data, error: null }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to generate summary.'
      setError(message)
      toast.error(message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [session, fetchSummaries])

  // ── Get single summary ─────────────────────────────────────
  const getSummary = useCallback(async (id) => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('summaries')
        .select('*, notes(id, title, subject_area, difficulty_level, main_topics)')
        .eq('id', id)
        .single()

      if (err) throw err
      return { data, error: null }
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load summary.')
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    summaries,
    loading,
    error,
    fetchSummaries,
    generateSummary,
    getSummary,
  }
}

export default useSummaries
