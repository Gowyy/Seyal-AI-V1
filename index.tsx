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
  GripVertical, Wand2, Search, MoreVertical, Folder, ArrowUp, ArrowDown,
  ShieldAlert, Target, DollarSign, Rocket
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
  [key: string]: any;
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
  initialTasks?: Partial<Task>[];
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

// ... [TaskRow, KanbanColumn, CalendarBoard, TaskDetailPanel Components] ...
const TaskRow = ({ task, onUpdateTask, onAction, onEdit }: any) => {
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
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-100">
                {days.map(d => <div key={d} className="py-2 text-center text-xs font-bold text-slate-500 uppercase">{d}</div>)}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-y-auto">
                {Array.from({length: 35}).map((_, i) => { 
                    const date = new Date(); 
                    date.setDate(date.getDate() - date.getDay() + i); 
                    const dateStr = date.toISOString().split('T')[0]; 
                    const dayTasks = tasks.filter((t: any) => t.dueDate === dateStr); 
                    const isToday = dateStr === today.toISOString().split('T')[0]; 
                    return (
                        <div key={i} onClick={() => onNewTaskWithDate(dateStr)} className={`border-b border-r border-slate-50 p-1 min-h-[100px] hover:bg-slate-50 transition-colors cursor-pointer group relative ${isToday ? 'bg-blue-50/30' : ''}`}>
                            <span className={`text-xs font-bold p-1 rounded-full w-6 h-6 flex items-center justify-center ${isToday ? 'bg-blue-600 text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>{date.getDate()}</span>
                            <div className="mt-1 space-y-1">
                                {dayTasks.map((t: any) => (
                                    <div key={t.id} onClick={(e) => { e.stopPropagation(); onEditTask(t); }} className={`text-[10px] px-1.5 py-1 rounded border truncate ${t.status === 'Done' ? 'bg-slate-100 text-slate-400 line-through border-slate-200' : 'bg-white border-blue-100 text-blue-700 shadow-sm'}`}>
                                        {t.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ); 
                })}
            </div>
        </div>
    );
};

const CustomSchedule = ({ settings, onUpdate }: any) => {
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
            <div className="flex flex-col gap-2"><div className="relative" ref={listDropdownRef}><button onClick={() => setIsListOpen(!isListOpen)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"><ListIcon size={12} /><span>{formData.list || 'General'}</span><ChevronDown size={12} /></button>{isListOpen && (<div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">{!isCreatingList ? (<div className="max-h-60 overflow-y-auto custom-scrollbar p-1"><div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase">Select List</div>{[...AVAILABLE_LISTS, ...(formData.list && !AVAILABLE_LISTS.includes(formData.list) ? [formData.list] : [])].map(l => (<button key={l} onClick={() => { updateField('list', l); setIsListOpen(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center justify-between ${formData.list === l ? 'text-primary font-bold bg-slate-50' : 'text-slate-600'}`}>{l}{formData.list === l && <Check size={14} />}</button>))}<div className="h-px bg-slate-100 my-1" /><button onClick={() => setIsCreatingList(true)} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-primary font-bold flex items-center gap-2"><Plus size={14} /> Create New List...</button></div>) : (<div className="p-3"><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">New List Name</label><div className="flex gap-2"><input autoFocus value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateNewList()} className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary" placeholder="e.g. Q4 Strategy" /><button onClick={handleCreateNewList} disabled={!newListName.trim()} className="p-1.5 bg-primary text-white rounded-lg disabled:opacity-50"><Check size={16} /></button><button onClick={() => { setIsCreatingList(false); setNewListName(''); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={16} /></button></div></div>)}</div>)}</div><div className="flex items-start gap-3"><input type="checkbox" checked={formData.status === 'Done'} onChange={() => updateField('status', formData.status === 'Done' ? 'Todo' : 'Done')} className="h-6 w-6 mt-1 rounded-full border-2 border-slate-300 checked:bg-primary" /><textarea value={formData.title} onChange={(e) => updateField('title', e.target.value)} onBlur={autoCategorizeList} className="w-full text-2xl font-bold border-none p-0 focus:ring-0 resize-none" placeholder="Task Name" rows={2} /></div></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Description</label><textarea value={formData.description} onChange={(e) => updateField('description', e.target.value)} onBlur={autoGenerateTags} className="w-full bg-slate-50 rounded-xl p-4 min-h-[100px] text-sm mb-3" placeholder="Add details..." /><div className="flex flex-wrap items-center gap-2">{(formData.tags || []).map(tag => (<span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 group">{tag}<button onClick={() => removeTag(tag)} className="ml-1.5 text-indigo-400 hover:text-indigo-600"><X size={12} /></button></span>))}{isTagInputVisible ? (<div className="flex items-center gap-1"><input autoFocus value={tagInputValue} onChange={(e) => setTagInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag()} onBlur={() => { if(tagInputValue) addTag(); else setIsTagInputVisible(false); }} className="w-24 px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-primary" placeholder="#tag" /></div>) : (<button onClick={() => setIsTagInputVisible(true)} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"><Plus size={12} className="mr-1" /> Add Tag</button>)}</div></div>
            <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-4"><div className="flex gap-3"><div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Assignee</label><select value={formData.assignee} onChange={(e) => updateField('assignee', e.target.value)} className="w-full bg-slate-50 p-2 rounded-lg text-sm"><option value="Me">Me</option><option value="AI Agent">AI Agent</option><option value="Team">Team</option></select></div><div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Due Date</label><div className="flex gap-2"><CustomDatePicker value={formData.dueDate} onChange={(val: any) => updateField('dueDate', val)} compact className="flex-1" /><CustomTimePicker value={formData.dueTime || ''} onChange={(val: any) => updateField('dueTime', val)} compact className="w-20" /></div></div></div><div><div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-slate-500">Priority</label><button onClick={handleAiSuggestPriority} disabled={isAiSuggesting || !formData.title} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors">{isAiSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Suggest</button></div><div className="flex gap-2">{['Low', 'Medium', 'High', 'Urgent'].map(p => (<button key={p} onClick={() => updateField('priority', p)} className={`flex-1 py-2 rounded-lg border text-xs font-bold ${formData.priority === p ? 'bg-slate-100 border-slate-300 text-slate-800' : 'border-slate-100 text-slate-400'}`}>{p}</button>))}</div></div><div><div className="flex justify-between mb-2 items-center"><div className="flex items-center gap-2"><h3 className="font-bold text-sm">Subtasks</h3><span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-bold">{formData.subtasks?.filter(s => s.completed).length || 0}/{formData.subtasks?.length || 0}</span></div><button onClick={handleAiSuggestSubtasks} disabled={isAiSuggesting || !formData.title} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors bg-indigo-50 px-2 py-1 rounded-lg">{isAiSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate</button></div><div className="space-y-0 relative pl-2">{(formData.subtasks?.length || 0) > 1 && (<div className="absolute left-[17px] top-4 bottom-4 w-px bg-slate-200" />)}{formData.subtasks?.map((st, idx) => (<div key={st.id} className="relative flex gap-3 items-start py-2 group"><div onClick={() => { const newSt = formData.subtasks.map(s => s.id === st.id ? {...s, completed: !s.completed} : s); updateField('subtasks', newSt); }} className={`z-10 mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${st.completed ? 'bg-primary border-primary text-white' : 'bg-white border-slate-300 hover:border-primary'}`}>{st.completed && <Check size={10} strokeWidth={4} />}</div><input value={st.text} onChange={(e) => { const newSt = formData.subtasks.map(s => s.id === st.id ? {...s, text: e.target.value} : s); updateField('subtasks', newSt); }} className={`flex-1 bg-transparent text-sm border-none p-0 focus:ring-0 ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`} placeholder="Milestone step..." /><div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => moveSubtask(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded hover:bg-slate-100"><ArrowUp size={12}/></button><button onClick={() => moveSubtask(idx, 'down')} disabled={idx === (formData.subtasks?.length || 0) - 1} className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 rounded hover:bg-slate-100"><ArrowDown size={12}/></button><button onClick={() => deleteSubtask(st.id)} className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"><X size={12}/></button></div></div>))}</div><button onClick={() => updateField('subtasks', [...(formData.subtasks || []), {id: Date.now().toString(), text: '', completed: false}])} className="flex items-center gap-1 text-primary text-sm font-bold mt-2 hover:bg-blue-50 px-2 py-1 rounded transition-colors w-full justify-center border border-dashed border-blue-200"><Plus size={14} /> Add Subtask</button></div><div className="flex justify-between items-center"><div className="flex items-center gap-2"><Bot size={18} className="text-purple-500"/><span className="text-sm font-bold">AI Coordination</span></div><Toggle enabled={formData.aiCoordination} onToggle={() => updateField('aiCoordination', !formData.aiCoordination)} size="sm" /></div>{formData.aiCoordination && (<div className="space-y-3 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300"><div className={`p-3 rounded-xl border transition-all duration-200 ${formData.aiChannels.whatsapp ? 'bg-green-50/50 border-green-200' : 'bg-slate-50 border-slate-100'}`}><div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${formData.aiChannels.whatsapp ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}><MessageCircle size={14} /></div><span className={`text-sm font-bold ${formData.aiChannels.whatsapp ? 'text-green-900' : 'text-slate-500'}`}>WhatsApp Updates</span></div><Toggle enabled={formData.aiChannels.whatsapp} onToggle={() => setFormData(p => ({...p, aiChannels: {...p.aiChannels, whatsapp: !p.aiChannels.whatsapp}}))} size="sm"/></div>{formData.aiChannels.whatsapp && (<div className="pl-9"><MultiSelectDropdown label="Trigger Events" options={WHATSAPP_TRIGGERS} selected={formData.aiChannels.whatsappSettings?.triggers || []} onChange={(triggers: any) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, whatsappSettings: {...p.aiChannels.whatsappSettings, triggers}}}))} /><CustomSchedule settings={formData.aiChannels.whatsappSettings} onUpdate={(s: any) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, whatsappSettings: s}}))} /></div>)}</div><div className={`p-3 rounded-xl border transition-all duration-200 ${formData.aiChannels.voice ? 'bg-purple-50/50 border-purple-200' : 'bg-slate-50 border-slate-100'}`}><div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2"><div className={`p-1.5 rounded-lg ${formData.aiChannels.voice ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'}`}><Phone size={14} /></div><span className={`text-sm font-bold ${formData.aiChannels.voice ? 'text-purple-900' : 'text-slate-500'}`}>Voice Assistant</span></div><Toggle enabled={formData.aiChannels.voice} onToggle={() => setFormData(p => ({...p, aiChannels: {...p.aiChannels, voice: !p.aiChannels.voice}}))} size="sm"/></div>{formData.aiChannels.voice && (<div className="pl-9"><MultiSelectDropdown label="Call Triggers" options={VOICE_TRIGGERS} selected={formData.aiChannels.voiceSettings?.triggers || []} onChange={(triggers: any) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, voiceSettings: {...p.aiChannels.voiceSettings, triggers}}}))} /><CustomSchedule settings={formData.aiChannels.voiceSettings} onUpdate={(s: any) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, voiceSettings: s}}))} /></div>)}</div></div>)}<div className="flex justify-between items-center"><div className="flex items-center gap-2"><Repeat size={18} className="text-blue-500"/><span className="text-sm font-bold">Recurring Task</span></div><Toggle enabled={formData.recurrence?.enabled || false} onToggle={() => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, enabled: !prev.recurrence?.enabled}}))} size="sm" /></div>{formData.recurrence?.enabled && (<div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3 animate-in slide-in-from-top-2"><div className="flex gap-3"><div className="flex-1"><label className="block text-[10px] font-bold text-blue-900/60 uppercase mb-1">Frequency</label><select value={formData.recurrence.frequency} onChange={(e) => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, frequency: e.target.value}}))} className="w-full bg-white border border-blue-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-blue-400 text-blue-900 font-medium"><option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option><option value="Yearly">Yearly</option></select></div><div className="w-20"><label className="block text-[10px] font-bold text-blue-900/60 uppercase mb-1">Every</label><div className="flex items-center bg-white border border-blue-200 rounded-lg px-2 py-1.5"><input type="number" value={formData.recurrence.interval} onChange={(e) => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, interval: parseInt(e.target.value) || 1}}))} className="w-full text-xs focus:outline-none text-blue-900 font-medium" min="1" /><span className="text-[10px] text-blue-400 ml-1">{formData.recurrence.frequency === 'Daily' ? 'days' : formData.recurrence.frequency === 'Weekly' ? 'wks' : formData.recurrence.frequency === 'Monthly' ? 'mos' : 'yrs'}</span></div></div></div><div><label className="block text-[10px] font-bold text-blue-900/60 uppercase mb-1">End Date (Optional)</label><CustomDatePicker value={formData.recurrence.endDate || ''} onChange={(val: any) => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, endDate: val}}))} compact className="w-full" /></div></div>)}
            {formData.aiHistory && formData.aiHistory.length > 0 && (<div className="pt-4 mt-2 border-t border-slate-100 animate-in fade-in"><div className="flex items-center gap-2 mb-4"><div className="p-1 rounded bg-slate-100 text-slate-500"><HistoryIcon size={14} /></div><span className="text-xs font-bold text-slate-600 uppercase tracking-wide">AI History</span></div><div className="space-y-0 pl-1">{formData.aiHistory.map((item, idx) => (<div key={item.id || idx} className="relative pl-5 pb-4 border-l border-slate-200 last:border-0 last:pb-0 group"><div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ring-slate-100 transition-colors ${item.status === 'success' ? 'bg-green-500' : item.status === 'failure' ? 'bg-red-500' : 'bg-slate-300'}`}></div><div className="flex justify-between items-start mb-1"><span className={`text-xs font-bold ${item.status === 'failure' ? 'text-red-600' : 'text-slate-700'}`}>{item.action}</span><span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(item.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span></div><div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">{item.details}</div></div>))}</div></div>)}
            </div>
        </main>
      </div>
    </div>
  );
};

// --- NEW COMPONENT: AiTaskCreatorModal ---
const AiTaskCreatorModal = ({ isOpen, onClose, onSave, projectId }: any) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!input.trim()) return;
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `You are a helpful project assistant.
            Extract task details from the following description.
            Current Date: ${new Date().toISOString().split('T')[0]}
            
            Description: "${input}"
            
            Return JSON with keys: 
            - title (string)
            - description (string, summarize if needed)
            - priority (Low, Medium, High, Urgent)
            - dueDate (YYYY-MM-DD string, if mentioned, else empty string)
            - dueTime (HH:MM string, if mentioned, else empty string)
            
            Default priority is Medium. If no due date is mentioned, leave it empty.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            
            const text = response.text?.trim();
            if (text) {
                const data = JSON.parse(text);
                const newTask: Task = {
                    id: `TASK-${Date.now()}`,
                    projectId: projectId,
                    title: data.title || 'New Task',
                    status: 'Todo',
                    priority: data.priority || 'Medium',
                    assignee: 'Me',
                    assignmentType: 'Self',
                    dueDate: data.dueDate || new Date().toISOString().split('T')[0],
                    dueTime: data.dueTime || '',
                    description: data.description || input,
                    tags: [],
                    subtasks: [],
                    dependencies: [],
                    recurrence: { enabled: false, frequency: 'Weekly', interval: 1 },
                    aiCoordination: false,
                    aiChannels: { whatsapp: false, email: false, voice: false },
                    aiHistory: [],
                    budget: { planned: 0, agreed: 0, advance: 0, status: 'None', paymentDueDate: '' },
                    list: 'General'
                };
                onSave(newTask);
                onClose();
                setInput('');
            }
        } catch (e) {
            console.error("AI Task Generation Failed", e);
            alert("Failed to generate task. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 border border-purple-100">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-purple-600">
                        <Sparkles size={20} />
                        <h3 className="font-bold text-lg">Magic Task Creator</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                
                <p className="text-slate-500 text-sm mb-4">Describe your task naturally, and AI will structure it for you.</p>
                
                <textarea 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g., Review the Q3 marketing budget by Friday urgent..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 min-h-[120px] resize-none mb-4 font-medium text-slate-700"
                    autoFocus
                />

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                    <button 
                        onClick={handleGenerate} 
                        disabled={loading || !input.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        {loading ? 'Generating...' : 'Generate Task'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- NEW COMPONENT: NewProjectModal ---
const NewProjectModal = ({ isOpen, onClose, onCreate }: any) => {
    const [formData, setFormData] = useState({
        title: '',
        category: 'General',
        budget: 0,
        status: 'Planning',
        riskLevel: 'Low',
        startDate: '',
        endDate: '',
        clientType: 'Individual',
        clientName: '',
        companyName: '',
        clientEmail: '',
        clientStdCode: '+1',
        clientPhone: '',
        description: ''
    });

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!formData.title) {
            alert('Project Title is required');
            return;
        }
        onCreate(formData);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">New Project</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Project Title</label>
                        <input 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                            placeholder="Project Name" 
                            autoFocus
                        />
                    </div>

                    {/* Category & Budget */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                            <select 
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white"
                            >
                                <option>General</option>
                                <option>Marketing</option>
                                <option>Operations</option>
                                <option>Engineering</option>
                                <option>Sales</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Total Budget</label>
                            <input 
                                type="number"
                                value={formData.budget}
                                onChange={e => setFormData({...formData, budget: parseFloat(e.target.value) || 0})}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary"
                                placeholder="0"
                            />
                        </div>
                    </div>

                     {/* Status & Risk */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                            <select 
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white"
                            >
                                <option value="Planning">Planning</option>
                                <option value="Draft">Draft</option>
                                <option value="Execution">Execution</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Risk Level</label>
                            <select 
                                value={formData.riskLevel}
                                onChange={e => setFormData({...formData, riskLevel: e.target.value})}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Start Date</label>
                            <input 
                                type="date"
                                value={formData.startDate}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">End Date</label>
                             <input 
                                type="date"
                                value={formData.endDate}
                                onChange={e => setFormData({...formData, endDate: e.target.value})}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* Client Details */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-xs font-bold text-slate-500 uppercase">Client Details</label>
                             <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-bold">
                                <button 
                                    onClick={() => setFormData({...formData, clientType: 'Individual'})}
                                    className={`px-3 py-1 rounded-md transition-all ${formData.clientType === 'Individual' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                                >
                                    Individual
                                </button>
                                <button 
                                     onClick={() => setFormData({...formData, clientType: 'Company'})}
                                     className={`px-3 py-1 rounded-md transition-all ${formData.clientType === 'Company' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                                >
                                    Company
                                </button>
                             </div>
                        </div>
                        <div className="space-y-3">
                            {formData.clientType === 'Company' && (
                                <input 
                                    value={formData.companyName}
                                    onChange={e => setFormData({...formData, companyName: e.target.value})}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary"
                                    placeholder="Company Name"
                                />
                            )}
                            <input 
                                value={formData.clientName}
                                onChange={e => setFormData({...formData, clientName: e.target.value})}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary"
                                placeholder={formData.clientType === 'Company' ? "Point of Contact Name" : "Client Name"}
                            />
                            <div className="flex gap-3">
                                <input 
                                    value={formData.clientEmail}
                                    onChange={e => setFormData({...formData, clientEmail: e.target.value})}
                                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary"
                                    placeholder="Email Address"
                                />
                                <div className="flex w-1/3 gap-2">
                                     <input 
                                        value={formData.clientStdCode}
                                        onChange={e => setFormData({...formData, clientStdCode: e.target.value})}
                                        className="w-16 border border-slate-200 rounded-xl px-2 py-2.5 text-sm font-medium focus:outline-none focus:border-primary text-center"
                                        placeholder="+1"
                                    />
                                     <input 
                                        value={formData.clientPhone}
                                        onChange={e => setFormData({...formData, clientPhone: e.target.value})}
                                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary"
                                        placeholder="Mobile"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                        <textarea 
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary min-h-[100px] resize-none"
                            placeholder="Describe the project goal..."
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleSubmit} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">Create Project</button>
                </div>
            </div>
        </div>
    );
}

// --- PLAYBOOKS COMPONENTS ---

const PlaybookGeneratorModal = ({ isOpen, onClose, onGenerate }: any) => {
    const [goal, setGoal] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!goal.trim()) return;
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Create a multi-step automation playbook for the following goal: "${goal}".
            Return ONLY a JSON object with this structure:
            {
              "name": "Creative Name",
              "description": "Short description",
              "leadType": "Target audience type",
              "steps": [
                {
                  "channel": "email" | "whatsapp" | "voice" | "internal_task",
                  "trigger": { "value": number, "unit": "hours" | "days" },
                  "content": "Message body or task description"
                }
              ]
            }
            Create at least 3-5 steps with varied channels and logical delays.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            const text = response.text?.trim();
            if (text) {
                const data = JSON.parse(text);
                onGenerate(data);
                onClose();
            }
        } catch (e) {
            console.error("Playbook generation failed", e);
            alert("Failed to generate playbook. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 border border-indigo-100">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-indigo-600">
                        <Sparkles size={20} />
                        <h3 className="font-bold text-lg">AI Playbook Generator</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                
                <p className="text-slate-500 text-sm mb-4">Describe your automation goal (e.g., "Nurture real estate leads for 2 weeks" or "Follow up after a missed call"). AI will build the workflow.</p>
                
                <textarea 
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="e.g., Send a welcome email immediately, then a WhatsApp check-in after 2 days..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 min-h-[120px] resize-none mb-4 font-medium text-slate-700"
                    autoFocus
                />

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                    <button 
                        onClick={handleGenerate} 
                        disabled={loading || !goal.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        {loading ? 'Generating Workflow...' : 'Generate Playbook'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PlaybookEditor = ({ playbook, onSave, onBack }: any) => {
    const [data, setData] = useState<Playbook>(playbook);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);

    const updateStep = (id: string, updates: any) => {
        setData(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
    };

    const addStep = () => {
        const newStep: PlaybookStep = {
            id: `step-${Date.now()}`,
            order: data.steps.length + 1,
            channel: 'email',
            trigger: { type: 'delay', value: 1, unit: 'days' },
            content: ''
        };
        setData(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
        setEditingStepId(newStep.id);
    };

    const deleteStep = (id: string) => {
        setData(prev => ({ ...prev, steps: prev.steps.filter(s => s.id !== id) }));
    };

    const handleAiRewrite = async (stepId: string, currentContent: string) => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Rewrite the following message to be more engaging, professional, and conversion-oriented. Keep placeholders like {{lead_name}}. Message: "${currentContent}"`;
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            const text = response.text?.trim();
            if (text) {
                updateStep(stepId, { content: text });
            }
        } catch (e) {
            console.error("Rewrite failed", e);
        }
    };

    const getIcon = (channel: string) => {
        switch(channel) {
            case 'email': return <Mail size={16}/>;
            case 'whatsapp': return <MessageCircle size={16}/>;
            case 'voice': return <Phone size={16}/>;
            case 'internal_task': return <CheckSquare size={16}/>;
            default: return <Bot size={16}/>;
        }
    };

    const getColor = (channel: string) => {
        switch(channel) {
            case 'email': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'whatsapp': return 'bg-green-100 text-green-600 border-green-200';
            case 'voice': return 'bg-purple-100 text-purple-600 border-purple-200';
            case 'internal_task': return 'bg-orange-100 text-orange-600 border-orange-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronLeft size={20} /></button>
                    <div>
                        <input 
                            value={data.name} 
                            onChange={(e) => setData({...data, name: e.target.value})}
                            className="text-xl font-bold text-slate-800 bg-transparent focus:outline-none focus:border-b-2 focus:border-primary"
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target:</span>
                            <input 
                                value={data.leadType} 
                                onChange={(e) => setData({...data, leadType: e.target.value})}
                                className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-transparent focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-4 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                        <span className="text-xs font-bold text-slate-500 uppercase">Status</span>
                        <Toggle enabled={data.isActive} onToggle={() => setData({...data, isActive: !data.isActive})} size="sm" />
                    </div>
                    <button onClick={() => onSave(data)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 flex items-center gap-2 transition-all">
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
                <div className="space-y-8 relative">
                    <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-200" />
                    
                    {data.steps.map((step, idx) => (
                        <div key={step.id} className="relative pl-16 group">
                            <div className={`absolute left-0 top-0 w-12 h-12 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 transition-colors ${getColor(step.channel)}`}>
                                {getIcon(step.channel)}
                            </div>
                            
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">Step {idx + 1}</span>
                                        <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                            <Clock size={12} />
                                            Wait
                                            <input 
                                                type="number" 
                                                value={step.trigger.value} 
                                                onChange={(e) => updateStep(step.id, { trigger: { ...step.trigger, value: parseInt(e.target.value) || 0 } })}
                                                className="w-10 bg-transparent text-center border-b border-slate-300 focus:border-primary focus:outline-none mx-1"
                                            />
                                            <select 
                                                value={step.trigger.unit}
                                                onChange={(e) => updateStep(step.id, { trigger: { ...step.trigger, unit: e.target.value } })}
                                                className="bg-transparent border-none focus:ring-0 text-xs font-bold p-0 cursor-pointer"
                                            >
                                                <option value="hours">Hours</option>
                                                <option value="days">Days</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => deleteStep(step.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <select 
                                            value={step.channel}
                                            onChange={(e) => updateStep(step.id, { channel: e.target.value })}
                                            className="text-sm font-bold text-slate-700 bg-slate-50 border-none rounded-lg py-1 px-2 cursor-pointer focus:ring-0"
                                        >
                                            <option value="email">Send Email</option>
                                            <option value="whatsapp">Send WhatsApp</option>
                                            <option value="voice">AI Voice Call</option>
                                            <option value="internal_task">Internal Task</option>
                                        </select>
                                        <button 
                                            onClick={() => handleAiRewrite(step.id, step.content)}
                                            className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                                            title="Rewrite with AI"
                                        >
                                            <Wand2 size={12} /> Optimize Content
                                        </button>
                                    </div>
                                    <textarea 
                                        value={step.content}
                                        onChange={(e) => updateStep(step.id, { content: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary min-h-[80px] resize-y"
                                        placeholder={step.channel === 'internal_task' ? "Task description..." : "Message template..."}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="pl-16">
                        <button 
                            onClick={addStep}
                            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:border-primary hover:text-primary hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> Add Next Step
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PlaybooksView = ({ playbooks, onCreatePlaybook, onUpdatePlaybook }: any) => {
    const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

    if (selectedPlaybook) {
        return (
            <PlaybookEditor 
                playbook={selectedPlaybook} 
                onBack={() => setSelectedPlaybook(null)}
                onSave={(updated: Playbook) => {
                    onUpdatePlaybook(updated);
                    setSelectedPlaybook(null);
                }}
            />
        );
    }

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto">
            <PlaybookGeneratorModal 
                isOpen={isGeneratorOpen} 
                onClose={() => setIsGeneratorOpen(false)}
                onGenerate={(data: any) => {
                    const newPlaybook: Playbook = {
                        id: `PB-${Date.now()}`,
                        name: data.name,
                        description: data.description,
                        leadType: data.leadType,
                        isActive: true,
                        activeLeadsCount: 0,
                        steps: data.steps.map((s: any, i: number) => ({
                            id: `step-${i}-${Date.now()}`,
                            order: i + 1,
                            channel: s.channel,
                            trigger: s.trigger,
                            content: s.content
                        }))
                    };
                    onCreatePlaybook(newPlaybook);
                }}
            />
            
            <SectionHeader 
                title="Automation Playbooks" 
                subtitle="Design intelligent workflows to nurture leads automatically." 
                action={
                    <button 
                        onClick={() => setIsGeneratorOpen(true)} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
                    >
                        <Sparkles size={16}/> AI Generator
                    </button>
                } 
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {playbooks.map((pb: any) => (
                    <div 
                        key={pb.id} 
                        onClick={() => setSelectedPlaybook(pb)}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-slate-600">
                                <Pencil size={16} />
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl ${pb.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Zap size={24} fill={pb.isActive ? "currentColor" : "none"} />
                            </div>
                        </div>
                        
                        <h3 className="font-bold text-lg text-slate-800 mb-2 pr-8">{pb.name}</h3>
                        <p className="text-sm text-slate-500 mb-6 line-clamp-2 h-10">{pb.description}</p>
                        
                        <div className="flex items-center gap-3 mb-4">
                            {pb.steps.slice(0, 4).map((step: any, i: number) => (
                                <div key={i} className="relative flex items-center">
                                    <div className={`w-2 h-2 rounded-full ${step.channel === 'whatsapp' ? 'bg-green-500' : step.channel === 'email' ? 'bg-blue-500' : step.channel === 'voice' ? 'bg-purple-500' : 'bg-orange-500'}`} title={step.channel} />
                                    {i < Math.min(pb.steps.length, 4) - 1 && <div className="w-4 h-px bg-slate-200 ml-1" />}
                                </div>
                            ))}
                            {pb.steps.length > 4 && <span className="text-[10px] text-slate-400">+{pb.steps.length - 4}</span>}
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-1"><Users size={14}/> {pb.activeLeadsCount} Active Leads</div>
                            <div className={`px-2 py-0.5 rounded-full ${pb.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {pb.isActive ? 'Active' : 'Paused'}
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Empty State Card for Quick Create */}
                <button 
                    onClick={() => setIsGeneratorOpen(true)}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all min-h-[240px]"
                >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-md">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold">Create New Playbook</span>
                </button>
            </div>
        </div>
    );
};

// --- Added Components ---

const Sidebar = ({ activeView, onNavigate }: any) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'leads', label: 'Leads & CRM', icon: Users },
    { id: 'playbooks', label: 'Playbooks', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full flex-shrink-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-indigo-400">
           <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
           <span className="font-bold text-xl text-white tracking-tight">Seyal AI</span>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map(item => (
            <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeView === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <item.icon size={18} />
                {item.label}
            </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">JD</div>
             <div className="flex-1 min-w-0">
                 <div className="text-sm font-bold truncate">John Doe</div>
                 <div className="text-xs text-slate-500 truncate">john@seyal.ai</div>
             </div>
          </div>
      </div>
    </aside>
  );
};

const TasksView = ({ tasks, onUpdateTask, onAction, projectId }: any) => {
    const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'calendar'>('list');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailInitialDate, setDetailInitialDate] = useState<string | undefined>(undefined);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);

    const filteredTasks = useMemo(() => {
        let t = tasks;
        if (projectId && projectId !== 'GLOBAL') {
            t = t.filter((task: Task) => task.projectId === projectId);
        }
        return t;
    }, [tasks, projectId]);

    const openNewTask = (date?: string) => {
        setSelectedTask(null);
        setDetailInitialDate(date);
        setIsDetailOpen(true);
    };

    const openEditTask = (task: Task) => {
        setSelectedTask(task);
        setIsDetailOpen(true);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
             <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-1 rounded-lg flex">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`} title="List View"><ListIcon size={16}/></button>
                        <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`} title="Kanban Board"><KanbanIcon size={16}/></button>
                        <button onClick={() => setViewMode('calendar')} className={`p-1.5 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`} title="Calendar"><Calendar size={16}/></button>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <span className="text-sm font-bold text-slate-500">{filteredTasks.length} Tasks</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-100">
                        <Sparkles size={14} /> AI Creator
                    </button>
                    <button onClick={() => openNewTask()} className="flex items-center gap-2 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors">
                        <Plus size={14} /> New Task
                    </button>
                </div>
             </div>

             <div className="flex-1 overflow-hidden p-6">
                {viewMode === 'list' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-10">AI</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Task Name</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-24">Assignee</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-28">Status</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-24">Priority</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-32">Due Date</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-20">Planned</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-20">Agreed</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-20 text-green-600">Paid</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-20 text-red-500">Balance</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-24">Pay Date</th>
                                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase w-24 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTasks.map((task: Task) => (
                                        <TaskRow key={task.id} task={task} onUpdateTask={onUpdateTask} onAction={onAction} onEdit={() => openEditTask(task)} />
                                    ))}
                                    {filteredTasks.length === 0 && (
                                        <tr>
                                            <td colSpan={12} className="px-4 py-12 text-center text-slate-400 text-sm">No tasks found. Create one to get started.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {viewMode === 'kanban' && (
                     <div className="flex h-full gap-4 overflow-x-auto pb-2">
                        {AVAILABLE_LISTS.map(listName => (
                            <KanbanColumn 
                                key={listName} 
                                list={listName} 
                                count={filteredTasks.filter((t: Task) => (t.list || 'General') === listName).length}
                                tasks={filteredTasks}
                                onDrop={(e: any, targetList: string) => {
                                    e.preventDefault();
                                    const taskId = e.dataTransfer.getData("taskId");
                                    const task = tasks.find((t: Task) => t.id === taskId);
                                    if(task) onUpdateTask({...task, list: targetList});
                                }}
                                onDragStart={(e: any, id: string) => e.dataTransfer.setData("taskId", id)}
                                onEditTask={openEditTask}
                                onNewTask={() => { setSelectedTask(null); setDetailInitialDate(undefined); setIsDetailOpen(true); }}
                            />
                        ))}
                     </div>
                )}
                {viewMode === 'calendar' && (
                    <CalendarBoard tasks={filteredTasks} onEditTask={openEditTask} onNewTaskWithDate={(date: string) => openNewTask(date)} />
                )}
             </div>

             <TaskDetailPanel 
                isOpen={isDetailOpen} 
                onClose={() => setIsDetailOpen(false)} 
                task={selectedTask} 
                onSave={(t: Task) => { onUpdateTask(t); setIsDetailOpen(false); }}
                onAction={onAction}
                initialDate={detailInitialDate}
                projectId={projectId === 'GLOBAL' ? undefined : projectId}
                availableTasks={tasks}
                projects={[]}
             />

            <AiTaskCreatorModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
                onSave={(t: Task) => { onUpdateTask(t); setIsAiModalOpen(false); }}
                projectId={projectId === 'GLOBAL' ? '' : projectId}
            />
        </div>
    );
};

const ProjectDetailView = ({ project, tasks, onBack, onUpdateTask, onAction }: any) => {
    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-20">
                <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm mb-4 transition-colors">
                    <ChevronLeft size={16}/> Back to Projects
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <h1 className="text-3xl font-bold text-slate-900">{project.title}</h1>
                             <span className={`px-3 py-1 rounded-full text-xs font-bold ${project.status === 'Execution' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{project.status}</span>
                        </div>
                        <p className="text-slate-500 max-w-2xl">{project.description}</p>
                    </div>
                    <div className="flex gap-3">
                         <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">Edit Project</button>
                    </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-4 gap-6 mt-8">
                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase">Budget Used</span>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-bold text-slate-800">${project.budget?.spent.toLocaleString()}</span>
                            <span className="text-xs text-slate-500">of ${project.budget?.total.toLocaleString()}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                             <div className="h-full bg-blue-500" style={{width: `${(project.budget?.spent / project.budget?.total) * 100}%`}}></div>
                        </div>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase">Timeline</span>
                        <div className="mt-1 font-bold text-slate-800 text-sm">{new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</div>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase">Client</span>
                        <div className="mt-1 flex items-center gap-2">
                             <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                {project.clientName?.charAt(0)}
                             </div>
                             <span className="font-bold text-slate-800 text-sm truncate">{project.clientName}</span>
                        </div>
                     </div>
                </div>
            </div>

            {/* Tabs & Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                 <div className="px-8 border-b border-slate-200 bg-white">
                      <div className="flex gap-8">
                          <button className="py-4 text-sm font-bold text-primary border-b-2 border-primary">Tasks</button>
                          <button className="py-4 text-sm font-bold text-slate-500 hover:text-slate-800">Files</button>
                          <button className="py-4 text-sm font-bold text-slate-500 hover:text-slate-800">Invoices</button>
                      </div>
                 </div>
                 <div className="flex-1 overflow-hidden">
                      <TasksView tasks={tasks} onUpdateTask={onUpdateTask} onAction={onAction} projectId={project.id} />
                 </div>
            </div>
        </div>
    );
};

const DashboardView = ({ projects, tasks, leads }: any) => {
    // Basic metrics
    const activeProjects = projects.filter((p: any) => p.status === 'Execution').length;
    const completedTasks = tasks.filter((t: any) => t.status === 'Done').length;
    const totalTasks = tasks.length;
    const taskCompletion = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const pendingLeads = leads.filter((l: any) => l.status === 'New' || l.status === 'Contacted').length;

    return (
        <div className="h-full overflow-y-auto p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase mb-2">Active Projects</span>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold text-slate-800">{activeProjects}</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Briefcase size={20} /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase mb-2">Task Completion</span>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold text-slate-800">{taskCompletion}%</span>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckSquare size={20} /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase mb-2">Pending Leads</span>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold text-slate-800">{pendingLeads}</span>
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Users size={20} /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase mb-2">Productivity</span>
                    <div className="flex items-end justify-between">
                        <span className="text-3xl font-bold text-slate-800">High</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><TrendingUp size={20} /></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-slate-800">Recent Projects</h2>
                        <button className="text-sm text-primary font-bold">View All</button>
                    </div>
                    <div className="space-y-4">
                        {projects.slice(0, 3).map((p: any) => (
                            <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {p.title.substring(0,2).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800 text-sm">{p.title}</h3>
                                    <p className="text-xs text-slate-500">{p.category}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.status === 'Execution' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="font-bold text-slate-800">Upcoming Tasks</h2>
                        <button className="text-sm text-primary font-bold">View All</button>
                    </div>
                    <div className="space-y-4">
                        {tasks.filter((t: any) => t.status !== 'Done').slice(0, 4).map((t: any) => (
                            <div key={t.id} className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${t.priority === 'Urgent' ? 'bg-red-500' : 'bg-slate-300'}`} />
                                <span className="text-sm font-medium text-slate-700 flex-1 truncate">{t.title}</span>
                                <span className="text-xs text-slate-400">{new Date(t.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const LeadsView = ({ leads }: any) => {
    return (
        <div className="h-full flex flex-col p-8 bg-slate-50">
            <SectionHeader 
                title="Leads & CRM" 
                subtitle="Manage your client relationships and pipeline."
                action={<button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> Add Lead</button>}
            />
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                         <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Value</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Probability</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Last Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {leads.map((lead: any) => (
                                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 text-sm">{lead.name}</div>
                                        <div className="text-xs text-slate-500">{lead.company || 'Individual'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                         <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">{lead.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-700">₹{lead.value.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-green-500" style={{width: `${lead.probability}%`}}></div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-600">{lead.probability}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{lead.lastContact}</td>
                                    <td className="px-6 py-4">
                                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary"><MoreHorizontal size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// --- Main App Component ---

const App = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [playbooks, setPlaybooks] = useState<Playbook[]>(MOCK_PLAYBOOKS);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => {
        const exists = prev.find(t => t.id === updatedTask.id);
        if (exists) return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
        return [...prev, updatedTask];
    });
  };

  const handleUpdateProject = (updatedProject: Project) => {
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleCreateProject = (data: any) => {
    const newProject: Project = {
        id: `PROJ-${Date.now()}`,
        progress: 0,
        budget: {
            total: data.budget,
            committed: 0,
            spent: 0
        },
        title: data.title,
        category: data.category,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
        riskLevel: data.riskLevel,
        description: data.description,
        clientType: data.clientType,
        clientName: data.clientName,
        companyName: data.clientType === 'Company' ? data.companyName : '',
        clientEmail: data.clientEmail,
        clientStdCode: data.clientStdCode,
        clientPhone: data.clientPhone
    };
    setProjects(prev => [newProject, ...prev]);
    setIsNewProjectModalOpen(false);
  };

  // --- Playbook Handlers ---
  const handleCreatePlaybook = (newPlaybook: Playbook) => {
      setPlaybooks(prev => [...prev, newPlaybook]);
  };

  const handleUpdatePlaybook = (updatedPlaybook: Playbook) => {
      setPlaybooks(prev => prev.map(pb => pb.id === updatedPlaybook.id ? updatedPlaybook : pb));
  };

  const renderContent = () => {
    if (selectedProjectId) {
       const project = projects.find(p => p.id === selectedProjectId);
       if (!project) return <div>Project not found</div>;
       return (
         <ProjectDetailView 
            project={project} 
            tasks={tasks} 
            onBack={() => setSelectedProjectId(null)} 
            onUpdateTask={handleUpdateTask} 
            onUpdateProject={handleUpdateProject}
            onAction={() => {}}
         />
       );
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardView projects={projects} tasks={tasks} leads={leads} />;
      case 'tasks':
        return <TasksView tasks={tasks} onUpdateTask={handleUpdateTask} onAction={() => {}} projectId="GLOBAL" />;
      case 'projects':
         return (
            <div className="p-8 h-full overflow-y-auto">
                <SectionHeader title="Projects" subtitle="All your ongoing initiatives." action={<button onClick={() => setIsNewProjectModalOpen(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16}/> New Project</button>} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map(p => (
                        <div key={p.id} onClick={() => setSelectedProjectId(p.id)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
                             <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><Briefcase size={24} /></div>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${p.status === 'Execution' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{p.status}</span>
                             </div>
                             <h3 className="font-bold text-lg text-slate-800 mb-1">{p.title}</h3>
                             <p className="text-sm text-slate-500 mb-4 line-clamp-2">{p.description}</p>
                             <div className="w-full bg-slate-100 rounded-full h-1.5 mb-4 overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full" style={{width: `${p.progress}%`}}></div>
                             </div>
                             <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                <span>{p.category}</span>
                                <span>{p.progress}%</span>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
         );
      case 'leads':
        return <LeadsView leads={leads} />;
      case 'playbooks':
        return <PlaybooksView 
            playbooks={playbooks} 
            onCreatePlaybook={handleCreatePlaybook} 
            onUpdatePlaybook={handleUpdatePlaybook} 
        />;
      default:
        return <div className="flex items-center justify-center h-full text-slate-400 font-bold">Coming Soon: {currentView}</div>;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans">
      <Sidebar activeView={currentView} onNavigate={(view: ViewState) => { setCurrentView(view); setSelectedProjectId(null); }} />
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
        <NewProjectModal 
            isOpen={isNewProjectModalOpen} 
            onClose={() => setIsNewProjectModalOpen(false)}
            onCreate={handleCreateProject}
        />
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);