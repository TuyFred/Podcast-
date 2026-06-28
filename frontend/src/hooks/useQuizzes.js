import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { supabase } from '@/lib/supabase'
import useAuthStore from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * useQuizzes — manage quizzes and quiz attempts.
 */
export function useQuizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { user, session } = useAuthStore()

  // ── Fetch all quizzes — via backend (bypasses RLS) ─────────
  const fetchQuizzes = useCallback(async () => {
    if (!user) return []
    setLoading(true)
    setError(null)
    try {
      const token = useAuthStore.getState().session?.access_token
      const { data } = await axios.get(`${API_URL}/api/quizzes/supabase-list`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setQuizzes(data || [])
      return data
    } catch (err) {
      setError(err.message)
      setQuizzes([])
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  // ── Generate quiz via backend API ──────────────────────────
  const generateQuiz = useCallback(async (notesId, options = {}) => {
    setLoading(true)
    try {
      const { data } = await axios.post(
        `${API_URL}/api/quizzes/generate`,
        { notesId, ...options },
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      toast.success('Quiz generated! 🧠')
      await fetchQuizzes()
      return { data, error: null }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to generate quiz.'
      setError(message)
      toast.error(message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [session, fetchQuizzes])

  // ── Submit quiz attempt ────────────────────────────────────
  const submitQuiz = useCallback(async (quizId, answers, timeTaken) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    setLoading(true)
    try {
      // Fetch quiz to calculate score
      const { data: quiz, error: quizErr } = await supabase
        .from('quizzes')
        .select('questions, passing_score')
        .eq('id', quizId)
        .single()

      if (quizErr) throw quizErr

      // Calculate score (assume each question in answers has { questionId, selectedOption })
      const questions = quiz.questions || []
      let correct = 0
      questions.forEach((q) => {
        const userAnswer = answers.find((a) => a.questionId === q.id)
        if (userAnswer?.selectedOption === q.correctAnswer) correct++
      })

      const score = questions.length > 0 ? (correct / questions.length) * 100 : 0
      const isPassed = score >= (quiz.passing_score || 70)

      const { data, error: insertErr } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quizId,
          user_id: user.id,
          answers,
          score,
          is_passed: isPassed,
          time_taken: timeTaken,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      toast.success(isPassed ? `Quiz passed! Score: ${score.toFixed(0)}% 🎉` : `Quiz completed. Score: ${score.toFixed(0)}%`)
      return { data: { ...data, score, isPassed }, error: null }
    } catch (err) {
      setError(err.message)
      toast.error(err.message || 'Failed to submit quiz.')
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [user])

  // ── Get all attempts for a quiz ────────────────────────────
  const getQuizResults = useCallback(async (quizId) => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (err) throw err
      return { data, error: null }
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load quiz results.')
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    quizzes,
    loading,
    error,
    fetchQuizzes,
    generateQuiz,
    submitQuiz,
    getQuizResults,
  }
}

export default useQuizzes
