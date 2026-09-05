import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, Eye, Pencil, Trash2, X, RefreshCw, ChevronLeft, ChevronRight, LifeBuoy, Filter } from 'lucide-react'

const PAGE_SIZE = 8
const STATUSES = ['Open', 'In Progress', 'Resolved']
const PRIORITIES = ['Low', 'Medium', 'High']
const AGENTS = ['Aisha Rao', 'Kiran Patel', 'Meera Singh', 'Rohan Das', 'Support Queue']

function statusFromId(id) { return STATUSES[id % STATUSES.length] }
function priorityFromId(id) { return PRIORITIES[(id * 2) % PRIORITIES.length] }
function dateFromId(id) {
  const d = new Date(Date.now() - id * 86400000)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function fetchTickets() {
  const [postsRes, usersRes] = await Promise.all([
    fetch('https://dummyjson.com/posts?limit=60'),
    fetch('https://dummyjson.com/users?limit=60'),
  ])
  if (!postsRes.ok || !usersRes.ok) throw new Error('Unable to load support data')
  const [{ posts }, { users }] = await Promise.all([postsRes.json(), usersRes.json()])
  return posts.map((post, index) => {
    const user = users[index % users.length]
    return {
      id: post.id,
      customerName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      subject: post.title,
      description: post.body,
      priority: priorityFromId(post.id),
      status: statusFromId(post.id),
      createdDate: dateFromId(post.id),
      updatedDate: dateFromId(Math.max(1, post.id - 2)),
      assignedAgent: AGENTS[post.id % AGENTS.length],
    }
  })
}

const EMPTY_FORM = {
  customerName: '', email: '', phone: '', subject: '', description: '',
  priority: 'Medium', status: 'Open', assignedAgent: 'Support Queue',
}

function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20}/></button></div>
      {children}
    </div>
  </div>
}

function Badge({ type, value }) {
  return <span className={`badge ${type}-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>
}

function TicketForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const submit = (e) => {
    e.preventDefault()
    if (!form.customerName.trim() || !form.subject.trim() || !form.description.trim()) return
    onSave(form)
  }
  return <form className="ticket-form" onSubmit={submit}>
    <div className="form-grid">
      <label>Customer name<input value={form.customerName} onChange={(e)=>set('customerName',e.target.value)} required/></label>
      <label>Email<input type="email" value={form.email} onChange={(e)=>set('email',e.target.value)}/></label>
      <label>Phone<input value={form.phone} onChange={(e)=>set('phone',e.target.value)}/></label>
      <label>Assigned agent<select value={form.assignedAgent} onChange={(e)=>set('assignedAgent',e.target.value)}>{AGENTS.map(a=><option key={a}>{a}</option>)}</select></label>
      <label>Priority<select value={form.priority} onChange={(e)=>set('priority',e.target.value)}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></label>
      <label>Status<select value={form.status} onChange={(e)=>set('status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></label>
    </div>
    <label>Subject<input value={form.subject} onChange={(e)=>set('subject',e.target.value)} required/></label>
    <label>Description<textarea rows="5" value={form.description} onChange={(e)=>set('description',e.target.value)} required/></label>
    <div className="modal-actions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button className="primary" type="submit">Save ticket</button></div>
  </form>
}

export default function App() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [priority, setPriority] = useState('All')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    try { setTickets(await fetchTickets()) }
    catch (e) { setError(e.message || 'Something went wrong') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tickets.filter((t) => {
      const matchesQuery = !q || String(t.id).includes(q) || t.customerName.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
      const matchesStatus = status === 'All' || t.status === status
      const matchesPriority = priority === 'All' || t.priority === priority
      return matchesQuery && matchesStatus && matchesPriority
    })
  }, [tickets, query, status, priority])

  useEffect(() => { setPage(1) }, [query, status, priority])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  const createTicket = (data) => {
    const nextId = tickets.length ? Math.max(...tickets.map(t=>t.id)) + 1 : 1
    const now = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    setTickets((list) => [{ ...data, id: nextId, createdDate: now, updatedDate: now }, ...list])
    setCreating(false); setPage(1)
  }

  const updateTicket = (data) => {
    const now = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
    setTickets((list) => list.map((t) => t.id === editing.id ? { ...t, ...data, updatedDate: now } : t))
    setEditing(null)
  }

  const removeTicket = (ticket) => {
    if (window.confirm(`Delete ticket #${ticket.id}?`)) setTickets((list)=>list.filter((t)=>t.id!==ticket.id))
  }

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t=>t.status==='Open').length,
    progress: tickets.filter(t=>t.status==='In Progress').length,
    resolved: tickets.filter(t=>t.status==='Resolved').length,
  }), [tickets])

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><LifeBuoy size={22}/></div><div><strong>SupportFlow</strong><span>Customer Care</span></div></div>
      <nav><a className="active" href="#tickets"><LifeBuoy size={18}/> Tickets</a></nav>
      <div className="sidebar-foot">REST API dashboard<br/><small>Powered by DummyJSON</small></div>
    </aside>

    <main className="main">
      <header className="topbar"><div><p className="eyebrow">CUSTOMER SUPPORT</p><h1>Ticket Dashboard</h1><p>Search, filter and manage support requests from one place.</p></div><button className="primary" onClick={()=>setCreating(true)}><Plus size={18}/> New Ticket</button></header>

      <section className="stats">
        <article><span>Total tickets</span><strong>{stats.total}</strong></article>
        <article><span>Open</span><strong>{stats.open}</strong></article>
        <article><span>In progress</span><strong>{stats.progress}</strong></article>
        <article><span>Resolved</span><strong>{stats.resolved}</strong></article>
      </section>

      <section className="panel" id="tickets">
        <div className="toolbar">
          <div className="search-wrap"><Search size={18}/><input placeholder="Search by customer, subject or ticket ID" value={query} onChange={(e)=>setQuery(e.target.value)}/></div>
          <div className="filters"><Filter size={17}/><select value={status} onChange={(e)=>setStatus(e.target.value)}><option>All</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select><select value={priority} onChange={(e)=>setPriority(e.target.value)}><option>All</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select><button className="icon-btn" onClick={load} title="Refresh"><RefreshCw size={17}/></button></div>
        </div>

        {loading ? <div className="state">Loading tickets…</div> : error ? <div className="state error"><p>{error}</p><button className="secondary" onClick={load}>Try again</button></div> : <>
          <div className="table-wrap"><table><thead><tr><th>ID</th><th>Customer</th><th>Subject</th><th>Priority</th><th>Status</th><th>Created</th><th>Agent</th><th>Action</th></tr></thead><tbody>
            {visible.length ? visible.map((t)=><tr key={t.id}>
              <td className="ticket-id">#{t.id}</td><td><strong>{t.customerName}</strong><small>{t.email}</small></td><td className="subject-cell">{t.subject}</td><td><Badge type="priority" value={t.priority}/></td><td><Badge type="status" value={t.status}/></td><td>{t.createdDate}</td><td>{t.assignedAgent}</td><td><div className="actions"><button onClick={()=>setSelected(t)} title="View"><Eye size={16}/></button><button onClick={()=>setEditing(t)} title="Edit"><Pencil size={16}/></button><button className="danger" onClick={()=>removeTicket(t)} title="Delete"><Trash2 size={16}/></button></div></td>
            </tr>) : <tr><td colSpan="8"><div className="state">No tickets match your search and filters.</div></td></tr>}
          </tbody></table></div>
          <div className="pagination"><span>Showing {visible.length ? (page-1)*PAGE_SIZE+1 : 0}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</span><div><button disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={17}/></button><span>Page {page} of {pages}</span><button disabled={page===pages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={17}/></button></div></div>
        </>}
      </section>
    </main>

    {selected && <Modal title={`Ticket #${selected.id}`} onClose={()=>setSelected(null)}><div className="details"><div className="detail-grid"><div><span>Customer</span><strong>{selected.customerName}</strong></div><div><span>Assigned agent</span><strong>{selected.assignedAgent}</strong></div><div><span>Email</span><strong>{selected.email || '—'}</strong></div><div><span>Phone</span><strong>{selected.phone || '—'}</strong></div><div><span>Priority</span><Badge type="priority" value={selected.priority}/></div><div><span>Status</span><Badge type="status" value={selected.status}/></div><div><span>Created</span><strong>{selected.createdDate}</strong></div><div><span>Last updated</span><strong>{selected.updatedDate}</strong></div></div><div className="detail-section"><span>Subject</span><h3>{selected.subject}</h3></div><div className="detail-section"><span>Description</span><p>{selected.description}</p></div></div></Modal>}
    {creating && <Modal title="Create support ticket" onClose={()=>setCreating(false)}><TicketForm onSave={createTicket} onCancel={()=>setCreating(false)}/></Modal>}
    {editing && <Modal title={`Edit ticket #${editing.id}`} onClose={()=>setEditing(null)}><TicketForm initial={editing} onSave={updateTicket} onCancel={()=>setEditing(null)}/></Modal>}
  </div>
}
