import { createContext, useContext, useState, useCallback } from 'react'

const ContactsContext = createContext(null)

// Generate a simple unique ID
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

// Demo contacts
const INITIAL_CONTACTS = [
  {
    id: 'c1',
    name: 'Jesey Tan',
    dob: '1996-05-14',
    mobile: '012-3456789',
    employment: 'Employed',
    reviewDate: '2026-06-01',
    reviewFrequency: 'Annually',
    notes: 'Interested in retirement planning',
    tags: ['Client'],
    interactions: [
      { id: 'n1', type: 'note', content: 'Initial consultation — discussed retirement goals.', date: '2026-03-15' },
      { id: 'n2', type: 'note', content: 'Sent retirement projection. Client wants to review EPF options.', date: '2026-03-18' },
    ],
    tasks: [
      { id: 't1', title: 'Follow up on retirement plan review', dueDate: '2026-04-01', status: 'pending' },
    ],
    activities: [
      { id: 'a1', type: 'Meeting', description: 'First consultation — goals & priorities', date: '2026-03-15' },
      { id: 'a2', type: 'Call', description: 'Quick catch-up on EPF balance', date: '2026-03-18' },
    ],
    retirementPlan: null,
    protectionPlan: null,
  },
  {
    id: 'c2',
    name: 'Ahmad Razak',
    dob: '1988-11-22',
    mobile: '019-8765432',
    employment: 'Self-Employed',
    reviewDate: '2026-07-15',
    reviewFrequency: 'Semi-annually',
    notes: 'Business owner, needs protection review',
    tags: ['Prospect'],
    interactions: [],
    tasks: [],
    activities: [],
    retirementPlan: null,
    protectionPlan: null,
  },
  {
    id: 'c3',
    name: 'Michelle Wong',
    dob: '1992-02-08',
    mobile: '016-5551234',
    employment: 'Employed',
    reviewDate: '2026-04-20',
    reviewFrequency: 'Quarterly',
    notes: '',
    tags: ['Client'],
    interactions: [],
    tasks: [],
    activities: [],
    retirementPlan: null,
    protectionPlan: null,
  },
]

export function ContactsProvider({ children }) {
  const [contacts, setContacts] = useState(INITIAL_CONTACTS)

  const addContact = useCallback((data) => {
    const newContact = {
      id: uid(),
      ...data,
      tags: [],
      interactions: [],
      tasks: [],
      activities: [],
      retirementPlan: null,
      protectionPlan: null,
    }
    setContacts((prev) => [newContact, ...prev])
    return newContact
  }, [])

  const updateContact = useCallback((id, updates) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    )
  }, [])

  const deleteContacts = useCallback((ids) => {
    setContacts((prev) => prev.filter((c) => !ids.includes(c.id)))
  }, [])

  const addTag = useCallback((ids, tag) => {
    setContacts((prev) =>
      prev.map((c) =>
        ids.includes(c.id) && !c.tags.includes(tag)
          ? { ...c, tags: [...c.tags, tag] }
          : c
      )
    )
  }, [])

  const removeTag = useCallback((ids, tag) => {
    setContacts((prev) =>
      prev.map((c) =>
        ids.includes(c.id) ? { ...c, tags: c.tags.filter((t) => t !== tag) } : c
      )
    )
  }, [])

  const addInteraction = useCallback((contactId, interaction) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, interactions: [{ id: uid(), date: new Date().toISOString().split('T')[0], ...interaction }, ...c.interactions] }
          : c
      )
    )
  }, [])

  const addTask = useCallback((contactId, task) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, tasks: [{ id: uid(), status: 'pending', ...task }, ...c.tasks] }
          : c
      )
    )
  }, [])

  const toggleTask = useCallback((contactId, taskId) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? {
              ...c,
              tasks: c.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' }
                  : t
              ),
            }
          : c
      )
    )
  }, [])

  const addActivity = useCallback((contactId, activity) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, activities: [{ id: uid(), date: new Date().toISOString().split('T')[0], ...activity }, ...c.activities] }
          : c
      )
    )
  }, [])

  const saveRetirementPlan = useCallback((contactId, plan) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, retirementPlan: plan } : c))
    )
  }, [])

  const saveProtectionPlan = useCallback((contactId, plan) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, protectionPlan: plan } : c))
    )
  }, [])

  return (
    <ContactsContext.Provider
      value={{
        contacts,
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
