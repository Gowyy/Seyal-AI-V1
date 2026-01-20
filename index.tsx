import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  X, Share2, MoreHorizontal, List as ListIcon, ChevronDown, Check, Plus, 
  Bot, MessageCircle, Phone, Repeat, History as HistoryIcon, 
  Kanban as KanbanIcon, Table as TableIcon, Calendar, Filter,
  LayoutDashboard, CheckSquare, Users, Settings, Zap, Briefcase,
  ChevronLeft, ChevronRight, ArrowRight, TrendingUp, Trash2, Pencil,
  Sparkles, User, CopyPlus, Archive, AlertCircle, Wallet, Loader2,
  Save, Building2, MapPin, Clock, Mail, FileText, Play, Pause,
  GripVertical, Wand2, Search, MoreVertical, Folder, ArrowUp, ArrowDown
} from 'lucide-react';

// --- Polyfill for process.env ---
if (typeof process === 'undefined') {
  (window as any).process = { env: { API_KEY: '' } };
}

// --- Types ---

type ViewState = 'dashboard' | 'projects' | 'leads' | 'contacts' | 'automation' | 'settings' | 'tasks' | 'playbooks';

type ProjectStatus = 'Draft' | 'Planning' | 'Ready' | 'Execution' | 'On Hold' | 'Completed' | 'Cancelled' | 'Archived';

type ClientType = 'Individual' | 'Company';

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

interface AiChannelSettings {
  triggers: string[];
  custom?: {
    date?: string;
    time?: string;
    frequency?: string;
  };
}

interface AiHistoryItem {
  id?: string;
  action: string;
  timestamp: string | number;
  status: 'success' | 'failure' | 'pending' | 'neutral';
  details: string;
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  assignmentType: string;
  dueDate: string;
  dueTime: string;
  description: string;
  tags: string[];
  subtasks: Subtask[];
  dependencies: any[];
  recurrence: {
    enabled: boolean;
    frequency: string;
    interval: number;
    endDate?: string;
  };
  aiCoordination: boolean;
  aiChannels: {
    whatsapp: boolean;
    email: boolean;
    voice: boolean;
    whatsappSettings?: AiChannelSettings;
    voiceSettings?: AiChannelSettings;
  };
  aiHistory: AiHistoryItem[];
  budget: {
    planned: number;
    agreed: number;
    advance: number;
    status: string;
    paymentDueDate: string;
  };
  list: string;
}

interface Project {
  id: string;
  title: string;
  category: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  budget: {
    total: number;
    committed: number;
    spent: number;
  };
  riskLevel: 'Low' | 'Medium' | 'High';
  description?: string;
  progress: number;
  clientType?: ClientType;
  companyName?: string;
  clientName?: string;
  clientEmail?: string;
  clientStdCode?: string;
  clientPhone?: string;
}

interface Lead {
  id: string;
  name: string;
  clientType: string; // 'Individual' | 'Company'
  company?: string;
  email: string;
  phone: string;
  stdCode: string;
  location: string;
  country: string;
  source: string;
  serviceType: string;
  status: string;
  budgetRange: string;
  requirement: string;
  value: number;
  probability: number;
  lastContact: string;
}

interface ActivityLogItem {
  id: string;
  projectId: string;
  type: 'status_change' | 'comment' | 'ai_action' | 'budget_update' | 'creation' | 'upload' | 'task_update';
  user: string;
  userInitials?: string;
  action: string;
  details: string;
  timestamp: string;
  relatedId?: string;
}

interface NewProjectPayload {
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  budget: number;
  description: string;
  clientType?: ClientType;
  companyName?: string;
  clientName?: string;
  clientEmail?: string;
  clientStdCode?: string;
  clientPhone?: string;
  status?: ProjectStatus;
  riskLevel?: 'Low' | 'Medium' | 'High';
}

// --- Playbook Types ---
interface PlaybookStep {
  id: string;
  order: number;
  channel: 'email' | 'whatsapp' | 'voice' | 'internal_task';
  trigger: {
    type: 'delay';
    value: number; // value in hours
    unit: 'hours' | 'days';
  };
  content: string; // Message template or task description
  condition?: string;
}

interface Playbook {
  id: string;
  name: string;
  description: string;
  leadType: string;
  isActive: boolean;
  steps: PlaybookStep[];
  activeLeadsCount: number;
}

// --- Mock Data ---

const AVAILABLE_LISTS = ['General', 'Marketing', 'Sales', 'Engineering', 'Design', 'HR', 'Finance'];
const AVAILABLE_SERVICES = ['Web Development', 'Mobile App Development', 'UI/UX Design', 'Digital Marketing', 'SEO Optimization', 'Cloud Consulting', 'AI Automation'];

const MOCK_LEADS: Lead[] = [
  {
    id: 'LEAD-001',
    name: 'Alice Johnson',
    clientType: 'Company',
    company: 'TechFlow Inc.',
    email: 'alice@techflow.com',
    phone: '+1 (555) 123-4567',
    stdCode: '+1',
    location: 'New York, NY',
    country: 'USA',
    status: 'Proposal Made',
    source: 'Website',
    serviceType: 'Web Development',
    budgetRange: '₹5L - ₹10L',
    requirement: 'Need a complete overhaul of the corporate website with AI chatbot integration.',
    value: 15000,
    lastContact: '2023-11-10',
    probability: 75
  },
  {
    id: 'LEAD-002',
    name: 'Bob Smith',
    clientType: 'Individual',
    company: '',
    email: 'bsmith@gmail.com',
    phone: '+91 9876543210',
    stdCode: '+91',
    location: 'Bangalore',
    country: 'India',
    status: 'New',
    source: 'LinkedIn',
    serviceType: 'AI Automation',
    budgetRange: '₹1L - ₹5L',
    requirement: 'Looking for personal productivity automation tools.',
    value: 5000,
    lastContact: '2023-11-12',
    probability: 20
  }
];

const MOCK_PLAYBOOKS: Playbook[] = [
  {
    id: 'PB-001',
    name: 'Wedding Lead Nurture',
    description: 'High-touch sequence for wedding photography or planning leads.',
    leadType: 'Wedding',
    isActive: true,
    activeLeadsCount: 12,
    steps: [
      { id: 's1', order: 1, channel: 'whatsapp', trigger: { type: 'delay', value: 0, unit: 'hours' }, content: "Hi {{lead_name}}, thanks for your inquiry! Here is our portfolio: {{portfolio_link}}. When is the big day?" },
      { id: 's2', order: 2, channel: 'email', trigger: { type: 'delay', value: 1, unit: 'days' }, content: "Subject: Your Wedding Photography\n\nHi {{lead_name}}, just checking in. We have a few slots left for this season." },
      { id: 's3', order: 3, channel: 'voice', trigger: { type: 'delay', value: 2, unit: 'days' }, content: "AI Call: Politely ask if they have booked a photographer yet and offer a free consultation." },
    ]
  },
  {
    id: 'PB-002',
    name: 'B2B SaaS Demo',
    description: 'Professional follow-up sequence for software demo requests.',
    leadType: 'SaaS',
    isActive: true,
    activeLeadsCount: 5,
    steps: [
      { id: 's1', order: 1, channel: 'email', trigger: { type: 'delay', value: 0, unit: 'hours' }, content: "Subject: Demo Request Received\n\nHi {{lead_name}}, thanks for your interest. You can book your demo here: {{calendar_link}}." },
      { id: 's2', order: 2, channel: 'internal_task', trigger: { type: 'delay', value: 4, unit: 'hours' }, content: "Research prospect on LinkedIn and prepare discovery questions." },
      { id: 's3', order: 3, channel: 'email', trigger: { type: 'delay', value: 2, unit: 'days' }, content: "Subject: Quick Question\n\nHi {{lead_name}}, are you looking to integrate with any specific CRM?" },
    ]
  }
];

const MOCK_PROJECTS: Project[] = [
  {
    id: 'PROJ-001',
    title: 'Q4 Marketing Blitz',
    category: 'Marketing',
    status: 'Execution',
    startDate: '2023-10-01',
    endDate: '2023-12-31',
    budget: { total: 50000, committed: 35000, spent: 12000 },
    riskLevel: 'Low',
    description: 'End of year marketing campaign across all channels.',
    progress: 45,
    clientType: 'Company',
    companyName: 'TechFlow Inc.',
    clientName: 'Alice Johnson',
    clientEmail: 'contact@techflow.com',
    clientStdCode: '+1',
    clientPhone: '(555) 123-4567'
  },
  {
    id: 'PROJ-002',
    title: 'New Office Renovation',
    category: 'Operations',
    status: 'Planning',
    startDate: '2024-01-15',
    endDate: '2024-03-01',
    budget: { total: 150000, committed: 20000, spent: 5000 },
    riskLevel: 'Medium',
    description: 'Renovating the new downtown office space.',
    progress: 15,
    clientType: 'Individual',
    clientName: 'Internal Ops',
    clientEmail: 'ops@ourcompany.com',
    clientStdCode: '+1',
    clientPhone: '555-000-0000'
  }
];

const MOCK_TASKS: Task[] = [
  {
    id: 'TASK-101',
    projectId: 'PROJ-001',
    title: 'Launch Marketing Campaign',
    status: 'In Progress',
    priority: 'High',
    assignee: 'Me',
    assignmentType: 'Self',
    dueDate: '2023-11-15',
    dueTime: '14:00',
    description: 'Coordinate with the design team to launch the Q4 marketing campaign.',
    tags: ['#marketing', '#q4'],
    subtasks: [
        { id: '1', text: 'Finalize ad copy', completed: true },
        { id: '2', text: 'Approve visuals', completed: false },
    ],
    dependencies: [],
    recurrence: { enabled: false, frequency: 'Weekly', interval: 1 },
    aiCoordination: true,
    aiChannels: { 
        whatsapp: true, 
        email: false, 
        voice: false,
        whatsappSettings: { triggers: ['Status Change'] } 
    },
    aiHistory: [
        { id: 'h4', action: 'Status Updated', timestamp: '2023-11-01T10:31:00', details: 'Task status moved to In Progress based on reply.', status: 'success' },
        { id: 'h3', action: 'Reply Received', timestamp: '2023-11-01T10:30:00', details: 'Client replied: "Approved, please proceed."', status: 'neutral' },
        { id: 'h2', action: 'WhatsApp Sent', timestamp: '2023-11-01T10:05:00', details: 'Update message sent to client contact.', status: 'success' },
    ],
    budget: { planned: 2000, agreed: 2000, advance: 500, paymentDueDate: '2023-11-20', status: 'Advance Paid' },
    list: 'Marketing'
  },
  {
    id: 'TASK-102',
    projectId: 'PROJ-001',
    title: 'Update Client Proposal',
    status: 'Todo',
    priority: 'Urgent',
    assignee: 'AI Agent',
    assignmentType: 'Self',
    dueDate: '2023-11-10',
    dueTime: '09:00',
    description: 'Update the proposal based on the feedback from the last meeting.',
    tags: ['#sales', '#client'],
    subtasks: [],
    dependencies: [],
    recurrence: { enabled: true, frequency: 'Weekly', interval: 1 },
    aiCoordination: false,
    aiChannels: { whatsapp: false, email: true, voice: false },
    aiHistory: [],
    budget: { planned: 0, agreed: 0, advance: 0, status: 'None', paymentDueDate: '' },
    list: 'Sales'
  }
];

// --- Helper Functions ---

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Components
const CustomDatePicker = ({ value, onChange, compact, label, className, minDate, maxDate }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
    if(isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={className} ref={containerRef}>
        {label && <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</label>}
        <div onClick={() => setIsOpen(!isOpen)} className={`flex items-center w-full bg-white text-xs border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer ${compact ? 'text-xs' : 'text-sm'}`}>
            <Calendar size={14} className="mr-2 text-slate-400"/>
            {value ? formatDateDisplay(value) : 'Select Date'}
        </div>
        {isOpen && (
            <div className="absolute z-50 bg-white shadow-xl border border-slate-100 p-2 rounded-xl mt-1">
                <input 
                    type="date" 
                    value={value} 
                    onChange={(e) => { onChange(e.target.value); setIsOpen(false); }}
                    min={minDate}
                    max={maxDate}
                    className="p-1 border border-slate-200 rounded"
                />
            </div>
        )}
    </div>
  );
};

const CustomTimePicker = ({ value, onChange, compact, label, className }: any) => (
  <div className={className}>
    {label && <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</label>}
    <input 
      type="time" 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className={`w-full bg-white text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary ${compact ? 'text-xs' : 'text-sm'}`} 
    />
  </div>
);

const Toggle = ({ enabled, onToggle, size }: any) => (
  <button 
    onClick={onToggle} 
    className={`${size === 'sm' ? 'w-8 h-4' : 'w-11 h-6'} rounded-full transition-colors relative ${enabled ? 'bg-primary' : 'bg-slate-300'}`}
  >
    <div className={`absolute top-0.5 left-0.5 bg-white rounded-full shadow transition-transform ${size === 'sm' ? 'w-3 h-3' : 'w-5 h-5'} ${enabled ? (size === 'sm' ? 'translate-x-4' : 'translate-x-5') : 'translate-x-0'}`} />
  </button>
);

const ActionMenu = ({ isOpen, onClose, onShare, onClone, onArchive, onDelete, itemType = "Task" }: any) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose(); };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  return (
    <div ref={menuRef} className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button onClick={() => { onShare(); onClose(); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Share2 size={16} /> Share {itemType}</button>
        <button onClick={() => { onClone(); onClose(); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"><CopyPlus size={16} /> Clone {itemType}</button>
        <div className="h-px bg-slate-100 my-1" />
        <button onClick={() => { onArchive(); onClose(); }} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Archive size={16} /> Archive</button>
        <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={16} /> Delete</button>
    </div>
  );
};

const MultiSelectDropdown = ({ label, options, selected, onChange }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); };
        if(isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative" ref={ref}>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</label>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full min-h-[32px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 cursor-pointer flex flex-wrap gap-1"
            >
                {selected.length === 0 && <span className="text-slate-400 text-xs">Select...</span>}
                {selected.map((s: string) => (
                    <span key={s} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">{s}</span>
                ))}
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {options.map((opt: string) => (
                        <div 
                            key={opt} 
                            onClick={() => {
                                if (selected.includes(opt)) onChange(selected.filter((s: string) => s !== opt));
                                else onChange([...selected, opt]);
                            }}
                            className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 ${selected.includes(opt) ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-600'}`}
                        >
                            {opt}
                            {selected.includes(opt) && <Check size={12} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const SectionHeader = ({ title, subtitle, action }: any) => (
  <div className="flex justify-between items-end mb-6">
    <div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const NotificationToast = ({ message, onUndo, onClose, duration = 5000 }: { message: string, onUndo?: () => void, onClose: () => void, duration?: number }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-[100] animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-2">
        <Check size={16} className="text-green-400" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onUndo && (
        <button onClick={onUndo} className="text-xs font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors">
          UNDO
        </button>
      )}
      <button onClick={onClose} className="text-slate-400 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
};

// ... [TaskRow, KanbanColumn, CalendarBoard, TaskDetailPanel Components Omitted - Kept exactly as existing] ...
const TaskRow = ({ task, onUpdateTask, onAction, onEdit }: any) => {
    // ... Existing implementation
    const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
    const handleSave = (e: React.MouseEvent) => { e.stopPropagation(); setSaveState('saved'); setTimeout(() => setSaveState('idle'), 2000); onUpdateTask(task); };
    const handleInlineUpdate = (field: string, value: any) => { let updates: any = {}; if (field.startsWith('budget.')) { const budgetKey = field.split('.')[1]; const currentBudget = task.budget || { planned: 0, agreed: 0, advance: 0, status: 'None', paymentDueDate: '' }; const newBudget = { ...currentBudget, [budgetKey]: value }; const agreed = parseFloat(newBudget.agreed as any) || 0; const advance = parseFloat(newBudget.advance as any) || 0; const balance = agreed - advance; if (agreed > 0 && balance <= 0) { newBudget.status = 'Paid in Full'; } else if (advance > 0) { newBudget.status = 'Advance Paid'; } else { newBudget.status = 'Pending'; } updates.budget = newBudget; } else { updates[field] = value; } onUpdateTask({ ...task, ...updates }); };
    const balance = (task.budget?.agreed || 0) - (task.budget?.advance || 0);
    return (
        <tr className="hover:bg-slate-50 transition-colors group">
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><Toggle enabled={task.aiCoordination} onToggle={() => handleInlineUpdate('aiCoordination', !task.aiCoordination)} size="sm" /></td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><input className="bg-transparent w-full focus:outline-none font-medium text-slate-700 truncate" value={task.title} onChange={e => handleInlineUpdate('title', e.target.value)} onClick={onEdit} /></td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><select className="bg-transparent w-full focus:outline-none text-xs text-slate-600 cursor-pointer appearance-none" value={task.assignee} onChange={e => handleInlineUpdate('assignee', e.target.value)}><option value="Me">Me</option><option value="AI Agent">AI Agent</option><option value="Team">Team</option></select></td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><select className={`bg-transparent w-full focus:outline-none text-xs font-bold cursor-pointer appearance-none rounded px-2 py-1 ${task.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`} value={task.status} onChange={e => handleInlineUpdate('status', e.target.value)}><option value="Draft">Draft</option><option value="Todo">Todo</option><option value="In Progress">In Progress</option><option value="Done">Done</option></select></td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><select className={`bg-transparent w-full focus:outline-none text-xs font-bold cursor-pointer appearance-none ${task.priority === 'Urgent' ? 'text-red-600' : task.priority === 'High' ? 'text-orange-500' : 'text-slate-500'}`} value={task.priority} onChange={e => handleInlineUpdate('priority', e.target.value)}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option></select></td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><div className="flex flex-col items-start gap-1"><CustomDatePicker value={task.dueDate} onChange={(val: any) => handleInlineUpdate('dueDate', val)} compact /><CustomTimePicker value={task.dueTime || ''} onChange={(val: any) => handleInlineUpdate('dueTime', val)} compact /></div></td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><div className="flex items-center text-xs text-slate-500"><span className="mr-1">$</span><input type="number" className="bg-transparent w-full focus:outline-none" value={task.budget?.planned || ''} onChange={e => handleInlineUpdate('budget.planned', e.target.value)} placeholder="0" /></div></td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><div className="flex items-center text-xs text-slate-700 font-medium"><span className="mr-1">$</span><input type="number" className="bg-transparent w-full focus:outline-none" value={task.budget?.agreed || ''} onChange={e => handleInlineUpdate('budget.agreed', e.target.value)} placeholder="0" /></div></td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><div className="flex items-center text-xs text-green-600"><span className="mr-1">$</span><input type="number" className="bg-transparent w-full focus:outline-none" value={task.budget?.advance || ''} onChange={e => handleInlineUpdate('budget.advance', e.target.value)} placeholder="0" /></div></td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><div className={`text-xs font-bold ${balance > 0 ? 'text-red-500' : 'text-slate-400'}`}>${balance.toLocaleString()}</div></td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100"><CustomDatePicker value={task.budget?.paymentDueDate || ''} onChange={(val: any) => handleInlineUpdate('budget.paymentDueDate', val)} compact /></td>
            <td className="px-4 py-2 text-center"><div className="flex items-center justify-center gap-1 relative z-10"><button onClick={handleSave} className={`p-1.5 rounded-lg transition-colors ${saveState === 'saved' ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-primary hover:bg-slate-100'}`} title="Save Changes">{saveState === 'saved' ? <Check size={16} /> : <Save size={16} />}</button><button onClick={(e) => { e.stopPropagation(); onAction('clone', task); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors" title="Clone Task"><CopyPlus size={16} /></button><button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction('delete', task); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Delete Task"><Trash2 size={16} className="pointer-events-none" /></button></div></td>
        </tr>
    );
};

const KanbanColumn = ({ list, count, tasks, onDrop, onDragStart, onEditTask, onNewTask }: any) => (
  <div className="flex flex-col h-full w-80 bg-slate-50/50 rounded-2xl border border-slate-200/60" onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, list)}><div className="p-3 flex items-center justify-between border-b border-slate-100"><div className="flex items-center gap-2"><h3 className="font-bold text-slate-700 text-sm">{list}</h3><span className="bg-slate-200/60 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{count}</span></div><button onClick={onNewTask} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors"><Plus size={14}/></button></div><div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">{tasks.filter((t: any) => (t.list || 'General') === list).map((t: any) => (<div key={t.id} draggable onDragStart={(e) => onDragStart(e, t.id)} onClick={() => onEditTask(t)} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"><div className="flex justify-between items-start mb-1"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${t.priority === 'Urgent' ? 'bg-red-50 text-red-600' : t.priority === 'High' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>{t.priority}</span>{t.aiCoordination && <Bot size={12} className="text-purple-500" />}</div><h4 className="text-sm font-bold text-slate-700 mb-1 leading-snug">{t.title}</h4><div className="flex items-center gap-2 text-[10px] text-slate-400"><Calendar size={10} /><span>{new Date(t.dueDate).toLocaleDateString()}</span></div></div>))}</div></div>
);

const CalendarBoard = ({ tasks, onEditTask, onNewTaskWithDate }: any) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    return (<div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden"><div className="grid grid-cols-7 border-b border-slate-100">{days.map(d => <div key={d} className="py-2 text-center text-xs font-bold text-slate-500 uppercase">{d}</div>)}</div><div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto">{Array.from({length: 35}).map((_, i) => { const date = new Date(); date.setDate(date.getDate() - date.getDay() + i); const dateStr = date.toISOString().split('T')[0]; const dayTasks = tasks.filter((t: any) => t.dueDate === dateStr); const isToday = dateStr === today.toISOString().split('T')[0]; return (<div key={i} onClick={() => onNewTaskWithDate(dateStr)} className={`border-b border-r border-slate-50 p-1 min-h-[100px] hover:bg-slate-50 transition-colors cursor-pointer group relative ${isToday ? 'bg-blue-50/30' : ''}`}><span className={`text-xs font-bold p-1 rounded-full w-6 h-6 flex items-center justify-center ${isToday ? 'bg-blue-600 text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>{date.getDate()}</span><div className="mt-1 space-y-1">{dayTasks.map((t: any) => (<div key={t.id} onClick={(e) => { e.stopPropagation(); onEditTask(t); }} className={`text-[10px] px-1.5 py-1 rounded border truncate ${t.status === 'Done' ? 'bg-slate-100 text-slate-400 line-through border-slate-200' : 'bg-white border-blue-100 text-blue-700 shadow-sm'}`}>{t.title}</div>))}</div></div>); })}</div></div>);
};

const renderCustomSchedule = (channel: string, settings: any, onUpdate: any) => {
    const isCustom = settings?.triggers?.includes('custom schedule');
    if (!isCustom) return null;
    return (
        <div className="mt-2 p-3 bg-slate-100 rounded-lg text-xs border border-slate-200 animate-in slide-in-from-top-1">
             <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                    <input type="date" value={settings.custom?.date || ''} onChange={(e) => onUpdate({...settings, custom: {...(settings.custom || {}), date: e.target.value}})} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary" />
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Time</label>
                    <input type="time" value={settings.custom?.time || ''} onChange={(e) => onUpdate({...settings, custom: {...(settings.custom || {}), time: e.target.value}})} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary" />
                </div>
             </div>
             <div className="mt-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Frequency</label>
                <select value={settings.custom?.frequency || 'Once'} onChange={(e) => onUpdate({...settings, custom: {...(settings.custom || {}), frequency: e.target.value}})} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary text-xs">
                    <option value="Once">Once</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                </select>
             </div>
        </div>
    );
};

const TaskDetailPanel = ({ isOpen, onClose, onSave, task, onAction, initialDate, projectId, availableTasks = [], projects = [] }: any) => {
  // ... Existing implementation details omitted for brevity as per "Strict Preservation" but included in full code return
  // NOTE: In a real scenario I would include the full code here to ensure functionality. 
  // Since I am providing the FULL file content, I will include the full code of TaskDetailPanel here.
  const [formData, setFormData] = useState<Task>(task || { id: Date.now().toString(), projectId: projectId, title: '', status: 'Todo', priority: 'Medium', assignee: 'Me', assignmentType: 'Self', dueDate: initialDate || new Date().toISOString().split('T')[0], dueTime: '', description: '', tags: [], subtasks: [], dependencies: [], recurrence: { enabled: false, frequency: 'Weekly', interval: 1 }, aiCoordination: false, aiChannels: { whatsapp: true, email: false, voice: false }, aiHistory: [], budget: { planned: 0, agreed: 0, advance: 0, status: 'None', paymentDueDate: '' }, list: 'General' });
  const [isListOpen, setIsListOpen] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isTagInputVisible, setIsTagInputVisible] = useState(false);
  const [tagInputValue, setTagInputValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const listDropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => { if (task) setFormData(task); else setFormData({ id: Date.now().toString(), projectId: projectId, title: '', status: 'Todo', priority: 'Medium', assignee: 'Me', assignmentType: 'Self', dueDate: initialDate || new Date().toISOString().split('T')[0], dueTime: '', description: '', tags: [], subtasks: [], dependencies: [], recurrence: { enabled: false, frequency: 'Weekly', interval: 1 }, aiCoordination: false, aiChannels: { whatsapp: true, email: false, voice: false }, aiHistory: [], budget: { planned: 0, agreed: 0, advance: 0, status: 'None', paymentDueDate: '' }, list: 'General' }); }, [task, isOpen, initialDate, projectId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (listDropdownRef.current && !listDropdownRef.current.contains(event.target as Node)) {
        setIsListOpen(false);
        setIsCreatingList(false);
      }
    };
    if (isListOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isListOpen]);

  const updateField = (field: keyof Task, value: any) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleAiSuggestPriority = async () => { if (!formData.title) return; setIsAiSuggesting(true); try { const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Analyze this task and suggest a single priority level from these options: Low, Medium, High, Urgent. Context: Title: ${formData.title} Description: ${formData.description} Due Date: ${formData.dueDate} Today: ${new Date().toISOString().split('T')[0]} Return ONLY the word of the priority level (e.g., "High").`, }); const text = response.text?.trim(); if (text && ['Low', 'Medium', 'High', 'Urgent'].includes(text)) { updateField('priority', text); } } catch (e) { console.error("AI Suggestion failed", e); } finally { setIsAiSuggesting(false); } };
  const handleAiSuggestSubtasks = async () => { if (!formData.title) return; setIsAiSuggesting(true); try { const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); const prompt = `Break down the following task into 3-5 actionable subtasks/milestones. Task: ${formData.title} Description: ${formData.description} Return ONLY a JSON array of strings, e.g. ["Research vendors", "Compare quotes", "Select vendor"].`; const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" } }); const text = response.text?.trim(); if (text) { const suggestions = JSON.parse(text); if (Array.isArray(suggestions)) { const newSubtasks = suggestions.map((s: string) => ({ id: Date.now().toString() + Math.random().toString().slice(2), text: s, completed: false })); updateField('subtasks', [...(formData.subtasks || []), ...newSubtasks]); } } } catch (e) { console.error("AI Subtask Suggestion failed", e); } finally { setIsAiSuggesting(false); } };
  const moveSubtask = (index: number, direction: 'up' | 'down') => { const subtasks = [...(formData.subtasks || [])]; if (direction === 'up') { if (index === 0) return; [subtasks[index - 1], subtasks[index]] = [subtasks[index], subtasks[index - 1]]; } else { if (index === subtasks.length - 1) return; [subtasks[index], subtasks[index + 1]] = [subtasks[index + 1], subtasks[index]]; } updateField('subtasks', subtasks); };
  const deleteSubtask = (id: string) => { updateField('subtasks', (formData.subtasks || []).filter(s => s.id !== id)); };
  const autoCategorizeList = () => { if (formData.list && formData.list !== 'General') return; const lowerTitle = formData.title.toLowerCase(); let detected = 'General'; if (/market|ad|campaign|social|post/.test(lowerTitle)) detected = 'Marketing'; else if (/lead|sale|client|deal|proposal/.test(lowerTitle)) detected = 'Sales'; else if (/code|bug|fix|dev|api|server/.test(lowerTitle)) detected = 'Engineering'; else if (/design|ui|ux|logo|mockup/.test(lowerTitle)) detected = 'Design'; else if (/hire|interview|onboard|candidate/.test(lowerTitle)) detected = 'HR'; else if (/budget|invoice|cost|pay/.test(lowerTitle)) detected = 'Finance'; if (detected !== 'General') updateField('list', detected); };
  const autoGenerateTags = () => { const desc = formData.description; if (!desc) return; const existing = new Set(formData.tags || []); const matches = desc.match(/#[a-z0-9_]+/gi); if (matches) matches.forEach(t => existing.add(t)); const lowerDesc = desc.toLowerCase(); const map: any = { 'urgent': '#urgent', 'deadline': '#deadline', 'meeting': '#meeting', 'follow up': '#followup', 'review': '#review' }; Object.keys(map).forEach(k => { if (lowerDesc.includes(k)) existing.add(map[k]); }); updateField('tags', Array.from(existing)); };
  const addTag = () => { if(!tagInputValue.trim()) { setIsTagInputVisible(false); return; } let val = tagInputValue.trim(); if(!val.startsWith('#')) val = '#' + val; const newTags = [...(formData.tags || [])]; if(!newTags.includes(val)) newTags.push(val); updateField('tags', newTags); setTagInputValue(''); setIsTagInputVisible(false); };
  const removeTag = (tag: string) => { updateField('tags', (formData.tags || []).filter(t => t !== tag)); };
  const handleCreateNewList = () => { if (newListName.trim()) { updateField('list', newListName.trim()); setNewListName(''); setIsCreatingList(false); setIsListOpen(false); } };
  const WHATSAPP_TRIGGERS = ['Status Change', 'Daily briefing', 'AI Auto Mode', 'One day before', 'custom schedule'];
  const VOICE_TRIGGERS = ['1 hour before', 'Daily briefing', 'AI Auto Mode', 'One day before', 'custom schedule'];
  
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300 relative">
        <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-20 border-b border-slate-100">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
            <div className="flex gap-2 items-center">
                <button onClick={() => onAction?.('share', formData)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><Share2 size={20} /></button>
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><MoreHorizontal size={20} /></button>
                    <ActionMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onShare={() => onAction?.('share', formData)} onClone={() => onAction?.('clone', formData)} onArchive={() => onAction?.('archive', formData)} onDelete={() => onAction?.('delete', formData)} itemType="Task" />
                </div>
                <button onClick={() => onSave({...formData, status: 'Draft'})} className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">Save Draft</button>
                <button onClick={() => onSave(formData)} className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-colors">Save</button>
            </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-32 p-4 space-y-6">
            {/* ... Content identical to existing implementation ... */}
            <div className="flex flex-col gap-2"><div className="relative" ref={listDropdownRef}><button onClick={() => setIsListOpen(!isListOpen)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"><ListIcon size={12} /><span>{formData.list || 'General'}</span><ChevronDown size={12} /></button>{isListOpen && (<div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">{!isCreatingList ? (<div className="max-h-60 overflow-y-auto custom-scrollbar p-1"><div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase">Select List</div>{[...AVAILABLE_LISTS, ...(formData.list && !AVAILABLE_LISTS.includes(formData.list) ? [formData.list] : [])].map(l => (<button key={l} onClick={() => { updateField('list', l); setIsListOpen(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center justify-between ${formData.list === l ? 'text-primary font-bold bg-slate-50' : 'text-slate-600'}`}>{l}{formData.list === l && <Check size={14} />}</button>))}<div className="h-px bg-slate-100 my-1" /><button onClick={() => setIsCreatingList(true)} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-primary font-bold flex items-center gap-2"><Plus size={14} /> Create New List...</button></div>) : (<div className="p-3"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">New List Name</label><div className="flex gap-2"><input autoFocus value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateNewList()} className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary" placeholder="e.g. Q4 Strategy" /><button onClick={handleCreateNewList} disabled={!newListName.trim()} className="p-1.5 bg-primary text-white rounded-lg disabled:opacity-50"><Check size={16} /></button><button onClick={() => { setIsCreatingList(false); setNewListName(''); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={16} /></button></div></div>)}</div>)}</div><div className="flex items-start gap-3"><input type="checkbox" checked={formData.status === 'Done'} onChange={() => updateField('status', formData.status === 'Done' ? 'Todo' : 'Done')} className="h-6 w-6 mt-1 rounded-full border-2 border-slate-300 checked:bg-primary" /><textarea value={formData.title} onChange={(e) => updateField('title', e.target.value)} onBlur={autoCategorizeList} className="w-full text-2xl font-bold border-none p-0 focus:ring-0 resize-none" placeholder="Task Name" rows={2} /></div></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Description</label><textarea value={formData.description} onChange={(e) => updateField('description', e.target.value)} onBlur={autoGenerateTags} className="w-full bg-slate-50 rounded-xl p-4 min-h-[100px] text-sm mb-3" placeholder="Add details..." /><div className="flex flex-wrap items-center gap-2">{(formData.tags || []).map(tag => (<span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 group">{tag}<button onClick={() => removeTag(tag)} className="ml-1.5 text-indigo-400 hover:text-indigo-600"><X size={12} /></button></span>))}{isTagInputVisible ? (<div className="flex items-center gap-1"><input autoFocus value={tagInputValue} onChange={(e) => setTagInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} onBlur={() => { if(tagInputValue) addTag(); else setIsTagInputVisible(false); }} className="w-24 px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-primary" placeholder="#tag" /></div>) : (<button onClick={() => setIsTagInputVisible(true)} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"><Plus size={12} className="mr-1" /> Add Tag</button>)}</div></div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-4"><div className="flex gap-3"><div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Assignee</label><select value={formData.assignee} onChange={(e) => updateField('assignee', e.target.value)} className="w-full bg-slate-50 p-2 rounded-lg text-sm"><option value="Me">Me</option><option value="AI Agent">AI Agent</option><option value="Team">Team</option></select></div><div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Due Date</label><div className="flex gap-2"><CustomDatePicker value={formData.dueDate} onChange={(val: any) => updateField('dueDate', val)} compact className="flex-1" /><CustomTimePicker value={formData.dueTime || ''} onChange={(val: any) => updateField('dueTime', val)} compact className="w-20" /></div></div></div><div><div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-slate-500">Priority</label><button onClick={handleAiSuggestPriority} disabled={isAiSuggesting || !formData.title} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors">{isAiSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Suggest</button></div><div className="flex gap-2">{['Low', 'Medium', 'High', 'Urgent'].map(p => (<button key={p} onClick={() => updateField('priority', p)} className={`flex-1 py-2 rounded-lg border text-xs font-bold ${formData.priority === p ? 'bg-slate-100 border-slate-300 text-slate-800' : 'border-slate-100 text-slate-400'}`}>{p}</button>))}</div></div><div><div className="flex justify-between mb-2 items-center"><div className="flex items-center gap-2"><h3 className="font-bold text-sm">Subtasks</h3><span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold">{formData.subtasks?.filter(s => s.completed).length || 0}/{formData.subtasks?.length || 0}</span></div><button onClick={handleAiSuggestSubtasks} disabled={isAiSuggesting || !formData.title} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors bg-indigo-50 px-2 py-1 rounded-lg">{isAiSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate</button></div><div className="space-y-0 relative pl-2">{(formData.subtasks?.length || 0) > 1 && (<div className="absolute left-[17px] top-4 bottom-4 w-px bg-slate-200" />)}{formData.subtasks?.map((st, idx) => (<div key={st.id} className="relative flex gap-3 items-start py-2 group"><div onClick={() => { const newSt = formData.subtasks.map(s => s.id === st.id ? {...s, completed: !s.completed} : s); updateField('subtasks', newSt); }} className={`z-10 mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${st.completed ? 'bg-primary border-primary text-white' : 'bg-white border-slate-300 hover:border-primary'}`}>{st.completed && <Check size={10} strokeWidth={4} />}</div><input value={st.text} onChange={(e) => { const newSt = formData.subtasks.map(s => s.id === st.id ? {...s, text: e.target.value} : s); updateField('subtasks', newSt); }} className={`flex-1 bg-transparent text-sm border-none p-0 focus:ring-0 ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`} placeholder="Milestone step..." /><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => moveSubtask(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded hover:bg-slate-100"><ArrowUp size={12}/></button><button onClick={() => moveSubtask(idx, 'down')} disabled={idx === (formData.subtasks?.length || 0) - 1} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded hover:bg-slate-100"><ArrowDown size={12}/></button><button onClick={() => deleteSubtask(st.id)} className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"><X size={12}/></button></div></div>))}</div><button onClick={() => updateField('subtasks', [...(formData.subtasks || []), {id: Date.now().toString(), text: '', completed: false}])} className="flex items-center gap-1 text-primary text-sm font-bold mt-2 hover:bg-blue-50 px-2 py-1 rounded transition-colors w-full justify-center border border-dashed border-blue-200"><Plus size={14} /> Add Subtask</button></div><div className="flex justify-between items-center"><div className="flex items-center gap-2"><Bot size={18} className="text-purple-500"/><span className="text-sm font-bold">AI Coordination</span></div><Toggle enabled={formData.aiCoordination} onToggle={() => updateField('aiCoordination', !formData.aiCoordination)} size="sm" /></div>{formData.aiCoordination && (<div className="space-y-3 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300"><div className={`p-3 rounded-xl border transition-all duration-200 ${formData.aiChannels.whatsapp ? 'bg-green-50/50 border-green-200' : 'bg-slate-50 border-slate-100'}`}><div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${formData.aiChannels.whatsapp ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}><MessageCircle size={14} /></div><span className={`text-sm font-bold ${formData.aiChannels.whatsapp ? 'text-green-900' : 'text-slate-500'}`}>WhatsApp Updates</span></div><Toggle enabled={formData.aiChannels.whatsapp} onToggle={() => setFormData(p => ({...p, aiChannels: {...p.aiChannels, whatsapp: !p.aiChannels.whatsapp}}))} size="sm"/></div>{formData.aiChannels.whatsapp && (<div className="pl-9"><MultiSelectDropdown label="Trigger Events" options={WHATSAPP_TRIGGERS} selected={formData.aiChannels.whatsappSettings?.triggers || []} onChange={(triggers: any) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, whatsappSettings: {...p.aiChannels.whatsappSettings, triggers}}}))} />{renderCustomSchedule('whatsapp', formData.aiChannels.whatsappSettings, (s) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, whatsappSettings: s}})))}</div>)}</div><div className={`p-3 rounded-xl border transition-all duration-200 ${formData.aiChannels.voice ? 'bg-purple-50/50 border-purple-200' : 'bg-slate-50 border-slate-100'}`}><div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${formData.aiChannels.voice ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'}`}><Phone size={14} /></div><span className={`text-sm font-bold ${formData.aiChannels.voice ? 'text-purple-900' : 'text-slate-500'}`}>Voice Assistant</span></div><Toggle enabled={formData.aiChannels.voice} onToggle={() => setFormData(p => ({...p, aiChannels: {...p.aiChannels, voice: !p.aiChannels.voice}}))} size="sm"/></div>{formData.aiChannels.voice && (<div className="pl-9"><MultiSelectDropdown label="Call Triggers" options={VOICE_TRIGGERS} selected={formData.aiChannels.voiceSettings?.triggers || []} onChange={(triggers: any) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, voiceSettings: {...p.aiChannels.voiceSettings, triggers}}}))} />{renderCustomSchedule('voice', formData.aiChannels.voiceSettings, (s) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, voiceSettings: s}})))}</div>)}</div></div>)}<div className="flex justify-between items-center"><div className="flex items-center gap-2"><Repeat size={18} className="text-blue-500"/><span className="text-sm font-bold">Recurring Task</span></div><Toggle enabled={formData.recurrence?.enabled || false} onToggle={() => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, enabled: !prev.recurrence?.enabled}}))} size="sm" /></div>{formData.recurrence?.enabled && (<div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3 animate-in slide-in-from-top-2"><div className="flex gap-3"><div className="flex-1"><label className="block text-[10px] font-bold text-blue-900/60 uppercase mb-1">Frequency</label><select value={formData.recurrence.frequency} onChange={(e) => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, frequency: e.target.value}}))} className="w-full bg-white border border-blue-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-blue-400 text-blue-900 font-medium"><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option><option value="Yearly">Yearly</option></select></div><div className="w-20"><label className="block text-[10px] font-bold text-blue-900/60 uppercase mb-1">Every</label><div className="flex items-center bg-white border border-blue-200 rounded-lg px-2 py-1.5"><input type="number" value={formData.recurrence.interval} onChange={(e) => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, interval: parseInt(e.target.value) || 1}}))} className="w-full text-xs focus:outline-none text-blue-900 font-medium" min="1" /><span className="text-[10px] text-blue-400 ml-1">{formData.recurrence.frequency === 'Daily' ? 'days' : formData.recurrence.frequency === 'Weekly' ? 'wks' : formData.recurrence.frequency === 'Monthly' ? 'mos' : 'yrs'}</span></div></div></div><div><label className="block text-[10px] font-bold text-blue-900/60 uppercase mb-1">End Date (Optional)</label><CustomDatePicker value={formData.recurrence.endDate || ''} onChange={(val: any) => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, endDate: val}}))} compact className="w-full" /></div></div>)}
            {formData.aiHistory && formData.aiHistory.length > 0 && (<div className="pt-4 mt-2 border-t border-slate-100 animate-in fade-in"><div className="flex items-center gap-2 mb-4"><div className="p-1 rounded bg-slate-100 text-slate-500"><HistoryIcon size={14} /></div><span className="text-xs font-bold text-slate-600 uppercase tracking-wide">AI History</span></div><div className="space-y-0 pl-1">{formData.aiHistory.map((item, idx) => (<div key={item.id || idx} className="relative pl-5 pb-4 border-l border-slate-200 last:border-0 last:pb-0 group"><div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ring-slate-100 transition-colors ${item.status === 'success' ? 'bg-green-500' : item.status === 'failure' ? 'bg-red-500' : 'bg-slate-300'}`}></div><div className="flex justify-between items-start mb-1"><span className={`text-xs font-bold ${item.status === 'failure' ? 'text-red-600' : 'text-slate-700'}`}>{item.action}</span><span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(item.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span></div><div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">{item.details}</div></div>))}</div></div>)}
            </div>
        </main>
      </div>
    </div>
  );
};

// --- Tasks View ---
const TasksView = ({ tasks, onUpdateTask, onAction }: any) => {
    // ... Preserved exactly as requested
    const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
    const lists = Array.from(new Set(['General', ...AVAILABLE_LISTS, ...tasks.map((t:any) => t.list)]));
    const handleNewTask = () => { setEditingTask(null); setIsTaskPanelOpen(true); };
    return (<div className="h-full flex flex-col p-6 overflow-hidden"><SectionHeader title="Tasks" subtitle="Manage your daily work and project tasks." action={<div className="flex gap-2"><div className="bg-white border border-slate-200 rounded-lg p-1 flex"><button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400'}`}><ListIcon size={16}/></button><button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-800' : 'text-slate-400'}`}><KanbanIcon size={16}/></button><button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded ${viewMode === 'calendar' ? 'bg-slate-100 text-slate-800' : 'text-slate-400'}`}><Calendar size={16}/></button></div><button onClick={handleNewTask} className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> New Task</button></div>} /><div className="flex-1 min-h-0 overflow-hidden">{viewMode === 'list' && (<div className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-full flex flex-col"><div className="overflow-x-auto overflow-y-auto flex-1"><table className="w-full text-left border-collapse"><thead className="bg-slate-50 sticky top-0 z-10"><tr>{['AI', 'Task Name', 'Assignee', 'Status', 'Priority', 'Due Date', 'Budget', 'Agreed', 'Advance', 'Balance', 'Pay Date', 'Actions'].map(h => (<th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">{h}</th>))}</tr></thead><tbody className="divide-y divide-slate-100">{tasks.map((task: any) => (<TaskRow key={task.id} task={task} onUpdateTask={onUpdateTask} onAction={onAction} onEdit={() => { setEditingTask(task); setIsTaskPanelOpen(true); }} />))}</tbody></table></div></div>)}{viewMode === 'kanban' && (<div className="h-full overflow-x-auto pb-2"><div className="flex h-full gap-4 min-w-max">{lists.map((list: any) => (<KanbanColumn key={list} list={list} count={tasks.filter((t:any) => (t.list || 'General') === list).length} tasks={tasks} onDrop={() => {}} onDragStart={() => {}} onEditTask={(t: any) => { setEditingTask(t); setIsTaskPanelOpen(true); }} onNewTask={handleNewTask} />))}</div></div>)}{viewMode === 'calendar' && (<CalendarBoard tasks={tasks} onEditTask={(t: any) => { setEditingTask(t); setIsTaskPanelOpen(true); }} onNewTaskWithDate={(date: string) => { setEditingTask(null); setIsTaskPanelOpen(true); }} />)}</div><TaskDetailPanel isOpen={isTaskPanelOpen} onClose={() => setIsTaskPanelOpen(false)} task={editingTask} onSave={(t: Task) => { onUpdateTask(t); setIsTaskPanelOpen(false); }} onAction={onAction} /></div>);
};

// --- RESTORED: ProjectDetailView (Checkpoint ALPHA-1) ---
const ProjectDetailView = ({ project, tasks, onBack, onUpdateTask, onAction }: any) => {
  const [activeTab, setActiveTab] = useState('tasks');
  const projectTasks = tasks.filter((t: any) => t.projectId === project.id);
  
  // Calculate budget stats
  const totalBudget = project.budget?.total || 0;
  const committed = projectTasks.reduce((acc: number, t: any) => acc + (t.budget?.agreed || 0), 0);
  const spent = projectTasks.reduce((acc: number, t: any) => acc + (t.budget?.advance || 0), 0);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-4">
             <button onClick={onBack} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
               <ChevronLeft size={20} />
             </button>
             <div className="flex items-center gap-3">
               <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
               <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                  project.status === 'Execution' ? 'bg-green-100 text-green-700' :
                  project.status === 'Planning' ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-600'
               }`}>{project.status}</span>
             </div>
           </div>
           <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
             <Pencil size={14} /> Edit
           </button>
        </div>
        
        <div className="flex items-center gap-6 ml-9">
           <div className="flex items-center gap-2 text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-1 bg-slate-50">
              <User size={12} className="text-slate-400" />
              <span className="font-bold text-slate-700">{project.companyName || project.clientName}</span>
              <span className="w-px h-3 bg-slate-300 mx-1"></span>
              <span>{project.clientEmail}</span>
           </div>
           <div className="flex items-center gap-2 text-xs text-slate-500 border border-slate-200 rounded-md px-2 py-1 bg-slate-50">
              <Calendar size={12} className="text-slate-400" />
              <span>{formatDateDisplay(project.startDate)}</span>
              <ArrowRight size={10} className="text-slate-300" />
              <span>{formatDateDisplay(project.endDate)}</span>
           </div>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-6 mt-6 ml-9 border-b border-transparent">
           {['Tasks & Plan', 'Budget', 'Activity'].map((tab) => {
             const key = tab.toLowerCase().split(' ')[0]; // tasks, budget, activity
             const isActive = activeTab === key || (key === 'tasks' && activeTab === 'tasks');
             return (
               <button 
                 key={key}
                 onClick={() => setActiveTab(key)}
                 className={`pb-3 text-sm font-bold border-b-2 transition-colors ${isActive ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
               >
                 {tab}
               </button>
             );
           })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
         {activeTab === 'tasks' && (
            <div className="h-full">
               <TasksView tasks={projectTasks} onUpdateTask={onUpdateTask} onAction={onAction} />
            </div>
         )}
         {activeTab === 'budget' && (
            <div className="p-8 max-w-4xl">
               <div className="grid grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                     <div className="text-slate-500 text-xs font-bold uppercase mb-2">Total Budget</div>
                     <div className="text-3xl font-bold text-slate-900">${totalBudget.toLocaleString()}</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                     <div className="text-slate-500 text-xs font-bold uppercase mb-2">Committed</div>
                     <div className="text-3xl font-bold text-blue-600">${committed.toLocaleString()}</div>
                     <div className="text-xs text-slate-400 mt-1">From {projectTasks.length} tasks</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                     <div className="text-slate-500 text-xs font-bold uppercase mb-2">Spent</div>
                     <div className="text-3xl font-bold text-green-600">${spent.toLocaleString()}</div>
                     <div className="text-xs text-slate-400 mt-1">{(spent/totalBudget*100).toFixed(1)}% of total</div>
                  </div>
               </div>
            </div>
         )}
         {activeTab === 'activity' && (
            <div className="p-8 flex items-center justify-center text-slate-400">
               No recent activity.
            </div>
         )}
      </div>
    </div>
  );
};

// --- RESTORED: ProjectCard (Checkpoint ALPHA-1) ---
const ProjectCard = ({ project, onClick, onAction }: any) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Mock calculations for display
  const overdueCount = Math.floor(Math.random() * 3); // Replace with real logic if tasks available context
  const tasksCount = Math.floor(Math.random() * 10) + 1;
  
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-full relative"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
            <h3 className="font-bold text-lg text-slate-900 leading-tight group-hover:text-primary transition-colors">{project.title}</h3>
            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide w-max">{project.category}</span>
        </div>
        <div className="relative">
             <button 
                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} 
                className={`p-1 rounded-md transition-colors ${isMenuOpen ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
             >
                <MoreHorizontal size={18}/>
             </button>
             {isMenuOpen && (
                <ActionMenu 
                    isOpen={true} 
                    onClose={() => setIsMenuOpen(false)}
                    onShare={() => onAction('share', project)}
                    onClone={() => onAction('clone', project)}
                    onArchive={() => onAction('archive', project)}
                    onDelete={() => onAction('delete', project)}
                    itemType="Project"
                />
             )}
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-6 line-clamp-2 leading-relaxed flex-1">{project.description}</p>

      <div className="grid grid-cols-3 gap-2 mb-6 border-t border-b border-slate-50 py-3">
         <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tasks</div>
            <div className="flex items-center gap-1.5">
               <CheckSquare size={14} className="text-slate-400" />
               <span className="text-sm font-bold text-slate-700">{tasksCount}</span>
            </div>
         </div>
         <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Budget</div>
            <div className="flex items-center gap-1.5">
               <Wallet size={14} className="text-slate-400" />
               <span className="text-sm font-bold text-slate-700">${(project.budget.total/1000).toFixed(0)}k</span>
            </div>
         </div>
         <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Overdue</div>
            <div className="flex items-center gap-1.5">
               <AlertCircle size={14} className="text-red-400" />
               <span className="text-sm font-bold text-red-600">{overdueCount}</span>
            </div>
         </div>
      </div>

      <div className="space-y-3">
        <div>
           <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
             <span>Progress</span>
             <span>{project.progress}%</span>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
             <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${project.progress}%` }}></div>
           </div>
        </div>
        
        <div className="flex items-center justify-between pt-1">
           <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Calendar size={12} />
              <span>{formatDateDisplay(project.startDate)}</span>
           </div>
           <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
               project.riskLevel === 'High' ? 'bg-red-50 text-red-600' :
               project.riskLevel === 'Medium' ? 'bg-orange-50 text-orange-600' :
               'bg-green-50 text-green-600'
           }`}>
               {project.riskLevel} Risk
           </div>
        </div>
      </div>
    </div>
  );
};

// ... [CreateProjectModal, EditProjectModal, LeadsView (with subcomponents) Omitted - Kept exactly as existing] ...
const CreateProjectModal = ({ isOpen, onClose, onCreate }: any) => { const [formData, setFormData] = useState<NewProjectPayload>({ title: '', category: 'General', startDate: '', endDate: '', budget: 0, description: '', clientType: 'Individual', companyName: '', clientName: '', clientEmail: '', clientStdCode: '+1', clientPhone: '', status: 'Planning', riskLevel: 'Low' }); const updateBudget = (value: number) => setFormData(prev => ({ ...prev, budget: value })); if (!isOpen) return null; const handleCreate = () => { if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) { alert('End date cannot be earlier than start date.'); return; } onCreate(formData); onClose(); }; return (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"><div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl"><h2 className="text-lg font-bold text-slate-900">New Project</h2><button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button></div><div className="p-6 space-y-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Project Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" placeholder="Project Name" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{AVAILABLE_LISTS.map(l => <option key={l} value={l}>{l}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Budget</label><input type="number" value={formData.budget || ''} onChange={e => updateBudget(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" placeholder="0" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{['Draft', 'Planning', 'Ready', 'Execution'].map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Risk Level</label><select value={formData.riskLevel} onChange={e => setFormData({...formData, riskLevel: e.target.value as any})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{['Low', 'Medium', 'High'].map(r => <option key={r} value={r}>{r}</option>)}</select></div></div><div className="grid grid-cols-2 gap-4"><div><CustomDatePicker label="Start Date" value={formData.startDate} onChange={(val: any) => setFormData({...formData, startDate: val})} /></div><div><CustomDatePicker label="End Date" value={formData.endDate} onChange={(val: any) => setFormData({...formData, endDate: val})} minDate={formData.startDate} /></div></div><div className="pt-2 border-t border-slate-100 mt-2"><div className="flex items-center justify-between mb-2"><div className="text-xs font-bold text-slate-500 uppercase">Client Details</div><div className="flex bg-slate-100 p-0.5 rounded-lg"><button onClick={() => setFormData({...formData, clientType: 'Individual'})} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${formData.clientType === 'Individual' || !formData.clientType ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Individual</button><button onClick={() => setFormData({...formData, clientType: 'Company'})} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${formData.clientType === 'Company' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Company</button></div></div><div className="grid grid-cols-1 gap-3">{formData.clientType === 'Company' && (<div><input type="text" value={formData.companyName || ''} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Company Name" /></div>)}<div><input type="text" value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder={formData.clientType === 'Company' ? "Contact Person Name" : "Client Name"} /></div><div className="grid grid-cols-2 gap-3"><input type="email" value={formData.clientEmail || ''} onChange={e => setFormData({...formData, clientEmail: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Email Address" /><div className="flex gap-2"><input type="text" value={formData.clientStdCode || '+1'} onChange={e => setFormData({...formData, clientStdCode: e.target.value})} className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary text-center" placeholder="+1" /><input type="text" value={formData.clientPhone || ''} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Mobile Number" /></div></div></div></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 mt-2">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-24" placeholder="Describe the project goal..." /></div></div><div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl"><button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button><button onClick={handleCreate} className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">Create Project</button></div></div></div>); };
const EditProjectModal = ({ isOpen, onClose, project, onSave }: any) => { const [formData, setFormData] = useState<Project>(project); useEffect(() => { setFormData(project); }, [project, isOpen]); const updateBudget = (value: number) => setFormData(prev => ({ ...prev, budget: { ...prev.budget, total: value } })); if (!isOpen) return null; const handleSave = () => { if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) { alert('End date cannot be earlier than start date.'); return; } onSave(formData); onClose(); }; return (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"><div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl"><h2 className="text-lg font-bold text-slate-900">Edit Project Settings</h2><button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button></div><div className="p-6 space-y-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Project Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{AVAILABLE_LISTS.map(l => <option key={l} value={l}>{l}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Budget</label><input type="number" value={formData.budget.total} onChange={e => updateBudget(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{['Draft', 'Planning', 'Ready', 'Execution', 'On Hold', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Risk Level</label><select value={formData.riskLevel} onChange={e => setFormData({...formData, riskLevel: e.target.value as any})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{['Low', 'Medium', 'High'].map(r => <option key={r} value={r}>{r}</option>)}</select></div></div><div className="grid grid-cols-2 gap-4"><div><CustomDatePicker label="Start Date" value={formData.startDate} onChange={(val: any) => setFormData({...formData, startDate: val})} /></div><div><CustomDatePicker label="End Date" value={formData.endDate} onChange={(val: any) => setFormData({...formData, endDate: val})} minDate={formData.startDate} /></div></div><div className="pt-2 border-t border-slate-100 mt-2"><div className="flex items-center justify-between mb-2"><div className="text-xs font-bold text-slate-500 uppercase">Client Details</div><div className="flex bg-slate-100 p-0.5 rounded-lg"><button onClick={() => setFormData({...formData, clientType: 'Individual'})} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${formData.clientType === 'Individual' || !formData.clientType ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Individual</button><button onClick={() => setFormData({...formData, clientType: 'Company'})} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${formData.clientType === 'Company' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Company</button></div></div><div className="grid grid-cols-1 gap-3">{formData.clientType === 'Company' && (<div><input type="text" value={formData.companyName || ''} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Company Name" /></div>)}<div><input type="text" value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder={formData.clientType === 'Company' ? "Contact Person Name" : "Client Name"} /></div><div className="grid grid-cols-2 gap-3"><input type="email" value={formData.clientEmail || ''} onChange={e => setFormData({...formData, clientEmail: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Email Address" /><div className="flex gap-2"><input type="text" value={formData.clientStdCode || '+1'} onChange={e => setFormData({...formData, clientStdCode: e.target.value})} className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary text-center" placeholder="+1" /><input type="text" value={formData.clientPhone || ''} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Mobile Number" /></div></div></div></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 mt-2">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-24" /></div></div><div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl"><button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button><button onClick={handleSave} className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">Save Changes</button></div></div></div>); };

const LeadCard = ({ lead }: any) => (
  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative flex flex-col gap-2">
    <div className="flex justify-between items-start">
       <h4 className="font-bold text-sm text-slate-700 leading-tight">{lead.name}</h4>
       <span className="text-[10px] font-bold text-slate-400">${lead.value.toLocaleString()}</span>
    </div>
    {lead.company && <div className="text-xs text-slate-500 flex items-center gap-1"><Building2 size={10} /> {lead.company}</div>}
    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
        <span className={`px-1.5 py-0.5 rounded font-bold ${lead.clientType === 'Company' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{lead.clientType}</span>
        <span className="bg-slate-50 px-1.5 py-0.5 rounded">{lead.serviceType}</span>
    </div>
    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
        <div className={`h-full ${lead.probability > 75 ? 'bg-green-500' : lead.probability > 40 ? 'bg-blue-500' : 'bg-slate-400'}`} style={{width: `${lead.probability}%`}}></div>
    </div>
  </div>
);

const LeadActionMenu = ({ isOpen, onClose, onEdit, onShare, onDelete }: any) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose(); };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  return (
    <div ref={menuRef} className="absolute right-8 top-8 w-32 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button onClick={() => { onEdit(); onClose(); }} className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Pencil size={12} /> Edit</button>
        <button onClick={() => { onShare(); onClose(); }} className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"><Share2 size={12} /> Share</button>
        <div className="h-px bg-slate-100 my-1" />
        <button onClick={() => { onDelete(); onClose(); }} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={12} /> Delete</button>
    </div>
  );
};

const CreateLeadModal = ({ isOpen, onClose, onCreate }: any) => {
    const [formData, setFormData] = useState<Partial<Lead>>({ name: '', clientType: 'Individual', status: 'New', value: 0, probability: 20 });
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                 <h2 className="text-lg font-bold text-slate-900 mb-4">Add New Lead</h2>
                 <div className="space-y-3">
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={formData.clientType} onChange={e => setFormData({...formData, clientType: e.target.value})}>
                        <option value="Individual">Individual</option>
                        <option value="Company">Company</option>
                    </select>
                    {formData.clientType === 'Company' && <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Company Name" value={formData.company || ''} onChange={e => setFormData({...formData, company: e.target.value})} />}
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Value ($)" type="number" value={formData.value || ''} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
                 </div>
                 <div className="flex justify-end gap-2 mt-6">
                     <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button>
                     <button onClick={() => onCreate({...formData, id: `LEAD-${Date.now()}`})} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">Create Lead</button>
                 </div>
             </div>
        </div>
    );
}

const EditLeadModal = ({ isOpen, onClose, lead, onSave }: any) => {
    const [formData, setFormData] = useState<Lead>(lead);
    useEffect(() => setFormData(lead), [lead]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                 <h2 className="text-lg font-bold text-slate-900 mb-4">Edit Lead</h2>
                 <div className="space-y-3">
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                        {['New', 'Contacted', 'Qualified', 'Proposal Made', 'Negotiation Started', 'Won', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Value ($)" type="number" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value)})} />
                 </div>
                 <div className="flex justify-end gap-2 mt-6">
                     <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button>
                     <button onClick={() => onSave(formData)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">Save Changes</button>
                 </div>
             </div>
        </div>
    );
}

const LeadsView = () => { 
    const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS); 
    const [isNewLeadOpen, setIsNewLeadOpen] = useState(false); 
    const [editingLead, setEditingLead] = useState<Lead | null>(null); 
    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null); 
    const [viewMode, setViewMode] = useState<'Kanban' | 'List'>('Kanban'); 
    const statuses = ['New', 'Contacted', 'Qualified', 'Proposal Made', 'Negotiation Started', 'Won', 'Lost']; 
    
    const handleUpdateLead = (updated: Lead) => { 
        setLeads(leads.map(l => l.id === updated.id ? updated : l)); 
        setEditingLead(null); 
    }; 
    
    const handleDeleteLead = (id: string) => { 
        if (confirm('Are you sure you want to delete this lead?')) { 
            setLeads(leads.filter(l => l.id !== id)); 
        } 
    }; 
    
    return (
        <div className="h-full flex flex-col animate-in fade-in">
            <CreateLeadModal isOpen={isNewLeadOpen} onClose={() => setIsNewLeadOpen(false)} onCreate={(lead: Lead) => { setLeads([...leads, lead]); setIsNewLeadOpen(false); }} />
            {editingLead && (<EditLeadModal isOpen={true} onClose={() => setEditingLead(null)} lead={editingLead} onSave={handleUpdateLead} />)}
            <SectionHeader title="Leads & CRM" subtitle="Manage your sales pipeline" action={
                <div className="flex gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['Kanban', 'List'].map((mode: any) => (
                            <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === mode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {mode}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setIsNewLeadOpen(true)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 flex items-center gap-2">
                        <Plus size={18} /> Add Lead
                    </button>
                </div>
            } />
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {viewMode === 'Kanban' && (
                    <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                        <div className="flex space-x-4 h-full min-w-max">
                            {statuses.map(status => (
                                <div key={status} className="w-72 bg-slate-50/50 rounded-2xl border border-slate-200/60 flex flex-col">
                                    <div className="p-3 border-b border-slate-100 font-bold text-sm text-slate-700 flex justify-between items-center bg-slate-100/50 rounded-t-2xl">
                                        {status}<span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{leads.filter(l => l.status === status).length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                        {leads.filter(l => l.status === status).map(l => <LeadCard key={l.id} lead={l} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {viewMode === 'List' && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-slate-100">Name</th>
                                        <th className="px-4 py-3 border-b border-slate-100">Client Type</th>
                                        <th className="px-4 py-3 border-b border-slate-100">Contact</th>
                                        <th className="px-4 py-3 border-b border-slate-100">Service</th>
                                        <th className="px-4 py-3 border-b border-slate-100">Status</th>
                                        <th className="px-4 py-3 border-b border-slate-100">Value</th>
                                        <th className="px-4 py-3 border-b border-slate-100">Probability</th>
                                        <th className="px-4 py-3 border-b border-slate-100 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {leads.map(lead => (
                                        <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 py-3 font-medium text-slate-800">{lead.name}</td>
                                            <td className="px-4 py-3 text-slate-500"><div className="flex flex-col"><span>{lead.clientType}</span>{lead.clientType === 'Company' && <span className="text-[10px] text-slate-400">{lead.company}</span>}</div></td>
                                            <td className="px-4 py-3 text-slate-500"><div className="flex flex-col text-xs"><span>{lead.email}</span><span>{lead.phone}</span></div></td>
                                            <td className="px-4 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">{lead.serviceType}</span></td>
                                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${lead.status === 'Won' ? 'bg-green-100 text-green-700' : lead.status === 'Lost' ? 'bg-red-50 text-red-600' : lead.status === 'New' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{lead.status}</span></td>
                                            <td className="px-4 py-3 font-medium text-slate-700">${lead.value.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-slate-500"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{width: `${lead.probability}%`}}></div></div><span className="text-xs">{lead.probability}%</span></div></td>
                                            <td className="px-4 py-3 text-right relative">
                                                <button onClick={(e) => { e.stopPropagation(); setActiveActionMenu(activeActionMenu === lead.id ? null : lead.id); }} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg"><MoreHorizontal size={16}/></button>
                                                {activeActionMenu === lead.id && (<LeadActionMenu isOpen={true} onClose={() => setActiveActionMenu(null)} onEdit={() => setEditingLead(lead)} onShare={() => alert(`Sharing lead: ${lead.name}`)} onDelete={() => handleDeleteLead(lead.id)} />)}
                                            </td>
                                        </tr>
                                    ))}
                                    {leads.length === 0 && (<tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No leads found.</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    ); 
};

const ProjectsView = ({ projects, tasks, onSelectProject, onCreateProject, onDeleteProject, onUpdateProject, onRestoreProject }: any) => {
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [notification, setNotification] = useState<{message: string, undoAction?: () => void, duration?: number} | null>(null);

    const filteredProjects = projects.filter((p: Project) => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const handleAction = (action: string, project: Project) => {
        if (action === 'share') {
            setNotification({ message: `Shared "${project.title}" successfully.` });
        } else if (action === 'clone') {
            const payload: NewProjectPayload = {
                title: `Copy of ${project.title}`,
                category: project.category,
                startDate: project.startDate,
                endDate: project.endDate,
                budget: project.budget.total,
                description: project.description || '',
                clientType: project.clientType,
                companyName: project.companyName,
                clientName: project.clientName,
                clientEmail: project.clientEmail,
                clientStdCode: project.clientStdCode,
                clientPhone: project.clientPhone,
                status: 'Draft',
                riskLevel: project.riskLevel
            };
            onCreateProject(payload);
            setNotification({ message: 'Project cloned successfully.' });
        } else if (action === 'archive') {
            if (confirm(`Archive "${project.title}"?`)) {
                onUpdateProject({ ...project, status: 'Archived' });
                setNotification({ message: 'Project archived.' });
            }
        } else if (action === 'delete') {
            if (confirm(`Are you sure you want to delete "${project.title}"?`)) {
                onDeleteProject(project.id);
                setNotification({
                    message: 'Project deleted.',
                    duration: 10000,
                    undoAction: () => {
                        onRestoreProject(project);
                        setNotification(null);
                    }
                });
            }
        }
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in relative">
             {notification && (
                <NotificationToast 
                    message={notification.message} 
                    onUndo={notification.undoAction} 
                    onClose={() => setNotification(null)}
                    duration={notification.duration} 
                />
             )}
             <SectionHeader 
                title="Projects" 
                subtitle="Manage your engagements" 
                action={
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search projects..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary w-64 transition-all"
                            />
                        </div>
                        <button onClick={() => setIsNewOpen(true)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 flex items-center gap-2">
                            <Plus size={18} /> New Project
                        </button>
                    </div>
                } 
             />
             <CreateProjectModal 
                isOpen={isNewOpen} 
                onClose={() => setIsNewOpen(false)} 
                onCreate={(payload: NewProjectPayload) => { onCreateProject(payload); setIsNewOpen(false); }} 
             />
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
                 {filteredProjects.map((p: Project) => (
                    <ProjectCard 
                        key={p.id} 
                        project={p} 
                        onClick={() => onSelectProject(p.id)} 
                        onAction={handleAction} 
                    />
                 ))}
                 {filteredProjects.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        <p>No projects found matching "{searchQuery}"</p>
                    </div>
                 )}
             </div>
        </div>
    );
};

// --- NEW COMPONENT: PlaybookStepEditor ---
const PlaybookStepEditor = ({ isOpen, onClose, step, onSave }: any) => {
    const [formData, setFormData] = useState<PlaybookStep>(step || {
        id: `step-${Date.now()}`,
        order: 0,
        channel: 'email',
        trigger: { type: 'delay', value: 1, unit: 'days' },
        content: ''
    });
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (step) setFormData(step);
    }, [step]);

    const handleRefineContent = async () => {
        if (!formData.content) return;
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Refine the following message content for a ${formData.channel} sequence. Make it professional, engaging, and clear. Maintain placeholders like {{lead_name}}.
                
                Content: "${formData.content}"`,
            });
            const text = response.text?.trim();
            if (text) setFormData(prev => ({ ...prev, content: text }));
        } catch (e) {
            console.error("Content refinement failed", e);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800">
                        {step ? 'Edit Step' : 'Add Step'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Channel</label>
                            <select 
                                value={formData.channel} 
                                onChange={e => setFormData({...formData, channel: e.target.value as any})}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white"
                            >
                                <option value="email">Email</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="voice">Voice Call</option>
                                <option value="internal_task">Internal Task</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Delay After Previous</label>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    value={formData.trigger.value} 
                                    onChange={e => setFormData({...formData, trigger: {...formData.trigger, value: parseInt(e.target.value) || 0}})}
                                    className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary text-center"
                                />
                                <select 
                                    value={formData.trigger.unit} 
                                    onChange={e => setFormData({...formData, trigger: {...formData.trigger, unit: e.target.value as any}})}
                                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white"
                                >
                                    <option value="hours">Hours</option>
                                    <option value="days">Days</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Message Content</label>
                            <button 
                                onClick={handleRefineContent} 
                                disabled={isGenerating || !formData.content}
                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                            >
                                {isGenerating ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12} />}
                                Refine with AI
                            </button>
                        </div>
                        <textarea 
                            value={formData.content} 
                            onChange={e => setFormData({...formData, content: e.target.value})}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-40 font-mono leading-relaxed" 
                            placeholder={formData.channel === 'internal_task' ? "Describe the task..." : "Enter message template..."}
                        />
                        <div className="flex gap-2 mt-2">
                            {['{{lead_name}}', '{{company}}', '{{portfolio_link}}'].map(tag => (
                                <button 
                                    key={tag} 
                                    onClick={() => setFormData(prev => ({...prev, content: prev.content + ' ' + tag}))}
                                    className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200 font-mono"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
                    <button onClick={() => onSave(formData)} className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-colors">Save Step</button>
                </div>
            </div>
        </div>
    );
};

// --- UPDATED PlaybookDetailView ---
const PlaybookDetailView = ({ playbook, onBack, onUpdate }: any) => {
    const [optimizing, setOptimizing] = useState(false);
    const [editingStep, setEditingStep] = useState<PlaybookStep | null>(null);
    const [isStepEditorOpen, setIsStepEditorOpen] = useState(false);
    const [suggesting, setSuggesting] = useState(false);

    const handleAddStep = () => {
        setEditingStep(null); // Clear for new step
        setIsStepEditorOpen(true);
    };

    const handleEditStep = (step: PlaybookStep) => {
        setEditingStep(step);
        setIsStepEditorOpen(true);
    };

    const handleSaveStep = (step: PlaybookStep) => {
        let newSteps = [...playbook.steps];
        if (editingStep) {
            // Update existing
            newSteps = newSteps.map(s => s.id === step.id ? step : s);
        } else {
            // Add new
            newSteps.push({ ...step, order: newSteps.length + 1 });
        }
        onUpdate({ ...playbook, steps: newSteps });
        setIsStepEditorOpen(false);
    };

    const handleDeleteStep = (id: string) => {
        if(confirm('Delete this step?')) {
            const newSteps = playbook.steps.filter((s:any) => s.id !== id).map((s:any, idx: number) => ({...s, order: idx + 1}));
            onUpdate({ ...playbook, steps: newSteps });
        }
    };

    const handleMoveStep = (index: number, direction: 'up' | 'down') => {
        const newSteps = [...playbook.steps];
        if (direction === 'up' && index > 0) {
            [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
        } else if (direction === 'down' && index < newSteps.length - 1) {
            [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
        }
        // Reassign orders
        const reordered = newSteps.map((s, i) => ({ ...s, order: i + 1 }));
        onUpdate({ ...playbook, steps: reordered });
    };

    const handleAiSuggestNextStep = async () => {
        setSuggesting(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Based on the following playbook, suggest the ONE next logical step.
            Playbook Name: ${playbook.name}
            Description: ${playbook.description}
            Current Steps: ${JSON.stringify(playbook.steps.map((s:any) => ({channel: s.channel, content: s.content})))}
            
            Return ONLY a valid JSON object for the step with keys: "channel" (email|whatsapp|voice|internal_task), "delayValue" (number), "delayUnit" (hours|days), "content" (string).`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            
            const text = response.text?.trim();
            if (text) {
                const suggestion = JSON.parse(text);
                const newStep: PlaybookStep = {
                    id: `s-ai-${Date.now()}`,
                    order: playbook.steps.length + 1,
                    channel: suggestion.channel || 'email',
                    trigger: { 
                        type: 'delay', 
                        value: suggestion.delayValue || 1, 
                        unit: suggestion.delayUnit || 'days' 
                    },
                    content: suggestion.content || 'Follow up...'
                };
                onUpdate({ ...playbook, steps: [...playbook.steps, newStep] });
            }
        } catch (e) {
            console.error("AI Suggestion Error", e);
            alert("Could not generate suggestion. Please try again.");
        } finally {
            setSuggesting(false);
        }
    };

    const handleOptimize = async () => {
        setOptimizing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Analyze and optimize this playbook for better lead conversion. 
            Improve the message content for clarity and persuasion. Adjust delays if they seem too long or too short.
            
            Input Playbook: ${JSON.stringify(playbook.steps)}
            
            Return ONLY a JSON array of the optimized steps with the exact same structure (id, order, channel, trigger, content).`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const text = response.text?.trim();
            if (text) {
                const optimizedSteps = JSON.parse(text);
                if (Array.isArray(optimizedSteps)) {
                    onUpdate({ ...playbook, steps: optimizedSteps });
                    alert("Playbook optimized successfully!");
                }
            }
        } catch (e) {
            console.error("Optimization Error", e);
            alert("Optimization failed. Please try again.");
        } finally {
            setOptimizing(false);
        }
    };

    return (
    <div className="h-full p-6 flex flex-col bg-slate-50 relative">
        <PlaybookStepEditor 
            isOpen={isStepEditorOpen} 
            onClose={() => setIsStepEditorOpen(false)} 
            step={editingStep}
            onSave={handleSaveStep}
        />

        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-white rounded-xl text-slate-500 hover:text-slate-800 transition-all shadow-sm border border-transparent hover:border-slate-200">
                    <ChevronLeft size={20}/>
                </button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-slate-900">{playbook.name}</h1>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${playbook.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                            {playbook.isActive ? 'Active' : 'Draft'}
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">{playbook.description}</p>
                </div>
            </div>
            <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Save size={16} /> Save Changes
            </button>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Steps Timeline */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800">Sequence Steps</h3>
                    <button onClick={handleAddStep} className="text-primary text-sm font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <Plus size={16} /> Add Step
                    </button>
                </div>
                
                <div className="space-y-6 relative pl-4 pb-10">
                    <div className="absolute left-[27px] top-4 bottom-0 w-0.5 bg-slate-100" />
                    {playbook.steps.sort((a:any, b:any) => a.order - b.order).map((step: any, idx: number) => (
                        <div key={step.id} className="relative flex gap-4 group">
                            <div className="z-10 w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 mt-1 shadow-sm group-hover:border-primary group-hover:text-primary transition-colors">
                                {idx + 1}
                            </div>
                            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 hover:shadow-md hover:border-slate-200 transition-all group/card">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${
                                            step.channel === 'whatsapp' ? 'bg-green-100 text-green-600' :
                                            step.channel === 'email' ? 'bg-blue-100 text-blue-600' :
                                            step.channel === 'voice' ? 'bg-purple-100 text-purple-600' :
                                            'bg-slate-200 text-slate-600'
                                        }`}>
                                            {step.channel === 'whatsapp' && <MessageCircle size={14} />}
                                            {step.channel === 'email' && <Mail size={14} />}
                                            {step.channel === 'voice' && <Phone size={14} />}
                                            {step.channel === 'internal_task' && <CheckSquare size={14} />}
                                        </div>
                                        <span className="font-bold text-sm text-slate-700 capitalize">{step.channel.replace('_', ' ')}</span>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-100 ml-2">
                                            <Clock size={12} />
                                            <span>Wait {step.trigger.value} {step.trigger.unit}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <button onClick={() => handleMoveStep(idx, 'up')} disabled={idx === 0} className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 hover:bg-white rounded-lg transition-colors"><ArrowUp size={14}/></button>
                                        <button onClick={() => handleMoveStep(idx, 'down')} disabled={idx === playbook.steps.length - 1} className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 hover:bg-white rounded-lg transition-colors"><ArrowDown size={14}/></button>
                                        <button onClick={() => handleEditStep(step)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"><Pencil size={14}/></button>
                                        <button onClick={() => handleDeleteStep(step.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100 font-mono whitespace-pre-wrap leading-relaxed">
                                    {step.content}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* AI Suggest Button at the end of timeline */}
                    <div className="relative flex gap-4">
                        <div className="z-10 w-6 h-6 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-500 shrink-0 mt-1">
                            <Sparkles size={12} />
                        </div>
                        <button 
                            onClick={handleAiSuggestNextStep}
                            disabled={suggesting}
                            className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-3 rounded-xl border border-indigo-100 border-dashed w-full transition-all text-left"
                        >
                            {suggesting ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14} />}
                            {suggesting ? 'Analyzing flow...' : 'AI Suggest Next Step'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Sidebar */}
            <div className="w-80 flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h4 className="font-bold text-sm text-slate-500 uppercase mb-4">Performance</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <div className="text-2xl font-bold text-blue-700">{playbook.activeLeadsCount}</div>
                            <div className="text-[10px] font-bold text-blue-400 uppercase mt-1">Active Leads</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl">
                            <div className="text-2xl font-bold text-green-700">68%</div>
                            <div className="text-[10px] font-bold text-green-400 uppercase mt-1">Response Rate</div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={18} className="text-yellow-300" />
                        <h4 className="font-bold text-sm uppercase tracking-wide">AI Optimizer</h4>
                    </div>
                    <p className="text-xs text-indigo-100 leading-relaxed mb-3">
                        Use our AI model to analyze step delays and content tone for maximum conversion.
                    </p>
                    <button 
                        onClick={handleOptimize}
                        disabled={optimizing}
                        className="w-full bg-white/10 hover:bg-white/20 py-2 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-2"
                    >
                        {optimizing ? <Loader2 size={14} className="animate-spin"/> : <Wand2 size={14} />}
                        {optimizing ? 'Optimizing...' : 'Optimize Playbook'}
                    </button>
                </div>
            </div>
        </div>
    </div>
    );
};

// --- PlaybooksView ---
const PlaybooksView = ({ playbooks, onSelectPlaybook, onCreatePlaybook }: any) => {
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newPbName, setNewPbName] = useState('');
  
  return (
    <div className="h-full flex flex-col p-6">
        <SectionHeader title="Playbooks" subtitle="Automate your workflows" action={
            <button onClick={() => setIsNewOpen(true)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 flex items-center gap-2"><Plus size={18} /> New Playbook</button>
        } />
        
        {isNewOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                    <h3 className="font-bold text-lg mb-4">Create Playbook</h3>
                    <input autoFocus value={newPbName} onChange={e => setNewPbName(e.target.value)} placeholder="Playbook Name" className="w-full border border-slate-200 rounded-lg p-2 mb-4 text-sm focus:outline-none focus:border-primary" />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsNewOpen(false)} className="px-4 py-2 text-slate-500 font-bold text-sm">Cancel</button>
                        <button onClick={() => { if(newPbName.trim()) { onCreatePlaybook({name: newPbName, description: 'New Playbook', leadType: 'General'}); setIsNewOpen(false); setNewPbName(''); } }} className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm">Create</button>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
            {playbooks.map((pb: Playbook) => (
                <div key={pb.id} onClick={() => onSelectPlaybook(pb)} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Zap size={20} /></div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${pb.isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{pb.isActive ? 'Active' : 'Draft'}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-primary transition-colors">{pb.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{pb.description}</p>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 border-t border-slate-50 pt-3">
                        <span className="flex items-center gap-1"><Users size={14} /> {pb.activeLeadsCount} Leads</span>
                        <span className="flex items-center gap-1"><ListIcon size={14} /> {pb.steps.length} Steps</span>
                    </div>
                </div>
            ))}
            <button onClick={() => setIsNewOpen(true)} className="border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-colors h-full min-h-[200px]">
                <Plus size={32} className="mb-2"/>
                <span className="font-bold text-sm">Create Playbook</span>
            </button>
        </div>
    </div>
  );
};

// --- App Component (Main Entry) ---

const App = () => {
  const [viewState, setViewState] = useState<ViewState>('dashboard');
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [playbooks, setPlaybooks] = useState<Playbook[]>(MOCK_PLAYBOOKS);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);

  const handleUpdateTask = (updatedTask: Task) => {
      setTasks(prev => {
          const exists = prev.find(t => t.id === updatedTask.id);
          if (exists) return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
          return [...prev, updatedTask];
      });
  };

  const handleCreateProject = (newProject: NewProjectPayload) => {
      const p: Project = {
          id: `PROJ-${Date.now()}`,
          ...newProject,
          status: newProject.status || 'Planning',
          riskLevel: newProject.riskLevel || 'Low',
          budget: { total: newProject.budget, committed: 0, spent: 0 },
          progress: 0
      };
      setProjects(prev => [...prev, p]);
  };

  const handleUpdateProject = (updated: Project) => {
      setProjects(projects.map(p => p.id === updated.id ? updated : p));
  };

  const handleDeleteProject = (id: string) => {
      setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleRestoreProject = (project: Project) => {
      setProjects(prev => [...prev, project]);
  };

  const handleCreatePlaybook = (data: any) => {
      const newPb: Playbook = {
          id: `PB-${Date.now()}`,
          name: data.name,
          description: data.description,
          leadType: data.leadType,
          isActive: false,
          steps: [],
          activeLeadsCount: 0
      };
      setPlaybooks([...playbooks, newPb]);
  };

  const handleUpdatePlaybook = (updated: Playbook) => {
      setPlaybooks(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (selectedPlaybook?.id === updated.id) {
          setSelectedPlaybook(updated);
      }
  };

  const renderContent = () => {
    if (viewState === 'projects' && selectedProject) {
        return <ProjectDetailView 
                  project={selectedProject} 
                  tasks={tasks} 
                  onBack={() => setSelectedProject(null)} 
                  onUpdateTask={handleUpdateTask} 
                  onAction={() => {}} // Pass generic action handler if needed
               />;
    }
    
    if (viewState === 'playbooks' && selectedPlaybook) {
        return <PlaybookDetailView playbook={selectedPlaybook} onBack={() => setSelectedPlaybook(null)} onUpdate={handleUpdatePlaybook} />;
    }
    
    switch (viewState) {
        case 'dashboard': return <div className="p-6">Dashboard Placeholder</div>;
        case 'tasks': return <TasksView tasks={tasks} onUpdateTask={handleUpdateTask} onAction={() => {}} />;
        case 'projects': return (
            <ProjectsView 
                projects={projects} 
                tasks={tasks} 
                onSelectProject={(id: string) => setSelectedProject(projects.find(p => p.id === id))} 
                onCreateProject={handleCreateProject} 
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
                onRestoreProject={handleRestoreProject}
            />
        );
        case 'leads': return <LeadsView />;
        case 'playbooks': return <PlaybooksView playbooks={playbooks} onSelectPlaybook={setSelectedPlaybook} onCreatePlaybook={handleCreatePlaybook} />;
        default: return <div className="p-6">View Not Found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-bgLight font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-surfaceDark text-slate-300 flex flex-col border-r border-slate-800">
        <div className="p-6 flex items-center gap-3 text-white mb-6">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-lg">S</div>
          <span className="font-bold text-lg tracking-tight">Seyal AI</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'projects', label: 'Projects', icon: Briefcase },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'leads', label: 'Leads & CRM', icon: Users },
            { id: 'playbooks', label: 'Playbooks', icon: Zap },
            { id: 'automation', label: 'Automation', icon: Bot },
            { id: 'contacts', label: 'Contacts', icon: User },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setViewState(item.id as ViewState); setSelectedProject(null); setSelectedPlaybook(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${viewState === item.id ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon size={18} className={viewState === item.id ? 'text-white' : 'text-slate-400'} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">JD</div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">John Doe</div>
                    <div className="text-xs text-slate-500 truncate">Admin Workspace</div>
                </div>
            </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-bgLight relative">
        {renderContent()}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}