import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const STORAGE_KEY = 'ledgerly-prototype-v1';

function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const initialData = {
  clients: [
    { id: 'c1', name: 'Northstar Design Studio', contact: 'Aarav Mehta', email: 'aarav@example.test', color: 'green' },
    { id: 'c2', name: 'Meera & Co. Retail', contact: 'Meera Shah', email: 'meera@example.test', color: 'lavender' },
    { id: 'c3', name: 'Juniper Foods', contact: 'Kabir Rao', email: 'kabir@example.test', color: 'peach' },
    { id: 'c4', name: 'Studio Eight Interiors', contact: 'Tara Iyer', email: 'tara@example.test', color: 'blue' }
  ],
  work: [
    { id: 'w1', title: 'Quarterly GST return', clientId: 'c2', dueDate: dateOffset(2), status: 'waiting', checklist: [{ text: 'Sales summary', status: 'verified' }, { text: 'Purchase invoices', status: 'requested' }, { text: 'Bank statement', status: 'needed' }] },
    { id: 'w2', title: 'TDS payment & return', clientId: 'c1', dueDate: dateOffset(4), status: 'in-progress', checklist: [{ text: 'Challan receipts', status: 'received' }, { text: 'Deductee details', status: 'requested' }] },
    { id: 'w3', title: 'Monthly bookkeeping', clientId: 'c3', dueDate: dateOffset(6), status: 'in-progress', checklist: [{ text: 'Purchase invoices', status: 'requested' }, { text: 'Bank statement', status: 'needed' }] },
    { id: 'w4', title: 'Annual accounts review', clientId: 'c4', dueDate: dateOffset(-2), status: 'waiting', checklist: [{ text: 'Trial balance', status: 'needed' }, { text: 'Bank statements', status: 'requested' }] },
    { id: 'w5', title: 'Invoice reconciliation', clientId: 'c1', dueDate: dateOffset(9), status: 'completed', checklist: [{ text: 'Sales and purchase invoices', status: 'verified' }, { text: 'Bank reconciliation statement', status: 'verified' }] }
  ]
};

function readData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const storedData = saved ? JSON.parse(saved) : initialData;
    return {
      ...storedData,
      work: storedData.work.map((work) => ({
        ...work,
        checklist: work.checklist.map((item) => ({
          ...item,
          status: item.status || (item.done ? 'verified' : 'needed')
        }))
      }))
    };
  } catch (error) {
    console.error('Could not load saved prototype data.', error);
    return initialData;
  }
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatDate(value) {
  if (!value) return 'No date';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function dayDifference(value) {
  const due = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}

function dateLabel(value) {
  const difference = dayDifference(value);
  if (difference === 0) return 'Today';
  if (difference === 1) return 'Tomorrow';
  if (difference === -1) return 'Yesterday';
  return formatDate(value);
}

function statusLabel(status) {
  return ({ 'in-progress': 'In progress', waiting: 'Waiting on client', completed: 'Completed' })[status] || status;
}

function documentStatusLabel(status) {
  return ({ needed: 'Not requested', requested: 'Requested', received: 'Received · review needed', verified: 'Verified' })[status] || 'Not requested';
}

function verifiedCount(work) {
  return work.checklist.filter((item) => (item.status || (item.done ? 'verified' : 'needed')) === 'verified').length;
}

function Avatar({ client, dark = false }) {
  return <span className={`avatar ${dark ? 'avatar-dark' : `avatar-${client?.color || 'green'}`}`}>{initials(client?.name || '')}</span>;
}

function Status({ status }) {
  return <span className={`status-pill status-${status}`}>{statusLabel(status)}</span>;
}

function WorkTable({ rows, onOpen, includeChecklist = false }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>WORK ITEM</th><th>CLIENT</th><th>DUE DATE</th>{includeChecklist && <th>CHECKLIST</th>}<th>STATUS</th><th /></tr></thead>
        <tbody>
          {rows.map((work) => {
            const client = work.client;
            const days = dayDifference(work.dueDate);
            return (
              <tr key={work.id}>
                <td><div className="work-title">{work.title}</div><div className="work-subtitle">{includeChecklist ? `${work.checklist.length} supporting items` : `${verifiedCount(work)} of ${work.checklist.length} items verified`}</div></td>
                <td><div className="client-cell"><Avatar client={client} /><span>{client?.name || 'Unknown client'}</span></div></td>
                <td className={work.status !== 'completed' && days < 0 ? 'due-late' : work.status !== 'completed' && days <= 3 ? 'due-soon' : 'due-normal'}>{dateLabel(work.dueDate)}</td>
                {includeChecklist && <td>{verifiedCount(work)} / {work.checklist.length} verified</td>}
                <td><Status status={work.status} /></td>
                <td><button className="row-menu" onClick={() => onOpen(work.id)} aria-label={`Open ${work.title}`}>···</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({ icon, title, children, button, onClick }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><strong>{title}</strong><span>{children}</span>{button && <button className="button button-secondary" onClick={onClick}>{button}</button>}</div>;
}

function App() {
  const [data, setData] = useState(readData);
  const [page, setPage] = useState('overview');
  const [filter, setFilter] = useState('all');
  const [workSearch, setWorkSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [toast, setToast] = useState('');
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState('');
  const [newSupportingItem, setNewSupportingItem] = useState('');
  const workDialog = useRef(null);
  const clientDialog = useRef(null);
  const detailDialog = useRef(null);
  const workForm = useRef(null);
  const clientForm = useRef(null);
  const toastTimer = useRef(null);

  const clientsById = useMemo(() => new Map(data.clients.map((client) => [client.id, client])), [data.clients]);
  const activeWork = data.work.filter((work) => work.status !== 'completed');
  const dueSoon = activeWork.filter((work) => dayDifference(work.dueDate) >= 0 && dayDifference(work.dueDate) <= 7);
  const overdue = activeWork.filter((work) => dayDifference(work.dueDate) < 0);
  const sortedByPriority = (workItems) => [...workItems].sort((a, b) => {
    const aScore = a.status === 'completed' ? 10000 : dayDifference(a.dueDate);
    const bScore = b.status === 'completed' ? 10000 : dayDifference(b.dueDate);
    return aScore - bScore;
  });
  const priorityRows = sortedByPriority(activeWork).slice(0, 4).map((work) => ({ ...work, client: clientsById.get(work.clientId) }));
  const filteredWork = sortedByPriority(data.work
    .filter((work) => filter === 'all' || work.status === filter)
    .filter((work) => `${work.title} ${clientsById.get(work.clientId)?.name || ''}`.toLowerCase().includes(workSearch.trim().toLowerCase())))
    .map((work) => ({ ...work, client: clientsById.get(work.clientId) }));
  const filteredClients = data.clients.filter((client) => `${client.name} ${client.contact} ${client.email}`.toLowerCase().includes(clientSearch.trim().toLowerCase()));
  const selectedWork = data.work.find((work) => work.id === selectedWorkId);
  const selectedClient = selectedWork ? clientsById.get(selectedWork.clientId) : null;
  const selectedVerifiedCount = selectedWork ? verifiedCount(selectedWork) : 0;
  const documentsToRequest = selectedWork?.checklist.filter((item) => !['received', 'verified'].includes(item.status || (item.done ? 'verified' : 'needed'))) || [];
  const filingReady = Boolean(selectedWork?.checklist.length) && selectedVerifiedCount === selectedWork.checklist.length;
  const receivedForReview = activeWork.reduce((total, work) => total + work.checklist.filter((item) => (item.status || (item.done ? 'verified' : 'needed')) === 'received').length, 0);

  useEffect(() => {
    if (selectedWorkId && detailDialog.current && !detailDialog.current.open) {
      detailDialog.current.showModal();
    }
  }, [selectedWorkId]);

  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }

  function persist(nextData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
      setData(nextData);
    } catch (error) {
      console.error('Could not save prototype data in this browser.', error);
      notify('Could not save changes in this browser.');
    }
  }

  function openWorkDialog(clientId = '') {
    if (!data.clients.length) {
      notify('Add a client before creating a work item.');
      setPage('clients');
      return;
    }
    if (workForm.current) {
      workForm.current.elements.clientId.value = clientId || data.clients[0]?.id || '';
      workForm.current.elements.dueDate.value = dateOffset(7);
    }
    workDialog.current.showModal();
  }

  function openWorkDetails(workId) {
    setFollowUpOpen(false);
    setSelectedWorkId(workId);
  }

  function createFollowUpDraft() {
    if (!selectedWork || !selectedClient) return;
    const requestedList = documentsToRequest.map((item) => `• ${item.text}`).join('\n');
    setFollowUpDraft(`Hi ${selectedClient.contact || selectedClient.name},\n\nWe’re preparing your ${selectedWork.title}, due ${formatDate(selectedWork.dueDate)}. Could you please share the following items?\n\n${requestedList}\n\nPlease let us know if you need any help. Thank you!`);
    setFollowUpOpen(true);
  }

  async function copyFollowUpDraft() {
    try {
      await navigator.clipboard.writeText(followUpDraft);
      notify('Copied. Paste this into your usual email or messaging app.');
    } catch (error) {
      console.error('Could not copy the follow-up message.', error);
      notify('Clipboard access failed. Select and copy the message manually.');
    }
  }

  function recordFollowUp() {
    updateWork((work) => ({ ...work, lastFollowUpAt: new Date().toISOString() }), 'Follow-up recorded.');
  }

  function addSupportingItem(event) {
    event.preventDefault();
    const text = newSupportingItem.trim();
    if (!text) return;
    updateWork((work) => ({ ...work, checklist: [...work.checklist, { text, status: 'needed', done: false }] }), 'Supporting item added.');
    setNewSupportingItem('');
  }

  function createWork(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const checklist = String(form.get('checklist') || '').split(',').map((text) => text.trim()).filter(Boolean).map((text) => ({ text, done: false }));
    const nextData = { ...data, work: [...data.work, {
      id: crypto.randomUUID(),
      title: String(form.get('title')).trim(),
      clientId: String(form.get('clientId')),
      dueDate: String(form.get('dueDate')),
      status: String(form.get('status')),
      checklist: checklist.map((item) => ({ ...item, status: 'needed' }))
    }] };
    persist(nextData);
    workDialog.current.close();
    event.currentTarget.reset();
    notify('Work item created.');
  }

  function createClient(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name')).trim();
    const nextData = { ...data, clients: [...data.clients, {
      id: crypto.randomUUID(),
      name,
      contact: String(form.get('contact')).trim(),
      email: String(form.get('email')).trim(),
      color: ['green', 'lavender', 'peach', 'blue'][data.clients.length % 4]
    }] };
    persist(nextData);
    clientDialog.current.close();
    event.currentTarget.reset();
    notify('Client added.');
  }

  function updateWork(transform, message) {
    persist({ ...data, work: data.work.map((work) => work.id === selectedWorkId ? transform(work) : work) });
    notify(message);
  }

  function closeDetails() {
    detailDialog.current.close();
    setSelectedWorkId(null);
  }

  function renderClientRow(client) {
    const items = data.work.filter((work) => work.clientId === client.id && work.status !== 'completed');
    const next = [...items].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    return (
      <tr key={client.id}>
        <td><div className="client-cell"><Avatar client={client} /><div><div className="work-title">{client.name}</div><div className="work-subtitle">Added to practice</div></div></div></td>
        <td>{client.contact || '—'}<div className="work-subtitle">{client.email}</div></td>
        <td>{items.length} {items.length === 1 ? 'active item' : 'active items'}</td>
        <td>{next ? <><span className={dayDifference(next.dueDate) < 0 ? 'due-late' : 'due-normal'}>{dateLabel(next.dueDate)}</span><div className="work-subtitle">{next.title}</div></> : '—'}</td>
        <td><button className="row-menu" onClick={() => openWorkDialog(client.id)} aria-label={`Create work for ${client.name}`}>+</button></td>
      </tr>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Ledgerly home"><span className="brand-mark">L</span><span>ledgerly<span className="brand-period">.</span></span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {[['overview', '◫', 'Overview'], ['work', '▤', 'Work items'], ['clients', '♧', 'Clients']].map(([key, icon, label]) => (
            <button key={key} className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => setPage(key)} aria-label={label} title={label}>
              <span className="nav-icon">{icon}</span>{label}{key === 'work' && <span className="nav-count">{activeWork.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card"><span className="demo-dot" /><div><strong>Prototype workspace</strong><small>Data stays in this browser</small></div></div>
          <div className="profile"><Avatar client={{ name: 'Riya Kapoor' }} dark /><div className="profile-copy"><strong>Riya Kapoor</strong><small>Practice admin</small></div><span className="profile-menu">···</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{({ overview: 'Overview', work: 'Work items', clients: 'Clients' })[page]}</strong></div>
          <div className="topbar-right"><span className="today-label">{new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</span><button className="icon-button" onClick={() => notify('Prototype data is saved only in this browser. Please use fictional details.')} aria-label="About this prototype">?</button></div>
        </header>

        {noticeVisible && <section className="prototype-notice" aria-label="Prototype notice"><span className="notice-icon">i</span><span><strong>Prototype:</strong> Use fictional information only. This browser-only demo is not for storing real client or financial data.</span><button className="notice-close" onClick={() => setNoticeVisible(false)} aria-label="Dismiss notice">×</button></section>}

        {page === 'overview' && <section className="page-section">
          <div className="page-heading"><div><p className="eyebrow">YOUR PRACTICE AT A GLANCE</p><h1>Good morning, Riya <span className="wave">✳</span></h1><p className="subheading">Here’s what needs your attention today.</p></div><button className="button button-primary" onClick={() => openWorkDialog()}><span className="plus">+</span> New work item</button></div>
          <div className="metric-grid">
            {[['Active work', activeWork.length, 'Across all clients', '▤', 'purple'], ['Due this week', dueSoon.length, 'Coming up soon', '◷', 'orange'], ['Documents to review', receivedForReview, 'Received from clients', '✓', 'blue'], ['Overdue', overdue.length, 'Needs a follow-up', '!', 'red']].map(([label, value, note, icon, color]) => <article className="metric-card" key={label}><div className="metric-label">{label}<span className={`metric-icon icon-${color}`}>{icon}</span></div><div className="metric-value">{value}</div><div className="metric-foot"><span className="metric-neutral">{note}</span></div></article>)}
          </div>
          <section className="panel readiness-panel">
            <div className="panel-heading"><div><h2>Filing readiness</h2><p>See which client files are blocked on missing or unreviewed information.</p></div><span className="readiness-total">{activeWork.reduce((total, work) => total + work.checklist.filter((item) => (item.status || (item.done ? 'verified' : 'needed')) !== 'verified').length, 0)} items need attention</span></div>
            {activeWork.length ? <div className="readiness-list">{sortedByPriority(activeWork).slice(0, 3).map((work) => {
              const verified = verifiedCount(work);
              const total = work.checklist.length;
              const ready = total > 0 && verified === total;
              return <div className="readiness-row" key={work.id}>
                <div className="readiness-work"><strong>{work.title}</strong><small>{clientsById.get(work.clientId)?.name || 'Unknown client'} · Due {dateLabel(work.dueDate)}</small></div>
                <div className="readiness-progress"><div className="progress-track"><span style={{ width: `${total ? verified / total * 100 : 0}%` }} /></div><small>{total ? `${verified} of ${total} verified` : 'No supporting items added'}</small></div>
                <span className={`readiness-badge ${ready ? 'ready' : 'blocked'}`}>{ready ? 'Ready to file' : 'Blocked'}</span>
                <button className="text-button readiness-open" onClick={() => openWorkDetails(work.id)}>Review file →</button>
              </div>;
            })}</div> : <EmptyState icon="✓" title="No active files" >Create client work to start tracking filing readiness.</EmptyState>}
          </section>
          <div className="overview-grid">
            <section className="panel work-panel"><div className="panel-heading"><div><h2>Priority work</h2><p>Upcoming deadlines and items to follow up</p></div><button className="text-button" onClick={() => setPage('work')}>View all <span>→</span></button></div>
              {priorityRows.length ? <WorkTable rows={priorityRows} onOpen={openWorkDetails} /> : <EmptyState icon="✓" title="All clear for now" button="Create work item" onClick={() => openWorkDialog()}>Add a work item to keep deadlines and follow-ups in one place.</EmptyState>}
            </section>
            <aside className="panel side-panel"><div className="panel-heading"><div><h2>Client snapshot</h2><p>Your recently active clients</p></div></div>
              <div className="client-list">{[...data.clients].sort((a, b) => activeWork.filter((work) => work.clientId === b.id).length - activeWork.filter((work) => work.clientId === a.id).length).slice(0, 4).map((client) => {
                const count = activeWork.filter((work) => work.clientId === client.id).length;
                return <div className="client-snapshot" key={client.id}><Avatar client={client} /><div className="snapshot-copy"><strong>{client.name}</strong><small>{client.contact || 'No contact added'}</small></div><span className="snapshot-work">{count} {count === 1 ? 'item' : 'items'}</span></div>;
              })}</div>
              <button className="outline-button full-width" onClick={() => setPage('clients')}>Manage clients <span>→</span></button>
            </aside>
          </div>
        </section>}

        {page === 'work' && <section className="page-section">
          <div className="page-heading"><div><p className="eyebrow">KEEP EVERY DEADLINE VISIBLE</p><h1>Work items</h1><p className="subheading">Track client requests, due dates, and progress.</p></div><button className="button button-primary" onClick={() => openWorkDialog()}><span className="plus">+</span> New work item</button></div>
          <section className="panel list-panel"><div className="list-toolbar"><div className="filter-tabs" role="tablist" aria-label="Filter work items">{[['all', `All ${data.work.length}`], ['in-progress', 'In progress'], ['waiting', 'Waiting on client'], ['completed', 'Completed']].map(([key, label]) => <button key={key} className={`filter-tab ${filter === key ? 'selected' : ''}`} onClick={() => setFilter(key)}>{label}</button>)}</div><label className="search-box"><span>⌕</span><input value={workSearch} onChange={(event) => setWorkSearch(event.target.value)} type="search" placeholder="Search work..." aria-label="Search work items" /></label></div>
            {filteredWork.length ? <WorkTable rows={filteredWork} onOpen={openWorkDetails} includeChecklist /> : <EmptyState icon="▤" title="No work items found" button="Create work item" onClick={() => openWorkDialog()}>Try another search or create a new work item.</EmptyState>}
          </section>
        </section>}

        {page === 'clients' && <section className="page-section">
          <div className="page-heading"><div><p className="eyebrow">PEOPLE YOU WORK WITH</p><h1>Clients</h1><p className="subheading">A simple directory for your practice workflow.</p></div><button className="button button-primary" onClick={() => clientDialog.current.showModal()}><span className="plus">+</span> Add client</button></div>
          <section className="panel list-panel"><div className="list-toolbar client-toolbar"><div><h2>All clients <span className="count-pill">{data.clients.length}</span></h2></div><label className="search-box"><span>⌕</span><input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} type="search" placeholder="Search clients..." aria-label="Search clients" /></label></div>
            {filteredClients.length ? <div className="table-wrap"><table><thead><tr><th>CLIENT</th><th>CONTACT</th><th>ACTIVE WORK</th><th>NEXT DEADLINE</th><th /></tr></thead><tbody>{filteredClients.map(renderClientRow)}</tbody></table></div> : <EmptyState icon="♧" title="No clients found" button="Add client" onClick={() => clientDialog.current.showModal()}>Add a client to start organizing practice work.</EmptyState>}
          </section>
        </section>}
      </main>

      <dialog ref={workDialog} className="app-dialog">
        <form ref={workForm} onSubmit={createWork}>
          <div className="dialog-heading"><div><p className="eyebrow">PRACTICE WORKFLOW</p><h2>New work item</h2></div><button type="button" className="dialog-close" onClick={() => workDialog.current.close()} aria-label="Close">×</button></div>
          <label className="form-field">Work item name<input name="title" required maxLength="90" placeholder="e.g. Quarterly GST return" /></label>
          <div className="form-row"><label className="form-field">Client<select name="clientId" defaultValue={data.clients[0]?.id} required>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label className="form-field">Due date<input name="dueDate" type="date" defaultValue={dateOffset(7)} required /></label></div>
          <label className="form-field">Supporting documents & information <span className="field-hint">Optional · separate items with commas</span><textarea name="checklist" rows="3" placeholder="Sales summary, purchase invoices, bank statement" /></label>
          <label className="form-field">Status<select name="status" defaultValue="in-progress"><option value="in-progress">In progress</option><option value="waiting">Waiting on client</option></select></label>
          <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => workDialog.current.close()}>Cancel</button><button type="submit" className="button button-primary">Create work item</button></div>
        </form>
      </dialog>

      <dialog ref={clientDialog} className="app-dialog">
        <form ref={clientForm} onSubmit={createClient}>
          <div className="dialog-heading"><div><p className="eyebrow">CLIENT DIRECTORY</p><h2>Add a client</h2></div><button type="button" className="dialog-close" onClick={() => clientDialog.current.close()} aria-label="Close">×</button></div>
          <label className="form-field">Client or business name<input name="name" required maxLength="90" placeholder="e.g. Northstar Design Studio" /></label>
          <div className="form-row"><label className="form-field">Contact name<input name="contact" maxLength="70" placeholder="e.g. Aarav Mehta" /></label><label className="form-field">Email<input name="email" type="email" maxLength="120" placeholder="name@example.com" /></label></div>
          <p className="form-note">Prototype only: do not enter real client contact or financial information.</p>
          <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => clientDialog.current.close()}>Cancel</button><button type="submit" className="button button-primary">Add client</button></div>
        </form>
      </dialog>

      <dialog ref={detailDialog} className="app-dialog detail-dialog" onClose={() => { setSelectedWorkId(null); setFollowUpOpen(false); setNewSupportingItem(''); }}>
        {selectedWork && <div>
          <div className="dialog-heading"><div><p className="eyebrow">CLIENT FILE</p><h2 className="detail-title">{selectedWork.title}</h2><span className="detail-meta">{selectedClient?.name || 'Unknown client'} · Due {formatDate(selectedWork.dueDate)}</span></div><button className="dialog-close" onClick={closeDetails} aria-label="Close">×</button></div>
          <section className={`readiness-summary ${filingReady ? 'is-ready' : 'is-blocked'}`}>
            <div className="readiness-summary-heading"><div><span className="detail-section-title">FILING READINESS</span><strong>{filingReady ? 'Ready for filing review' : 'File is not ready yet'}</strong></div><span className={`readiness-badge ${filingReady ? 'ready' : 'blocked'}`}>{filingReady ? 'Ready' : `${selectedWork.checklist.length - selectedVerifiedCount} open`}</span></div>
            <div className="progress-track"><span style={{ width: `${selectedWork.checklist.length ? selectedVerifiedCount / selectedWork.checklist.length * 100 : 0}%` }} /></div>
            <p>{filingReady ? 'All supporting items have been verified. This file is ready for filing review.' : selectedWork.checklist.length ? `${selectedWork.checklist.filter((item) => (item.status || (item.done ? 'verified' : 'needed')) === 'received').length} received item(s) still need review; ${selectedWork.checklist.length - selectedVerifiedCount} item(s) are not verified.` : 'Add supporting documents and information to assess filing readiness.'}</p>
          </section>
          <div className="detail-section-title">Supporting documents & information</div>
          <p className="detail-help">Track each item from request through review. Only verified items count toward readiness.</p>
          <form className="add-document-form" onSubmit={addSupportingItem}><input aria-label="New supporting item" value={newSupportingItem} onChange={(event) => setNewSupportingItem(event.target.value)} maxLength="120" placeholder="Add a document or client detail..." /><button className="button button-secondary" type="submit">Add item</button></form>
          <div className="document-list">{selectedWork.checklist.length ? selectedWork.checklist.map((item, index) => {
            const itemStatus = item.status || (item.done ? 'verified' : 'needed');
            return <div className="document-row" key={`${item.text}-${index}`}><div className="document-name"><span className={`document-state state-${itemStatus}`}>{itemStatus === 'verified' ? '✓' : itemStatus === 'received' ? '↓' : itemStatus === 'requested' ? '↗' : '·'}</span><span>{item.text}</span></div><select aria-label={`Status for ${item.text}`} value={itemStatus} onChange={(event) => updateWork((work) => ({ ...work, checklist: work.checklist.map((check, checkIndex) => checkIndex === index ? { ...check, status: event.target.value, done: event.target.value === 'verified' } : check) }), 'Document status updated.')}><option value="needed">Not requested</option><option value="requested">Requested</option><option value="received">Received · review needed</option><option value="verified">Verified</option></select></div>;
          }) : <p className="detail-meta">No supporting items listed for this work.</p>}</div>
          <section className="follow-up-panel">
            <div className="follow-up-heading"><div><strong>Client follow-up</strong><small>{selectedWork.lastFollowUpAt ? `Last recorded ${formatDate(selectedWork.lastFollowUpAt.slice(0, 10))}` : 'No follow-up recorded yet'}</small></div><button className="button button-secondary" disabled={!documentsToRequest.length} onClick={createFollowUpDraft}>Prepare request</button></div>
            {!documentsToRequest.length && <p className="follow-up-hint">No outstanding client items to request. Review any received documents above.</p>}
            {followUpOpen && <div className="follow-up-draft"><p className="follow-up-hint">Draft only — this will not be sent. Copy it into your usual email or messaging app.</p><textarea aria-label="Client follow-up message" value={followUpDraft} onChange={(event) => setFollowUpDraft(event.target.value)} rows="7" /><div className="follow-up-actions"><button className="button button-secondary" onClick={copyFollowUpDraft}>Copy message</button><button className="button button-primary" onClick={() => { recordFollowUp(); setFollowUpOpen(false); }}>Record as sent</button></div></div>}
          </section>
          <div className="detail-footer"><div>{selectedWork.status !== 'completed' && !filingReady && <p className="completion-hint">Verify every supporting item before marking this file complete.</p>}<button className="button button-secondary" disabled={selectedWork.status !== 'completed' && !filingReady} onClick={() => { const completed = selectedWork.status !== 'completed'; updateWork((work) => ({ ...work, status: completed ? 'completed' : 'in-progress' }), completed ? 'Work item completed.' : 'Work item reopened.'); closeDetails(); }}>{selectedWork.status === 'completed' ? 'Reopen item' : 'Mark complete'}</button></div><button className="button button-secondary" onClick={() => { persist({ ...data, work: data.work.filter((work) => work.id !== selectedWorkId) }); closeDetails(); notify('Work item deleted.'); }}>Delete item</button></div>
        </div>}
      </dialog>

      <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
