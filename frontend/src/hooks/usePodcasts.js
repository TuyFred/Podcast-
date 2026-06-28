import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * usePodcasts — manage podcast records and trigger generation via backend API.
 */
export function usePodcasts() {
  const [podcasts, setPodcasts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { user, session } = useAuthStore()

  // ── Fetch all podcasts — via backend (bypasses RLS) ───────
  const fetchPodcasts = useCallback(async () => {
    if (!user) return []
    setLoading(true)
    setError(null)
    try {
      const token = useAuthStore.getState().session?.access_token
      const { data } = await axios.get(`${API}/api/podcasts/supabase-list`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setPodcasts(data || [])
      return data
    } catch (err) {
      // Fallback to direct Supabase
      try {
        const { data, error: sbErr } = await supabase
          .from('podcasts').select('*, notes(title)').eq('user_id', user.id).order('created_at', { ascending: false })
        if (!sbErr) { setPodcasts(data || []); return data }
      } catch (_) {}
      setError(err.message)
      setPodcasts([])
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  // ── Trigger podcast generation via backend ─────────────────
  const generatePodcast = useCallback(async (notesId, options = {}) => {
    setLoading(true)
    try {
      const { data } = await axios.post(
        `${API_URL}/api/podcasts/generate`,
        { notesId, ...options },
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      toast.success('Podcast generation started! 🎙️')
      // Refresh list to include the new pending entry
      await fetchPodcasts()
      return { data, error: null }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to generate podcast.'
      setError(message)
      toast.error(message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [session, fetchPodcasts])

  // ── Delete podcast ─────────────────────────────────────────
  const deletePodcast = useCallback(async (id) => {
    setLoading(true)
    try {
      // Fetch audio_file_path before deleting
      const { data: podcast, error: fetchErr } = await supabase
        .from('podcasts')
        .select('audio_file_path')
        .eq('id', id)
        .single()

      if (fetchErr) throw fetchErr

      // Remove audio from storage if present
      if (podcast?.audio_file_path) {
        const { error: storageErr } = await supabase.storage
          .from('audio-files')
          .remove([podcast.audio_file_path])
        if (storageErr) console.warn('[usePodcasts] Storage delete warning:', storageErr.message)
      }

      const { error: deleteErr } = await supabase.from('podcasts').delete().eq('id', id)
      if (deleteErr) throw deleteErr

      setPodcasts((prev) => prev.filter((p) => p.id !== id))
      toast.success('Podcast deleted.')
      return { error: null }
    } catch (err) {
      setError(err.message)
      toast.error(err.message || 'Failed to delete podcast.')
      return { error: err }
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Get single podcast with related note info ──────────────
  const getPodcast = useCallback(async (id) => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('podcasts')
        .select('*, notes(id, title, subject_area, difficulty_level)')
        .eq('id', id)
        .single()

      if (err) throw err
      return { data, error: null }
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load podcast.')
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    podcasts,
    loading,
    error,
    fetchPodcasts,
    generatePodcast,
    deletePodcast,
    getPodcast,
  }
}

export default usePodcasts
