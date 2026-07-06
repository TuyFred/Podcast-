import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import useAuthStore from '@/store/authStore'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * useNotes — CRUD + file upload operations for the notes table.
 * Fetching uses backend API (bypasses RLS) to avoid infinite recursion errors.
 */
export function useNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const { user } = useAuthStore()

  // ── Fetch all notes — via backend (bypasses RLS) ──────────
  const fetchNotes = useCallback(async () => {
    if (!user) return []
    setLoading(true)
    setError(null)
    try {
      const token = useAuthStore.getState().session?.access_token
      const { data } = await axios.get(`${API}/api/notes/supabase-list`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotes(data || [])
      return data
    } catch (err) {
      setError(err.message)
      setNotes([])
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  // ── Upload file → backend API (bypasses RLS) ──────────────
  const uploadNote = useCallback(async (file, metadata = {}) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    setLoading(true)
    try {
      const token = useAuthStore.getState().session?.access_token
      const form  = new FormData()
      form.append('file',  file)
      form.append('title', metadata.title || file.name.replace(/\.[^/.]+$/, ''))
      if (metadata.courseName)   form.append('courseName',  metadata.courseName)
      if (metadata.subjectArea)  form.append('subjectArea', metadata.subjectArea)

      const { data } = await axios.post(`${API}/api/notes/upload`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })

      // Refresh list after upload
      const refreshed = await fetchNotes()
      const newId = data?.notesId || data?.id || refreshed?.[0]?.id
      toast.success('Note uploaded! 📄 AI is extracting text…')
      return { data: { ...data, id: newId, notesId: newId }, error: null }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Upload failed.'
      setError(msg)
      toast.error(msg)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [user])

  // ── Delete note — via backend (bypasses RLS) ──────────────
  const deleteNote = useCallback(async (id) => {
    setLoading(true)
    try {
      const token = useAuthStore.getState().session?.access_token
      await axios.delete(`${API}/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotes((prev) => prev.filter((n) => n.id !== id))
      toast.success('Note deleted.')
      return { error: null }
    } catch (err) {
      setError(err.message)
      toast.error(err.response?.data?.message || 'Failed to delete note.')
      return { error: err }
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Get single note — returns note directly (not wrapped) ──
  const getNote = useCallback(async (id) => {
    setLoading(true)
    try {
      const token = useAuthStore.getState().session?.access_token
      const { data } = await axios.get(`${API}/api/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return data // return note object directly
    } catch (err) {
      setError(err.message)
      toast.error('Failed to load note.')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Update note — via backend ──────────────────────────────
  const updateNote = useCallback(async (id, updates) => {
    setLoading(true)
    try {
      const token = useAuthStore.getState().session?.access_token
      const { data } = await axios.put(`${API}/api/notes/${id}`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotes((prev) => prev.map((n) => (n.id === id ? (data.notes || data) : n)))
      toast.success('Note updated.')
      return { data, error: null }
    } catch (err) {
      setError(err.message)
      toast.error(err.response?.data?.message || 'Failed to update note.')
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    notes,
    loading,
    error,
    fetchNotes,
    uploadNote,
    deleteNote,
    getNote,
    updateNote,
  }
}

export default useNotes
