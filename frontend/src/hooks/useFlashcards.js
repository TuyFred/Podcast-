import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Spaced-repetition: days until next review based on performance
const REVIEW_INTERVALS = {
  correct: 3,   // Review again in 3 days
  incorrect: 1, // Review again tomorrow
}

/**
 * useFlashcards — manage flashcard sets and track spaced-repetition reviews.
 */
export function useFlashcards() {
  const [flashcards, setFlashcards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { user, session } = useAuthStore()

  // ── Fetch flashcards — via backend (bypasses RLS) ──────────
  const fetchFlashcards = useCallback(async (notesId = null) => {
    if (!user) return []
    setLoading(true)
    setError(null)
    try {
      const token = useAuthStore.getState().session?.access_token
      const url = notesId
        ? `${API_URL}/api/flashcards/supabase-list?notesId=${notesId}`
        : `${API_URL}/api/flashcards/supabase-list`
      const { data: sbData } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
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
      const daysUntilReview = correct ? REVIEW_INTERVALS.correct : REVIEW_INTERVALS.incorrect
      const nextReview = new Date()
      nextReview.setDate(nextReview.getDate() + daysUntilReview)

      // Fetch current counts
      const { data: current, error: fetchErr } = await supabase
        .from('flashcards')
        .select('user_review_count, user_correct_count, user_incorrect_count')
        .eq('id', id)
        .single()

      if (fetchErr) throw fetchErr

      const updates = {
        user_review_count:   (current.user_review_count || 0) + 1,
        user_correct_count:  (current.user_correct_count || 0) + (correct ? 1 : 0),
        user_incorrect_count:(current.user_incorrect_count || 0) + (correct ? 0 : 1),
        next_review_date:    nextReview.toISOString(),
        updated_at:          new Date().toISOString(),
      }

      const { data, error: updateErr } = await supabase
        .from('flashcards')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateErr) throw updateErr

      setFlashcards((prev) => prev.map((f) => (f.id === id ? data : f)))
      return { data, error: null }
    } catch (err) {
      setError(err.message)
      toast.error('Failed to record review.')
      return { data: null, error: err }
    }
  }, [])

  // ── Delete flashcard ───────────────────────────────────────
  const deleteFlashcard = useCallback(async (id) => {
    setLoading(true)
    try {
      const { error: err } = await supabase.from('flashcards').delete().eq('id', id)
      if (err) throw err

      setFlashcards((prev) => prev.filter((f) => f.id !== id))
      toast.success('Flashcard deleted.')
      return { error: null }
    } catch (err) {
      setError(err.message)
      toast.error(err.message || 'Failed to delete flashcard.')
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
