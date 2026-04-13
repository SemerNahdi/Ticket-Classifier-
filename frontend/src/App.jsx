import React, { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Bell, 
  Settings, 
  Search, 
  Filter, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// --- Mock Data ---
const TICKETS = [
  { id: 'T001', title: 'ML model performance degradation in production', desc: 'The recommendation engine ML model is showing decreased accuracy (from...', category: 'Machine Learning', priority: 'P1', confidence: 95, agent: 'Sophie Martin', time: '1h 54m', status: 'In Progress' },
  { id: 'T002', title: 'Access request for Azure ML workspace', desc: 'New data scientist needs contributor access to the production ML workspac...', category: 'Cloud Infrastructure', priority: 'P3', confidence: 58, agent: 'Marc Lefebvre', time: '23h 58m', status: 'Assigned' },
  { id: 'T003', title: 'Power BI dashboard slow performance', desc: 'Users reporting 30+ second load times for the executive dashboard. Previousl...', category: 'Business Intelligence', priority: 'P3', confidence: 72, agent: 'Antoine Rousseau', time: '11h 58m', status: 'New' },
  { id: 'T004', title: 'Customer churn prediction model retraining', desc: 'Quarterly model refresh needed with updated customer behavior data from...', category: 'Machine Learning', priority: 'P3', confidence: 81, agent: 'Marc Lefebvre', time: '23h 58m', status: 'Assigned' },
  { id: 'T005', title: 'Cloud storage cost anomaly detected', desc: 'The nightly ETL job for retail sales data has spiked in cost significantly...', category: 'Machine Learning', priority: 'P4', confidence: 65, agent: 'Sophie Martin', time: '1h 54m', status: 'New' },
  { id: 'T006', title: 'Data pipeline ETL job failing for retail analytics', desc: 'The nightly ETL job for retail sales data is failing due to schema mish...', category: 'Data Engineering', priority: 'P2', confidence: 88, agent: 'Sophie Martin', time: '1h 54m', status: 'In Progress' }
]

const AGENTS = [
  { name: 'Sophie Martin', email: 's.martin@lvmh.com', status: 'Busy', active: 4, resolved: 2, skills: ['Machine Learning', 'Python', 'TensorFlow', 'Model Optimization'], workload: 80 },
  { name: 'Marc Lefebvre', email: 'm.lefebvre@lvmh.com', status: 'Available', active: 2, resolved: 5, skills: ['Data Engineering', 'SQL', 'Apache Spark', 'ETL Pipelines'], workload: 40 },
  { name: 'Antoine Rousseau', email: 'a.rousseau@lvmh.com', status: 'Available', active: 2, resolved: 5, skills: ['Power BI', 'DAX', 'Data Modeling', 'Business Analysis'], workload: 35 },
  { name: 'Camille Dubois', email: 'c.dubois@lvmh.com', status: 'Offline', active: 0, resolved: 12, skills: ['Security', 'Cloud Compliance', 'Audit', 'Governance'], workload: 0 }
]

function App() {
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [classifiedTickets, setClassifiedTickets] = useState([])
  const [isClassifying, setIsClassifying] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const response = await fetch('http://localhost:8000/tickets')
      const data = await response.json()
      const formatted = data.map(result => ({
        id: result.numero,
        title: result.reasoning.split('.')[0] || 'Processed Ticket',
        desc: result.reasoning,
        category: result.categorie,
        priority: result.priorite_calculee.split(' - ')[0] || 'P4',
        confidence: Math.round(result.confidence * 100),
        agent: 'AI System',
        time: 'Processed',
        status: 'New',
        fullData: result
      }))
      setClassifiedTickets(formatted.length > 0 ? formatted : TICKETS)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      setClassifiedTickets(TICKETS)
    }
  }

  const handleClassify = async (ticketData) => {
    setIsClassifying(true)
    setLastResult(null)
    try {
      const response = await fetch('http://localhost:8000/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData)
      })
      const result = await response.json()
      setLastResult(result)
      
      const newTicket = {
        id: result.numero || `T${Date.now()}`,
        title: ticketData.breve_description,
        desc: result.reasoning || ticketData.description || '',
        category: result.categorie,
        priority: result.priorite_calculee.split(' - ')[0] || 'P4',
        confidence: Math.round(result.confidence * 100),
        agent: 'AI System',
        time: 'Just now',
        status: 'New',
        fullData: result
      }
      
      setClassifiedTickets([newTicket, ...classifiedTickets])
    } catch (error) {
      console.error('Classification failed:', error)
      alert('Internal AI error. Please check if the backend is running.')
    } finally {
      setIsClassifying(false)
    }
  }
  
  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-box">AI</div>
          <span className="logo-text">LVMH Dispatch</span>
        </div>
        
        <nav className="nav-menu">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'Dashboard'} 
            onClick={() => setActiveTab('Dashboard')}
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Agents" 
            active={activeTab === 'Agents'} 
            onClick={() => setActiveTab('Agents')}
          />
          <NavItem 
            icon={<Clock size={20} />} 
            label="SLA Monitor" 
            active={activeTab === 'SLA Monitor'} 
            onClick={() => setActiveTab('SLA Monitor')}
          />
          <NavItem 
            icon={<Bell size={20} />} 
            label="Notifications" 
            active={activeTab === 'Notifications'} 
            onClick={() => setActiveTab('Notifications')}
          />
        </nav>
        
        <div className="nav-footer">
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'Settings'} 
            onClick={() => setActiveTab('Settings')}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          {activeTab === 'Dashboard' && (
            <DashboardView 
              key="dashboard" 
              tickets={classifiedTickets} 
              onOpenModal={() => { setIsModalOpen(true); setLastResult(null); }} 
              onTicketClick={setSelectedTicket}
            />
          )}
          {activeTab === 'Agents' && <AgentsView key="agents" />}
          {activeTab === 'SLA Monitor' && <SLAMonitorView key="sla" tickets={classifiedTickets} />}
        </AnimatePresence>
      </main>

      {isModalOpen && (
        <ClassificationModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleClassify}
          isClassifying={isClassifying}
          result={lastResult}
        />
      )}

      {selectedTicket && (
        <TicketDetailsModal 
          ticket={selectedTicket} 
          onClose={() => setSelectedTicket(null)} 
        />
      )}
    </div>
  )
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </div>
  )
}

function DashboardView({ tickets, onOpenModal, onTicketClick }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="header">
        <div className="header-title">
          <h1>AI Dispatch Dashboard</h1>
          <p>Real-time ticket management powered by CrewAI</p>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} color="#94a3b8" />
            <input type="text" placeholder="Search tickets..." />
          </div>
          <button 
            className="glass" 
            onClick={onOpenModal}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              cursor: 'pointer', 
              border: 'none',
              backgroundColor: '#f6c026',
              color: '#000',
              fontWeight: 600
            }}
          >
             + New Ticket
          </button>
          <button className="glass" style={{ padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', border: '1px solid #e2e8f0' }}>
            <Filter size={18} /> Filters
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="SLA Compliance" value="100%" trend="+2.5%" icon={<CheckCircle2 size={16} color="#10b981" />} />
        <StatCard label="Avg Resolution Time" value="4.2h" trend="-8%" icon={<Clock size={16} color="#f97316" />} />
        <StatCard label="Active Tickets" value={tickets.length} trend="+12%" icon={<AlertCircle size={16} color="#3b82f6" />} />
        <StatCard label="Avg Workload per Agent" value={(tickets.length / 4).toFixed(1)} icon={<Users size={16} color="#636e72" />} />
      </div>

      <div className="kanban-board">
        <KanbanColumn title="New" count={tickets.filter(t => t.status === 'New').length} tickets={tickets.filter(t => t.status === 'New')} onTicketClick={onTicketClick} />
        <KanbanColumn title="Assigned" count={tickets.filter(t => t.status === 'Assigned').length} tickets={tickets.filter(t => t.status === 'Assigned')} onTicketClick={onTicketClick} />
        <KanbanColumn title="In Progress" count={tickets.filter(t => t.status === 'In Progress').length} tickets={tickets.filter(t => t.status === 'In Progress')} onTicketClick={onTicketClick} />
      </div>
    </motion.div>
  )
}

function StatCard({ label, value, trend, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-label">
        {label} {trend && <span className={`stat-trend ${trend.startsWith('+') ? 'trend-up' : 'trend-down'}`}>{trend}</span>}
      </div>
      <div className="stat-value">
        {value}
      </div>
    </div>
  )
}

function KanbanColumn({ title, count, tickets, onTicketClick }) {
  return (
    <div className="kanban-column">
      <div className="column-header">
        <span className="column-title">{title}</span>
        <span className="column-count">{count}</span>
      </div>
      {tickets.map(ticket => (
        <TicketCard key={ticket.id} {...ticket} onClick={() => onTicketClick(ticket)} />
      ))}
    </div>
  )
}

function TicketCard({ id, title, desc, category, priority, confidence, agent, time, onClick }) {
  return (
    <div className="ticket-card" onClick={onClick}>
      <div className="ticket-tags">
        <span className={`tag-priority tag-${priority.toLowerCase()}`}>{priority}</span>
        <span className="tag-category">{category}</span>
        <span className="ticket-confidence">
           <TrendingUp size={12} /> {confidence}%
        </span>
      </div>
      <h3 className="ticket-title">{title}</h3>
      <p className="ticket-desc">{desc}</p>
      <div className="ticket-footer">
        <div className="ticket-agent">
          <div className="agent-avatar"></div>
          {agent}
        </div>
        <div className="ticket-time">
          <Clock size={12} /> {time}
        </div>
      </div>
    </div>
  )
}

function AgentsView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="header">
        <div className="header-title">
          <h1>Agent Profiles</h1>
          <p>Team performance and skill distribution</p>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} color="#94a3b8" />
            <input type="text" placeholder="Search agents..." />
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Available Agents" value="4/6" />
        <StatCard label="Avg SLA Compliance" value="95%" />
        <StatCard label="Total Skills" value="30" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {AGENTS.map(agent => (
          <div key={agent.name} className="stat-card" style={{ gap: '16px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                    <Users size={24} color="#94a3b8" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{agent.name}</h3>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>{agent.email}</p>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: agent.status === 'Busy' ? '#fff7ed' : '#f0fdf4', color: agent.status === 'Busy' ? '#c2410c' : '#15803d' }}>
                  {agent.status}
                </span>
             </div>
             
             <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>Workload</span>
                  <span style={{ fontWeight: 600 }}>{agent.active} active</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${agent.workload}%`, height: '100%', background: '#10b981' }}></div>
                </div>
             </div>

             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {agent.skills.map(skill => (
                  <span key={skill} style={{ fontSize: '11px', background: '#f8fafc', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{skill}</span>
                ))}
             </div>

             <div style={{ display: 'flex', borderTop: '1px solid #f1f5f9', paddingTop: '16px', gap: '24px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={12} /> Active
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{agent.active}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Resolved
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>{agent.resolved}</div>
                </div>
             </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function SLAMonitorView({ tickets }) {
  const warningTickets = tickets.filter(t => t.priority === 'P1').slice(0, 1)
  const healthyTickets = tickets.filter(t => t.priority !== 'P1')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="header">
        <div className="header-title">
          <h1>SLA Monitoring</h1>
          <p>Track service level agreement compliance</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Breached" value="0" icon={<AlertCircle size={16} color="#ef4444" />} />
        <StatCard label="Critical (<1h)" value="0" icon={<Clock size={16} color="#f97316" />} />
        <StatCard label="Warning (<4h)" value={warningTickets.length} icon={<Clock size={16} color="#fbbf24" />} />
        <StatCard label="Compliance" value="100%" icon={<CheckCircle2 size={16} color="#10b981" />} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {warningTickets.length > 0 && (
          <>
            <h2 style={{ fontSize: '14px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} /> Warning - Less than 4 hours ({warningTickets.length})
            </h2>
            {warningTickets.map(t => (
              <div key={t.id} className="ticket-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{t.priority}</div>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>#{t.id}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Assigned to: {t.agent}</div>
                </div>
                <div style={{ background: '#fff7ed', color: '#c2410c', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{t.time}</div>
              </div>
            ))}
          </>
        )}

        <h2 style={{ fontSize: '14px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
          <CheckCircle2 size={16} /> Healthy - 4+ hours ({healthyTickets.length})
        </h2>
        {healthyTickets.map(t => (
          <div key={t.id} className="ticket-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: t.priority === 'P1' ? '#ef4444' : t.priority === 'P2' ? '#f97316' : '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{t.priority}</div>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>#{t.id}</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.title}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>Assigned to: {t.agent}</div>
            </div>
            <div style={{ background: '#f0fdf4', color: '#15803d', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{t.time}</div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function ClassificationModal({ onClose, onSubmit, isClassifying, result }) {
  const [formData, setFormData] = useState({
    numero: `INC${Math.floor(Math.random() * 100000)}`,
    breve_description: '',
    description: '',
    entreprise: 'LVMH'
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '550px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>AI Ticket Classification</h2>
          {result && <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={14}/> Analysis Complete</span>}
        </div>

        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Short Description</label>
              <input 
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                placeholder="e.g. Cannot access Power BI dashboard"
                value={formData.breve_description}
                onChange={e => setFormData({ ...formData, breve_description: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Full Description</label>
              <textarea 
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '100px' }}
                placeholder="Provide more context..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button 
                onClick={onClose}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                disabled={isClassifying || !formData.breve_description}
                onClick={() => onSubmit(formData)}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: isClassifying ? '#94a3b8' : '#f6c026', 
                  color: '#000', 
                  fontWeight: 600, 
                  cursor: isClassifying ? 'not-allowed' : 'pointer' 
                }}
              >
                {isClassifying ? 'Analyzing with CrewAI...' : 'Classify with CrewAI'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Category</div>
                    <div style={{ fontWeight: 600 }}>{result.categorie}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Priority</div>
                    <div style={{ fontWeight: 600, color: '#ef4444' }}>{result.priorite_calculee}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Confidence</div>
                    <div style={{ fontWeight: 600, color: '#f6c026' }}>{Math.round(result.confidence * 100)}%</div>
                  </div>
                </div>
                <div>
                   <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>AI Reasoning</div>
                   <div style={{ fontSize: '13px', lineHeight: 1.5 }}>{result.reasoning}</div>
                </div>
             </div>
             <button 
                onClick={onClose}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#000', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Finish & Add to Dashboard
              </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function TicketDetailsModal({ ticket, onClose }) {
  const result = ticket.fullData;
  if (!result) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '600px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>{result.numero}</span>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{ticket.title}</h2>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><Settings size={20}/></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <DetailGroup label="Category" value={result.categorie} />
          <DetailGroup label="Sub-Category" value={result.sous_categorie} />
          <DetailGroup label="Service" value={result.service} />
          <DetailGroup label="Priority" value={result.priorite_calculee} color="#ef4444" />
          <DetailGroup label="Impact" value={result.impact} />
          <DetailGroup label="Urgency" value={result.urgence} />
        </div>

        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Analysis Reasoning</h3>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#1e293b' }}>{result.reasoning}</p>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#000', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Close Details</button>
        </div>
      </motion.div>
    </div>
  )
}

function DetailGroup({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: color || '#1e293b' }}>{value}</div>
    </div>
  )
}

export default App
