import { create } from 'zustand'

let notificationId = 0

const useAppStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────
  sidebarOpen: true,
  theme: 'dark',
  notifications: [],
  globalLoading: false,

  // ── Sidebar ────────────────────────────────────────────────
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // ── Global Loading ─────────────────────────────────────────
  setGlobalLoading: (globalLoading) => set({ globalLoading }),

  // ── Notifications ──────────────────────────────────────────
  /**
   * Add a notification to the queue.
   * @param {{ type: 'success'|'error'|'info'|'warning', title: string, message?: string, duration?: number }} notification
   */
  addNotification: (notification) => {
    const id = ++notificationId
    const entry = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 4000,
      ...notification,
    }

    set((state) => ({
      notifications: [...state.notifications, entry],
    }))

    // Auto-remove after duration
    if (entry.duration > 0) {
      setTimeout(() => get().removeNotification(id), entry.duration)
    }

    return id
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}))

export default useAppStore
