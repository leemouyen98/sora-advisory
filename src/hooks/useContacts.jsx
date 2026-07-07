import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from './useAuth'

const ContactsContext = createContext(null)

import { uid } from '../lib/formatters'

export function ContactsProvider({ children }) {
  const { token } = useAuth()
  const [contacts, setContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [contactsError, setContactsError] = useState(null)
  // Separate from contactsError (which only covers the initial GET). Every
  // write below used to end in `.catch(() => {})` — a failed save/add/delete
  // left the optimistic UI state unchanged and showed nothing, so the advisor
  // believed it worked when it hadn't. Mutations now roll back on failure and
  // set this so a consuming component can surface it (see App.jsx).
  const [mutationError, setMutationError] = useState(null)

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
  // On failure, roll back to the snapshot taken before the optimistic update
  // and surface an error — previously this silently swallowed failures,
  // leaving the UI showing a "saved" state that was never actually persisted.
  const syncContact = useCallback((contact, previousContacts) => {
    if (!token) return
    fetch(`/api/contacts/${contact.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(contact),
    }).then((r) => {
      if (!r.ok) throw new Error(`Save failed (${r.status})`)
    }).catch(() => {
      setContacts(previousContacts)
      setMutationError(`Couldn't save changes to ${contact.name || 'contact'} — please try again.`)
    })
  }, [token, authHeaders])

  // Helper: update one contact in state and sync it
  const updateOne = useCallback((id, updater) => {
    setContacts((prev) => {
      const next = prev.map((c) => c.id === id ? updater(c) : c)
      const updated = next.find((c) => c.id === id)
      if (updated) syncContact(updated, prev)
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
    // Persist in background — roll back the optimistic insert on failure
    // instead of leaving a contact that only ever existed client-side.
    if (token) {
      fetch('/api/contacts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newContact),
      }).then((r) => {
        if (!r.ok) throw new Error(`Create failed (${r.status})`)
      }).catch(() => {
        setContacts((prev) => prev.filter((c) => c.id !== id))
        setMutationError(`Couldn't create ${data.name || 'contact'} — please try again.`)
      })
    }
    return newContact
  }, [token, authHeaders])

  const updateContact = useCallback((id, updates) => {
    updateOne(id, (c) => ({ ...c, ...updates }))
  }, [updateOne])

  const deleteContacts = useCallback((ids) => {
    setContacts((prev) => {
      const remaining = prev.filter((c) => !ids.includes(c.id))
      if (token) {
        Promise.all(ids.map((id) =>
          fetch(`/api/contacts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          }).then((r) => { if (!r.ok) throw new Error(`Delete failed (${r.status})`) })
        )).catch(() => {
          // At least one delete failed server-side — restore the full
          // pre-delete list rather than leaving a partial, ambiguous state
          // where some contacts are gone locally but still exist on the server.
          setContacts(prev)
          setMutationError(
            ids.length > 1
              ? "Couldn't delete some contacts — please try again."
              : "Couldn't delete contact — please try again."
          )
        })
      }
      return remaining
    })
  }, [token])

  // ─── Tags ─────────────────────────────────────────────────────────────────

  const addTag = useCallback((ids, tag) => {
    setContacts((prev) => {
      const next = prev.map((c) =>
        ids.includes(c.id) && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c
      )
      // NOTE: pass `prev` explicitly — `.forEach(syncContact)` would pass
      // forEach's own (index, array) as syncContact's 2nd/3rd args, silently
      // turning the rollback snapshot into a number and corrupting state
      // on failure. Same fix applied in removeTag below.
      next.filter((c) => ids.includes(c.id)).forEach((c) => syncContact(c, prev))
      return next
    })
  }, [syncContact])

  const removeTag = useCallback((ids, tag) => {
    setContacts((prev) => {
      const next = prev.map((c) =>
        ids.includes(c.id) ? { ...c, tags: c.tags.filter((t) => t !== tag) } : c
      )
      next.filter((c) => ids.includes(c.id)).forEach((c) => syncContact(c, prev))
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

  // Stamp updatedAt on every plan save so the Planning Snapshot can show staleness.
  // Contacts only carry one row-level updated_at, which conflates edits to any
  // field (tags, notes, stage...) with an actual plan review — not granular enough.
  const saveRetirementPlan = useCallback((contactId, plan) => {
    const stamped = plan ? { ...plan, updatedAt: new Date().toISOString() } : plan
    updateOne(contactId, (c) => ({ ...c, retirementPlan: stamped }))
  }, [updateOne])

  const saveProtectionPlan = useCallback((contactId, plan) => {
    const stamped = plan ? { ...plan, updatedAt: new Date().toISOString() } : plan
    updateOne(contactId, (c) => ({ ...c, protectionPlan: stamped }))
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
        mutationError,
        clearMutationError: () => setMutationError(null),
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
