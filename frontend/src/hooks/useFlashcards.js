import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import useAuthStore from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * useFlashcards — manage flashcard sets and track spaced-repetition reviews.
 * All DB operations go through the backend API (bypasses Supabase RLS).
 */
export function useFlashcards() {
  const [flashcards, setFlashcards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { user, session } = useAuthStore()

  const authHeaders = () => ({
    Authorization: `Bearer ${useAuthStore.getState().session?.access_token}`,
  })

  // ── Fetch flashcards — via backend (bypasses RLS) ──────────
  const fetchFlashcards = useCallback(async (notesId = null) => {
    if (!user) return []
    setLoading(true)
    setError(null)
    try {
      const url = notesId
        ? `${API_URL}/api/flashcards/supabase-list?notesId=${notesId}`
        : `${API_URL}/api/flashcards/supabase-list`
      const { data: sbData } = await axios.get(url, { headers: authHeaders() })
      setFlashcards(sbData || [])
      return sbData
    } catch (err) {
      setError(err.message)
      setFlashcards([])
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  // ── Generate flashcards via backend ───────────────────────
  const generateFlashcards = useCallback(async (notesId, options = {}) => {
    setLoading(true)
    try {
      const { data } = await axios.post(
        `${API_URL}/api/flashcards/generate`,
        { notesId, ...options },
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      toast.success('Flashcards generated! 🃏')
      await fetchFlashcards(notesId)
      return { data, error: null }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to generate flashcards.'
      setError(message)
      toast.error(message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [session, fetchFlashcards])

  // ── Review a flashcard (spaced repetition update) ──────────
  const reviewFlashcard = useCallback(async (id, correct) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/flashcards/${id}/review`,
        { isCorrect: !!correct },
        { headers: authHeaders() }
      )

      if (data?.flashcard) {
        setFlashcards((prev) => prev.map((f) => (f.id === id ? data.flashcard : f)))
      }

      return { data: data?.flashcard, error: null }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to record review.'
      setError(message)
      toast.error(message)
      return { data: null, error: err }
    }
  }, [])

  // ── Delete flashcard ───────────────────────────────────────
  const deleteFlashcard = useCallback(async (id) => {
    setLoading(true)
    try {
      await axios.delete(`${API_URL}/api/flashcards/${id}`, { headers: authHeaders() })
      setFlashcards((prev) => prev.filter((f) => f.id !== id))
      toast.success('Flashcard deleted.')
      return { error: null }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to delete flashcard.'
      setError(message)
      toast.error(message)
      return { error: err }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    flashcards,
    loading,
    error,
    fetchFlashcards,
    generateFlashcards,
    reviewFlashcard,
    deleteFlashcard,
  }
}

export default useFlashcards
