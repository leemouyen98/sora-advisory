import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './useAuth'

const ContactsContext = createContext(null)

import { uid } from '../lib/formatters'

export function ContactsProvider({ children }) {
  const { token } = useAuth()
  const [contacts, setContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [contactsError, setContactsError] = useState(null)

  // Auth header helper
  const authHeaders = useCallback(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token])

  // ─── Load contacts from API on mount / token change ───────────────────────
  useEffect(() => {
    if (!token) {
      setContacts([])
      setContactsLoading(false)
      return
    }
    setContactsLoading(true)
    setContactsError(null)
    fetch('/api/contacts', { headers: { 'Authorization': `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load contacts (${r.status})`)
        return r.json()
      })
      .then((data) => { if (data.contacts) setContacts(data.contacts) })
      .catch((err) => setContactsError(err.message || 'Failed to load contacts.'))
      .finally(() => setContactsLoading(false))
  }, [token])

  // ─── Background sync: push a full contact to the API ─────────────────────
  // Uses a ref so the sync function never needs to be in dependency arrays
  const syncContact = useCallback((contact) => {
    if (!token) return
    fetch(`/api/contacts/${contact.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(contact),
    }).catch(() => {})
  }, [token, authHeaders])

  // Helper: update one contact in state and sync it
  const updateOne = useCallback((id, updater) => {
    setContacts((prev) => {
      const next = prev.map((c) => c.id === id ? updater(c) : c)
      const updated = next.find((c) => c.id === id)
      if (updated) syncContact(updated)
      return next
    })
  }, [syncContact])

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  const addContact = useCallback((data) => {
    const id = uid()
    const newContact = {
      id,
      ...data,
      tags: [],
      interactions: [],
      tasks: [],
      activities: [],
      retirementPlan: null,
      protectionPlan: null,
    }
    // Optimistic: show immediately
    setContacts((prev) => [newContact, ...prev])
    // Persist in background
    if (token) {
      fetch('/api/contacts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newContact),
      }).catch(() => {})
    }
    return newContact
  }, [token, authHeaders])

  const updateContact = useCallback((id, updates) => {
    updateOne(id, (c) => ({ ...c, ...updates }))
  }, [updateOne])

  const deleteContacts = useCallback((ids) => {
    setContacts((prev) => prev.filter((c) => !ids.includes(c.id)))
    if (token) {
      ids.forEach((id) => {
        fetch(`/api/contacts/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }).catch(() => {})
      })
    }
  }, [token])

  // ─── Tags ─────────────────────────────────────────────────────────────────

  const addTag = useCallback((ids, tag) => {
    setContacts((prev) => {
      const next = prev.map((c) =>
        ids.includes(c.id) && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c
      )
      next.filter((c) => ids.includes(c.id)).forEach(syncContact)
      return next
    })
  }, [syncContact])

  const removeTag = useCallback((ids, tag) => {
    setContacts((prev) => {
      const next = prev.map((c) =>
        ids.includes(c.id) ? { ...c, tags: c.tags.filter((t) => t !== tag) } : c
      )
      next.filter((c) => ids.includes(c.id)).forEach(syncContact)
      return next
    })
  }, [syncContact])

  // ─── Interactions / Tasks / Activities ────────────────────────────────────

  const addInteraction = useCallback((contactId, interaction) => {
    updateOne(contactId, (c) => ({
      ...c,
      interactions: [
        { id: uid(), date: new Date().toISOString().split('T')[0], ...interaction },
        ...c.interactions,
      ],
    }))
  }, [updateOne])

  const addTask = useCallback((contactId, task) => {
    updateOne(contactId, (c) => ({
      ...c,
      tasks: [{ id: uid(), status: 'pending', ...task }, ...c.tasks],
    }))
  }, [updateOne])

  const toggleTask = useCallback((contactId, taskId) => {
    updateOne(contactId, (c) => ({
      ...c,
      tasks: c.tasks.map((t) =>
        t.id === taskId ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' } : t
      ),
    }))
  }, [updateOne])

  const addActivity = useCallback((contactId, activity) => {
    updateOne(contactId, (c) => ({
      ...c,
      activities: [
        { id: uid(), date: new Date().toISOString().split('T')[0], ...activity },
        ...c.activities,
      ],
    }))
  }, [updateOne])

  // ─── Plans ────────────────────────────────────────────────────────────────

  const saveRetirementPlan = useCallback((contactId, plan) => {
    updateOne(contactId, (c) => ({ ...c, retirementPlan: plan }))
  }, [updateOne])

  const saveProtectionPlan = useCallback((contactId, plan) => {
    updateOne(contactId, (c) => ({ ...c, protectionPlan: plan }))
  }, [updateOne])

  const saveFinancials = useCallback((contactId, financials) => {
    updateOne(contactId, (c) => ({ ...c, financials }))
  }, [updateOne])

  return (
    <ContactsContext.Provider
      value={{
        contacts,
        contactsLoading,
        contactsError,
        addContact,
        updateContact,
        deleteContacts,
        addTag,
        removeTag,
        addInteraction,
        addTask,
        toggleTask,
        addActivity,
        saveRetirementPlan,
        saveProtectionPlan,
        saveFinancials,
      }}
    >
      {children}
    </ContactsContext.Provider>
  )
}

export function useContacts() {
  const ctx = useContext(ContactsContext)
  if (!ctx) throw new Error('useContacts must be used within ContactsProvider')
  return ctx
}
