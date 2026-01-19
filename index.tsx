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
  GripVertical, Wand2, Search, MoreVertical, Folder
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

const NotificationToast = ({ message, onUndo, onClose }: { message: string, onUndo?: () => void, onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

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

const TaskRow = ({ task, onUpdateTask, onAction, onEdit }: any) => {
    const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
        onUpdateTask(task);
    };

    const handleInlineUpdate = (field: string, value: any) => {
        let updates: any = {};
        if (field.startsWith('budget.')) {
            const budgetKey = field.split('.')[1];
            const currentBudget = task.budget || { planned: 0, agreed: 0, advance: 0, status: 'None', paymentDueDate: '' };
            const newBudget = { ...currentBudget, [budgetKey]: value };
            
            const agreed = parseFloat(newBudget.agreed as any) || 0;
            const advance = parseFloat(newBudget.advance as any) || 0;
            const balance = agreed - advance;
            
            if (agreed > 0 && balance <= 0) {
                newBudget.status = 'Paid in Full';
            } else if (advance > 0) {
                newBudget.status = 'Advance Paid';
            } else {
                newBudget.status = 'Pending';
            }
            updates.budget = newBudget;
        } else {
            updates[field] = value;
        }
        onUpdateTask({ ...task, ...updates });
    };

    const balance = (task.budget?.agreed || 0) - (task.budget?.advance || 0);

    return (
        <tr className="hover:bg-slate-50 transition-colors group">
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <Toggle enabled={task.aiCoordination} onToggle={() => handleInlineUpdate('aiCoordination', !task.aiCoordination)} size="sm" />
            </td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <input className="bg-transparent w-full focus:outline-none font-medium text-slate-700 truncate" value={task.title} onChange={e => handleInlineUpdate('title', e.target.value)} onClick={onEdit} />
            </td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <select className="bg-transparent w-full focus:outline-none text-xs text-slate-600 cursor-pointer appearance-none" value={task.assignee} onChange={e => handleInlineUpdate('assignee', e.target.value)}>
                    <option value="Me">Me</option>
                    <option value="AI Agent">AI Agent</option>
                    <option value="Team">Team</option>
                </select>
            </td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <select className={`bg-transparent w-full focus:outline-none text-xs font-bold cursor-pointer appearance-none rounded px-2 py-1 ${task.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`} value={task.status} onChange={e => handleInlineUpdate('status', e.target.value)}>
                    <option value="Draft">Draft</option>
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                </select>
            </td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <select className={`bg-transparent w-full focus:outline-none text-xs font-bold cursor-pointer appearance-none ${task.priority === 'Urgent' ? 'text-red-600' : task.priority === 'High' ? 'text-orange-500' : 'text-slate-500'}`} value={task.priority} onChange={e => handleInlineUpdate('priority', e.target.value)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                </select>
            </td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <div className="flex flex-col items-start gap-1">
                    <CustomDatePicker value={task.dueDate} onChange={(val: any) => handleInlineUpdate('dueDate', val)} compact />
                    <CustomTimePicker value={task.dueTime || ''} onChange={(val: any) => handleInlineUpdate('dueTime', val)} compact />
                </div>
            </td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <div className="flex items-center text-xs text-slate-500">
                    <span className="mr-1">$</span>
                    <input type="number" className="bg-transparent w-full focus:outline-none" value={task.budget?.planned || ''} onChange={e => handleInlineUpdate('budget.planned', e.target.value)} placeholder="0" />
                </div>
            </td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <div className="flex items-center text-xs text-slate-700 font-medium">
                    <span className="mr-1">$</span>
                    <input type="number" className="bg-transparent w-full focus:outline-none" value={task.budget?.agreed || ''} onChange={e => handleInlineUpdate('budget.agreed', e.target.value)} placeholder="0" />
                </div>
            </td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <div className="flex items-center text-xs text-green-600">
                    <span className="mr-1">$</span>
                    <input type="number" className="bg-transparent w-full focus:outline-none" value={task.budget?.advance || ''} onChange={e => handleInlineUpdate('budget.advance', e.target.value)} placeholder="0" />
                </div>
            </td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <div className={`text-xs font-bold ${balance > 0 ? 'text-red-500' : 'text-slate-400'}`}>${balance.toLocaleString()}</div>
            </td>
            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                <CustomDatePicker value={task.budget?.paymentDueDate || ''} onChange={(val: any) => handleInlineUpdate('budget.paymentDueDate', val)} compact />
            </td>
            <td className="px-4 py-2 text-center">
                <div className="flex items-center justify-center gap-1 relative z-10">
                    <button onClick={handleSave} className={`p-1.5 rounded-lg transition-colors ${saveState === 'saved' ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-primary hover:bg-slate-100'}`} title="Save Changes">
                        {saveState === 'saved' ? <Check size={16} /> : <Save size={16} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onAction('clone', task); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors" title="Clone Task">
                        <CopyPlus size={16} />
                    </button>
                    <button 
                        onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation(); 
                            onAction('delete', task); 
                        }} 
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" 
                        title="Delete Task"
                    >
                        <Trash2 size={16} className="pointer-events-none" />
                    </button>
                </div>
            </td>
        </tr>
    );
};

const KanbanColumn = ({ list, count, tasks, onDrop, onDragStart, onEditTask, onNewTask }: any) => (
  <div 
    className="flex flex-col h-full w-80 bg-slate-50/50 rounded-2xl border border-slate-200/60"
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => onDrop(e, list)}
  >
    <div className="p-3 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-700 text-sm">{list}</h3>
            <span className="bg-slate-200/60 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{count}</span>
        </div>
        <button onClick={onNewTask} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded transition-colors"><Plus size={14}/></button>
    </div>
    <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {tasks.filter((t: any) => (t.list || 'General') === list).map((t: any) => (
             <div 
                key={t.id} 
                draggable 
                onDragStart={(e) => onDragStart(e, t.id)}
                onClick={() => onEditTask(t)}
                className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
             >
                <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${t.priority === 'Urgent' ? 'bg-red-50 text-red-600' : t.priority === 'High' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>{t.priority}</span>
                    {t.aiCoordination && <Bot size={12} className="text-purple-500" />}
                </div>
                <h4 className="text-sm font-bold text-slate-700 mb-1 leading-snug">{t.title}</h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Calendar size={10} />
                    <span>{new Date(t.dueDate).toLocaleDateString()}</span>
                </div>
             </div>
        ))}
    </div>
  </div>
);

const CalendarBoard = ({ tasks, onEditTask, onNewTaskWithDate }: any) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    // Simplified calendar view for the prototype
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
                        <div 
                            key={i} 
                            onClick={() => onNewTaskWithDate(dateStr)}
                            className={`border-b border-r border-slate-50 p-1 min-h-[100px] hover:bg-slate-50 transition-colors cursor-pointer group relative ${isToday ? 'bg-blue-50/30' : ''}`}
                        >
                            <span className={`text-xs font-bold p-1 rounded-full w-6 h-6 flex items-center justify-center ${isToday ? 'bg-blue-600 text-white' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                {date.getDate()}
                            </span>
                            <div className="mt-1 space-y-1">
                                {dayTasks.map((t: any) => (
                                    <div 
                                        key={t.id} 
                                        onClick={(e) => { e.stopPropagation(); onEditTask(t); }}
                                        className={`text-[10px] px-1.5 py-1 rounded border truncate ${t.status === 'Done' ? 'bg-slate-100 text-slate-400 line-through border-slate-200' : 'bg-white border-blue-100 text-blue-700 shadow-sm'}`}
                                    >
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
  
  const handleAiSuggestPriority = async () => {
    if (!formData.title) return;
    setIsAiSuggesting(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Analyze this task and suggest a single priority level from these options: Low, Medium, High, Urgent.
            Context:
            Title: ${formData.title}
            Description: ${formData.description}
            Due Date: ${formData.dueDate}
            Today: ${new Date().toISOString().split('T')[0]}
            Return ONLY the word of the priority level (e.g., "High").`,
        });
        const text = response.text?.trim();
        if (text && ['Low', 'Medium', 'High', 'Urgent'].includes(text)) {
            updateField('priority', text);
        }
    } catch (e) {
        console.error("AI Suggestion failed", e);
    } finally {
        setIsAiSuggesting(false);
    }
  };

  const autoCategorizeList = () => {
    if (formData.list && formData.list !== 'General') return;
    const lowerTitle = formData.title.toLowerCase();
    let detected = 'General';
    if (/market|ad|campaign|social|post/.test(lowerTitle)) detected = 'Marketing';
    else if (/lead|sale|client|deal|proposal/.test(lowerTitle)) detected = 'Sales';
    else if (/code|bug|fix|dev|api|server/.test(lowerTitle)) detected = 'Engineering';
    else if (/design|ui|ux|logo|mockup/.test(lowerTitle)) detected = 'Design';
    else if (/hire|interview|onboard|candidate/.test(lowerTitle)) detected = 'HR';
    else if (/budget|invoice|cost|pay/.test(lowerTitle)) detected = 'Finance';
    if (detected !== 'General') updateField('list', detected);
  };

  const autoGenerateTags = () => {
    const desc = formData.description;
    if (!desc) return;
    const existing = new Set(formData.tags || []);
    const matches = desc.match(/#[a-z0-9_]+/gi);
    if (matches) matches.forEach(t => existing.add(t));
    const lowerDesc = desc.toLowerCase();
    const map: any = { 'urgent': '#urgent', 'deadline': '#deadline', 'meeting': '#meeting', 'follow up': '#followup', 'review': '#review' };
    Object.keys(map).forEach(k => { if (lowerDesc.includes(k)) existing.add(map[k]); });
    updateField('tags', Array.from(existing));
  };

  const addTag = () => {
    if(!tagInputValue.trim()) { setIsTagInputVisible(false); return; }
    let val = tagInputValue.trim();
    if(!val.startsWith('#')) val = '#' + val;
    const newTags = [...(formData.tags || [])];
    if(!newTags.includes(val)) newTags.push(val);
    updateField('tags', newTags);
    setTagInputValue('');
    setIsTagInputVisible(false);
  };

  const removeTag = (tag: string) => { updateField('tags', (formData.tags || []).filter(t => t !== tag)); };

  const handleCreateNewList = () => {
    if (newListName.trim()) {
        updateField('list', newListName.trim());
        setNewListName('');
        setIsCreatingList(false);
        setIsListOpen(false);
    }
  };

  const WHATSAPP_TRIGGERS = ['Status Change', 'Daily briefing', 'AI Auto Mode', 'One day before', 'custom schedule'];
  const VOICE_TRIGGERS = ['1 hour before', 'Daily briefing', 'AI Auto Mode', 'One day before', 'custom schedule'];

  const renderCustomSchedule = (channel: 'whatsapp' | 'voice', settings: AiChannelSettings | undefined, updateSettings: (s: AiChannelSettings) => void) => {
    if (!settings?.triggers?.includes('custom schedule')) return null;
    return (
        <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-1">
             <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Custom Schedule</div>
             <div className="grid grid-cols-2 gap-2">
                 <CustomDatePicker value={settings.custom?.date || ''} onChange={(val: any) => updateSettings({...settings, custom: {...settings.custom, date: val}} as any)} compact label="Date" />
                 <CustomTimePicker value={settings.custom?.time || ''} onChange={(val: any) => updateSettings({...settings, custom: {...settings.custom, time: val}} as any)} compact label="Time" />
             </div>
             <div className="mt-2">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Frequency</label>
                 <select value={settings.custom?.frequency || ''} onChange={(e) => updateSettings({...settings, custom: {...settings.custom, frequency: e.target.value}} as any)} className="w-full bg-white text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary">
                     <option value="Once">Once</option>
                     <option value="Daily">Daily</option>
                     <option value="Weekly">Weekly</option>
                 </select>
             </div>
        </div>
    );
  };

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
                    <ActionMenu 
                        isOpen={isMenuOpen} 
                        onClose={() => setIsMenuOpen(false)} 
                        onShare={() => onAction?.('share', formData)}
                        onClone={() => onAction?.('clone', formData)}
                        onArchive={() => onAction?.('archive', formData)}
                        onDelete={() => onAction?.('delete', formData)}
                        itemType="Task"
                    />
                </div>
                <button onClick={() => onSave({...formData, status: 'Draft'})} className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">Save Draft</button>
                <button onClick={() => onSave(formData)} className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-colors">Save</button>
            </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-32 p-4 space-y-6">
            <div className="flex flex-col gap-2">
                <div className="relative" ref={listDropdownRef}>
                    <button 
                        onClick={() => setIsListOpen(!isListOpen)} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        <ListIcon size={12} />
                        <span>{formData.list || 'General'}</span>
                        <ChevronDown size={12} />
                    </button>
                    {isListOpen && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                            {!isCreatingList ? (
                                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                    <div className="text-[10px] font-bold text-slate-400 px-3 py-1.5 uppercase">Select List</div>
                                    {[...AVAILABLE_LISTS, ...(formData.list && !AVAILABLE_LISTS.includes(formData.list) ? [formData.list] : [])].map(l => (
                                        <button 
                                            key={l} 
                                            onClick={() => { updateField('list', l); setIsListOpen(false); }}
                                            className={`w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 flex items-center justify-between ${formData.list === l ? 'text-primary font-bold bg-slate-50' : 'text-slate-600'}`}
                                        >
                                            {l}
                                            {formData.list === l && <Check size={14} />}
                                        </button>
                                    ))}
                                    <div className="h-px bg-slate-100 my-1" />
                                    <button 
                                        onClick={() => setIsCreatingList(true)}
                                        className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-primary font-bold flex items-center gap-2"
                                    >
                                        <Plus size={14} /> Create New List...
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">New List Name</label>
                                    <div className="flex gap-2">
                                        <input 
                                            autoFocus
                                            value={newListName}
                                            onChange={(e) => setNewListName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateNewList()}
                                            className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                                            placeholder="e.g. Q4 Strategy"
                                        />
                                        <button onClick={handleCreateNewList} disabled={!newListName.trim()} className="p-1.5 bg-primary text-white rounded-lg disabled:opacity-50"><Check size={16} /></button>
                                        <button onClick={() => { setIsCreatingList(false); setNewListName(''); }} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-start gap-3">
                    <input type="checkbox" checked={formData.status === 'Done'} onChange={() => updateField('status', formData.status === 'Done' ? 'Todo' : 'Done')} className="h-6 w-6 mt-1 rounded-full border-2 border-slate-300 checked:bg-primary" />
                    <textarea 
                        value={formData.title} 
                        onChange={(e) => updateField('title', e.target.value)} 
                        onBlur={autoCategorizeList}
                        className="w-full text-2xl font-bold border-none p-0 focus:ring-0 resize-none" 
                        placeholder="Task Name" 
                        rows={2} 
                    />
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Description</label>
                <textarea 
                    value={formData.description} 
                    onChange={(e) => updateField('description', e.target.value)} 
                    onBlur={autoGenerateTags}
                    className="w-full bg-slate-50 rounded-xl p-4 min-h-[100px] text-sm mb-3" 
                    placeholder="Add details..." 
                />
                
                <div className="flex flex-wrap items-center gap-2">
                    {(formData.tags || []).map(tag => (
                        <span key={tag} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 group">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="ml-1.5 text-indigo-400 hover:text-indigo-600">
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    {isTagInputVisible ? (
                        <div className="flex items-center gap-1">
                            <input
                                autoFocus
                                value={tagInputValue}
                                onChange={(e) => setTagInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                onBlur={() => { if(tagInputValue) addTag(); else setIsTagInputVisible(false); }}
                                className="w-24 px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-primary"
                                placeholder="#tag"
                            />
                        </div>
                    ) : (
                        <button onClick={() => setIsTagInputVisible(true)} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors">
                            <Plus size={12} className="mr-1" /> Add Tag
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-100 space-y-4">
                <div className="flex gap-3"><div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Assignee</label><select value={formData.assignee} onChange={(e) => updateField('assignee', e.target.value)} className="w-full bg-slate-50 p-2 rounded-lg text-sm"><option value="Me">Me</option><option value="AI Agent">AI Agent</option><option value="Team">Team</option></select></div><div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Due Date</label><div className="flex gap-2"><CustomDatePicker value={formData.dueDate} onChange={(val: any) => updateField('dueDate', val)} compact className="flex-1" /><CustomTimePicker value={formData.dueTime || ''} onChange={(val: any) => updateField('dueTime', val)} compact className="w-20" /></div></div></div>
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-500">Priority</label>
                        <button 
                            onClick={handleAiSuggestPriority}
                            disabled={isAiSuggesting || !formData.title}
                            className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                        >
                            {isAiSuggesting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            AI Suggest
                        </button>
                    </div>
                    <div className="flex gap-2">{['Low', 'Medium', 'High', 'Urgent'].map(p => (<button key={p} onClick={() => updateField('priority', p)} className={`flex-1 py-2 rounded-lg border text-xs font-bold ${formData.priority === p ? 'bg-slate-100 border-slate-300 text-slate-800' : 'border-slate-100 text-slate-400'}`}>{p}</button>))}</div>
                </div>
                
                <div><div className="flex justify-between mb-2"><h3 className="font-bold text-sm">Subtasks</h3><span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{formData.subtasks?.filter(s => s.completed).length || 0}/{formData.subtasks?.length || 0}</span></div><div className="space-y-2">{formData.subtasks?.map(st => (<div key={st.id} className="flex gap-2"><input type="checkbox" checked={st.completed} onChange={() => { const newSt = formData.subtasks.map(s => s.id === st.id ? {...s, completed: !s.completed} : s); updateField('subtasks', newSt); }} /><input value={st.text} onChange={(e) => { const newSt = formData.subtasks.map(s => s.id === st.id ? {...s, text: e.target.value} : s); updateField('subtasks', newSt); }} className="flex-1 bg-transparent text-sm border-none p-0 focus:ring-0" /></div>))}</div><button onClick={() => updateField('subtasks', [...(formData.subtasks || []), {id: Date.now().toString(), text: '', completed: false}])} className="text-primary text-sm font-bold mt-2">+ Add Subtask</button></div>

                <div className="flex justify-between items-center"><div className="flex items-center gap-2"><Bot size={18} className="text-purple-500"/><span className="text-sm font-bold">AI Coordination</span></div><Toggle enabled={formData.aiCoordination} onToggle={() => updateField('aiCoordination', !formData.aiCoordination)} size="sm" /></div>
                {formData.aiCoordination && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                        <div className={`p-3 rounded-xl border transition-all duration-200 ${formData.aiChannels.whatsapp ? 'bg-green-50/50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${formData.aiChannels.whatsapp ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <MessageCircle size={14} />
                                    </div>
                                    <span className={`text-sm font-bold ${formData.aiChannels.whatsapp ? 'text-green-900' : 'text-slate-500'}`}>WhatsApp Updates</span>
                                </div>
                                <Toggle enabled={formData.aiChannels.whatsapp} onToggle={() => setFormData(p => ({...p, aiChannels: {...p.aiChannels, whatsapp: !p.aiChannels.whatsapp}}))} size="sm"/>
                            </div>
                            {formData.aiChannels.whatsapp && (
                                <div className="pl-9">
                                    <MultiSelectDropdown label="Trigger Events" options={WHATSAPP_TRIGGERS} selected={formData.aiChannels.whatsappSettings?.triggers || []} onChange={(triggers: any) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, whatsappSettings: {...p.aiChannels.whatsappSettings, triggers}}}))} />
                                    {renderCustomSchedule('whatsapp', formData.aiChannels.whatsappSettings, (s) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, whatsappSettings: s}})))}
                                </div>
                            )}
                        </div>
                        <div className={`p-3 rounded-xl border transition-all duration-200 ${formData.aiChannels.voice ? 'bg-purple-50/50 border-purple-200' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${formData.aiChannels.voice ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'}`}>
                                        <Phone size={14} />
                                    </div>
                                    <span className={`text-sm font-bold ${formData.aiChannels.voice ? 'text-purple-900' : 'text-slate-500'}`}>Voice Assistant</span>
                                </div>
                                <Toggle enabled={formData.aiChannels.voice} onToggle={() => setFormData(p => ({...p, aiChannels: {...p.aiChannels, voice: !p.aiChannels.voice}}))} size="sm"/>
                            </div>
                            {formData.aiChannels.voice && (
                                <div className="pl-9">
                                    <MultiSelectDropdown label="Call Triggers" options={VOICE_TRIGGERS} selected={formData.aiChannels.voiceSettings?.triggers || []} onChange={(triggers: any) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, voiceSettings: {...p.aiChannels.voiceSettings, triggers}}}))} />
                                    {renderCustomSchedule('voice', formData.aiChannels.voiceSettings, (s) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, voiceSettings: s}})))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                <div className="flex justify-between items-center"><div className="flex items-center gap-2"><Repeat size={18} className="text-blue-500"/><span className="text-sm font-bold">Recurring Task</span></div><Toggle enabled={formData.recurrence?.enabled || false} onToggle={() => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, enabled: !prev.recurrence?.enabled}}))} size="sm" /></div>
                {formData.recurrence?.enabled && (
                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3 animate-in slide-in-from-top-2">
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-blue-900/60 uppercase mb-1">Frequency</label>
                                <select value={formData.recurrence.frequency} onChange={(e) => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, frequency: e.target.value}}))} className="w-full bg-white border border-blue-200 rounded-lg text-xs px-2 py-1.5 focus:outline-none focus:border-blue-400 text-blue-900 font-medium">
                                    <option value="Daily">Daily</option>
                                    <option value="Weekly">Weekly</option>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Yearly">Yearly</option>
                                </select>
                            </div>
                            <div className="w-20">
                                <label className="block text-[10px] font-bold text-blue-900/60 uppercase mb-1">Every</label>
                                <div className="flex items-center bg-white border border-blue-200 rounded-lg px-2 py-1.5">
                                    <input type="number" value={formData.recurrence.interval} onChange={(e) => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, interval: parseInt(e.target.value) || 1}}))} className="w-full text-xs focus:outline-none text-blue-900 font-medium" min="1" />
                                    <span className="text-[10px] text-blue-400 ml-1">
                                        {formData.recurrence.frequency === 'Daily' ? 'days' : formData.recurrence.frequency === 'Weekly' ? 'wks' : formData.recurrence.frequency === 'Monthly' ? 'mos' : 'yrs'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div>
                             <label className="block text-[10px] font-bold text-blue-900/60 uppercase mb-1">End Date (Optional)</label>
                             <CustomDatePicker value={formData.recurrence.endDate || ''} onChange={(val: any) => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, endDate: val}}))} compact className="w-full" />
                        </div>
                    </div>
                )}

                {/* AI History Section */}
                {formData.aiHistory && formData.aiHistory.length > 0 && (
                    <div className="pt-4 mt-2 border-t border-slate-100 animate-in fade-in">
                        <div className="flex items-center gap-2 mb-4">
                             <div className="p-1 rounded bg-slate-100 text-slate-500"><HistoryIcon size={14} /></div>
                             <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">AI History</span>
                        </div>
                        <div className="space-y-0 pl-1">
                            {formData.aiHistory.map((item, idx) => (
                                <div key={item.id || idx} className="relative pl-5 pb-4 border-l border-slate-200 last:border-0 last:pb-0 group">
                                    <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ring-slate-100 transition-colors ${item.status === 'success' ? 'bg-green-500' : item.status === 'failure' ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs font-bold ${item.status === 'failure' ? 'text-red-600' : 'text-slate-700'}`}>{item.action}</span>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(item.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">{item.details}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </main>
      </div>
    </div>
  );
};

const CreateProjectModal = ({ isOpen, onClose, onCreate }: any) => {
  const [formData, setFormData] = useState<NewProjectPayload>({
    title: '',
    category: 'General',
    startDate: '',
    endDate: '',
    budget: 0,
    description: '',
    clientType: 'Individual',
    companyName: '',
    clientName: '',
    clientEmail: '',
    clientStdCode: '+1',
    clientPhone: '',
    status: 'Planning',
    riskLevel: 'Low'
  });

  const updateBudget = (value: number) => setFormData(prev => ({ ...prev, budget: value }));
  if (!isOpen) return null;

  const handleCreate = () => {
    if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
        alert('End date cannot be earlier than start date.');
        return;
    }
    onCreate(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl"><h2 className="text-lg font-bold text-slate-900">New Project</h2><button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Project Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" placeholder="Project Name" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{AVAILABLE_LISTS.map(l => <option key={l} value={l}>{l}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Budget</label><input type="number" value={formData.budget || ''} onChange={e => updateBudget(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" placeholder="0" /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{['Draft', 'Planning', 'Ready', 'Execution'].map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Risk Level</label><select value={formData.riskLevel} onChange={e => setFormData({...formData, riskLevel: e.target.value as any})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{['Low', 'Medium', 'High'].map(r => <option key={r} value={r}>{r}</option>)}</select></div></div>
                <div className="grid grid-cols-2 gap-4"><div><CustomDatePicker label="Start Date" value={formData.startDate} onChange={(val: any) => setFormData({...formData, startDate: val})} /></div><div><CustomDatePicker label="End Date" value={formData.endDate} onChange={(val: any) => setFormData({...formData, endDate: val})} minDate={formData.startDate} /></div></div>
                <div className="pt-2 border-t border-slate-100 mt-2">
                     <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-slate-500 uppercase">Client Details</div>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg">
                            <button onClick={() => setFormData({...formData, clientType: 'Individual'})} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${formData.clientType === 'Individual' || !formData.clientType ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Individual</button>
                            <button onClick={() => setFormData({...formData, clientType: 'Company'})} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${formData.clientType === 'Company' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Company</button>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 gap-3">
                         {formData.clientType === 'Company' && (
                             <div><input type="text" value={formData.companyName || ''} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Company Name" /></div>
                         )}
                         <div><input type="text" value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder={formData.clientType === 'Company' ? "Contact Person Name" : "Client Name"} /></div>
                         <div className="grid grid-cols-2 gap-3">
                             <input type="email" value={formData.clientEmail || ''} onChange={e => setFormData({...formData, clientEmail: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Email Address" />
                             <div className="flex gap-2">
                                <input type="text" value={formData.clientStdCode || '+1'} onChange={e => setFormData({...formData, clientStdCode: e.target.value})} className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary text-center" placeholder="+1" />
                                <input type="text" value={formData.clientPhone || ''} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Mobile Number" />
                             </div>
                         </div>
                     </div>
                </div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 mt-2">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-24" placeholder="Describe the project goal..." /></div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl"><button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button><button onClick={handleCreate} className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">Create Project</button></div>
        </div>
    </div>
  );
};

const EditProjectModal = ({ isOpen, onClose, project, onSave }: any) => {
  const [formData, setFormData] = useState<Project>(project);
  useEffect(() => { setFormData(project); }, [project, isOpen]);
  
  const updateBudget = (value: number) => setFormData(prev => ({ ...prev, budget: { ...prev.budget, total: value } }));
  if (!isOpen) return null;
  const handleSave = () => {
    if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
        alert('End date cannot be earlier than start date.');
        return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl"><h2 className="text-lg font-bold text-slate-900">Edit Project Settings</h2><button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Project Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" /></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{AVAILABLE_LISTS.map(l => <option key={l} value={l}>{l}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Budget</label><input type="number" value={formData.budget.total} onChange={e => updateBudget(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{['Draft', 'Planning', 'Ready', 'Execution', 'On Hold', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Risk Level</label><select value={formData.riskLevel} onChange={e => setFormData({...formData, riskLevel: e.target.value as any})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{['Low', 'Medium', 'High'].map(r => <option key={r} value={r}>{r}</option>)}</select></div></div>
                <div className="grid grid-cols-2 gap-4"><div><CustomDatePicker label="Start Date" value={formData.startDate} onChange={(val: any) => setFormData({...formData, startDate: val})} /></div><div><CustomDatePicker label="End Date" value={formData.endDate} onChange={(val: any) => setFormData({...formData, endDate: val})} minDate={formData.startDate} /></div></div>
                <div className="pt-2 border-t border-slate-100 mt-2">
                     <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-slate-500 uppercase">Client Details</div>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg">
                            <button onClick={() => setFormData({...formData, clientType: 'Individual'})} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${formData.clientType === 'Individual' || !formData.clientType ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Individual</button>
                            <button onClick={() => setFormData({...formData, clientType: 'Company'})} className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${formData.clientType === 'Company' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Company</button>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 gap-3">
                         {formData.clientType === 'Company' && (
                             <div><input type="text" value={formData.companyName || ''} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Company Name" /></div>
                         )}
                         <div><input type="text" value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder={formData.clientType === 'Company' ? "Contact Person Name" : "Client Name"} /></div>
                         <div className="grid grid-cols-2 gap-3">
                             <input type="email" value={formData.clientEmail || ''} onChange={e => setFormData({...formData, clientEmail: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Email Address" />
                             <div className="flex gap-2">
                                <input type="text" value={formData.clientStdCode || '+1'} onChange={e => setFormData({...formData, clientStdCode: e.target.value})} className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary text-center" placeholder="+1" />
                                <input type="text" value={formData.clientPhone || ''} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Mobile Number" />
                             </div>
                         </div>
                     </div>
                </div>
                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 mt-2">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-24" /></div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl"><button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button><button onClick={handleSave} className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">Save Changes</button></div>
        </div>
    </div>
  );
};

const ProjectCard = ({ project, onClick, onAction }: any) => (
    <div onClick={onClick} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-full relative">
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onAction('edit', project); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg"><MoreHorizontal size={16}/></button>
        </div>
        <div className="mb-3"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${project.status === 'Execution' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{project.status}</span></div>
        <h3 className="font-bold text-lg text-slate-800 mb-1">{project.title}</h3>
        <p className="text-xs text-slate-500 mb-4 line-clamp-2">{project.description}</p>
        <div className="mt-auto pt-3 border-t border-slate-50">
             <div className="flex justify-between text-xs font-bold text-slate-500 mb-1"><span>Progress</span><span>{project.progress}%</span></div>
             <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3"><div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }}></div></div>
             <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-700">${project.budget.committed?.toLocaleString() || 0}</span><span className="text-slate-400">Due {formatDateDisplay(project.endDate)}</span></div>
        </div>
    </div>
);

const ProjectsView = ({ projects, tasks, onSelectProject, onCreateProject, onDeleteProject, onUpdateProject }: any) => {
    const [isNewOpen, setIsNewOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProjects = projects.filter((p: Project) => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="h-full flex flex-col animate-in fade-in">
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
                 {filteredProjects.map((p: Project) => <ProjectCard key={p.id} project={p} onClick={() => onSelectProject(p.id)} onAction={(a: string) => a === 'edit' && onUpdateProject(p)} />)}
                 {filteredProjects.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        <p>No projects found matching "{searchQuery}"</p>
                    </div>
                 )}
             </div>
        </div>
    );
};

const LeadCard: React.FC<{ lead: Lead }> = ({ lead }) => {
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">{lead.name}</h4>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{lead.clientType === 'Company' ? lead.company : 'Individual'}</p>
        </div>
        <div className={`w-2 h-2 rounded-full ${lead.status === 'New' ? 'bg-blue-500' : lead.status === 'Won' ? 'bg-green-500' : 'bg-slate-300'}`} />
      </div>
      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
           <Mail size={12} className="text-slate-400" />
           <span className="truncate max-w-[180px]">{lead.email}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
           <MapPin size={12} className="text-slate-400" />
           <span className="truncate max-w-[180px]">{lead.location}</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
        <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{lead.serviceType}</span>
        <span className="text-xs font-bold text-slate-900">${lead.value.toLocaleString()}</span>
      </div>
    </div>
  );
};

const CreateLeadModal = ({ isOpen, onClose, onCreate }: any) => {
  const [formData, setFormData] = useState<any>({
    name: '',
    clientType: 'Individual',
    company: '',
    email: '',
    stdCode: '+1',
    phone: '',
    country: '',
    location: '',
    source: 'Website',
    serviceType: AVAILABLE_SERVICES[0],
    status: 'New',
    budgetRange: '',
    requirement: '',
    value: 0
  });
  const [isOtherService, setIsOtherService] = useState(false);
  const [otherService, setOtherService] = useState('');

  useEffect(() => {
    if (isOpen) {
        setFormData({
            name: '',
            clientType: 'Individual',
            company: '',
            email: '',
            stdCode: '+1',
            phone: '',
            country: '',
            location: '',
            source: 'Website',
            serviceType: AVAILABLE_SERVICES[0],
            status: 'New',
            budgetRange: '',
            requirement: '',
            value: 0
        });
        setIsOtherService(false);
        setOtherService('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
      const finalService = isOtherService ? otherService : formData.serviceType;
      
      if (!formData.name) return alert('Lead Name is required');
      
      const newLead: Lead = {
          id: `LEAD-${Date.now()}`,
          name: formData.name,
          clientType: formData.clientType,
          company: formData.clientType === 'Company' ? formData.company : undefined,
          email: formData.email,
          phone: `${formData.stdCode} ${formData.phone}`,
          stdCode: formData.stdCode,
          location: formData.location,
          country: formData.country,
          source: formData.source,
          serviceType: finalService,
          status: formData.status,
          budgetRange: formData.budgetRange,
          requirement: formData.requirement,
          value: parseFloat(formData.value) || 0,
          probability: 10,
          lastContact: new Date().toISOString().split('T')[0]
      };
      
      if (isOtherService && finalService && !AVAILABLE_SERVICES.includes(finalService)) {
          AVAILABLE_SERVICES.push(finalService);
      }

      onCreate(newLead);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Users size={16}/></div>
                    <h2 className="text-lg font-bold text-slate-900">Add New Lead</h2>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lead Name <span className="text-red-500">*</span></label>
                        <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" placeholder="Full Name" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Client Type</label>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg">
                            <button onClick={() => setFormData({...formData, clientType: 'Individual'})} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${formData.clientType === 'Individual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Individual</button>
                            <button onClick={() => setFormData({...formData, clientType: 'Company'})} className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${formData.clientType === 'Company' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Company</button>
                        </div>
                    </div>
                </div>

                {formData.clientType === 'Company' && (
                    <div className="animate-in slide-in-from-top-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Business Name</label>
                        <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-slate-400" />
                            <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Organization Name" />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Email Address</label>
                         <div className="flex items-center gap-2">
                            <Mail size={16} className="text-slate-400" />
                            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="name@example.com" />
                         </div>
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mobile Number</label>
                         <div className="flex gap-2">
                            <input type="text" value={formData.stdCode} onChange={e => setFormData({...formData, stdCode: e.target.value})} className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary text-center" placeholder="+1" />
                            <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="123 456 7890" />
                         </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Country</label>
                        <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Country" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">City / Location</label>
                        <div className="flex items-center gap-2">
                             <MapPin size={16} className="text-slate-400" />
                             <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="City" />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-100 my-2" />

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Service Type</label>
                        <select 
                            value={isOtherService ? 'Other' : formData.serviceType} 
                            onChange={(e) => {
                                if (e.target.value === 'Other') {
                                    setIsOtherService(true);
                                } else {
                                    setIsOtherService(false);
                                    setFormData({...formData, serviceType: e.target.value});
                                }
                            }} 
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white"
                        >
                            {AVAILABLE_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                            <option value="Other">Not in list (Add New)</option>
                        </select>
                        {isOtherService && (
                            <input 
                                autoFocus
                                type="text" 
                                value={otherService} 
                                onChange={e => setOtherService(e.target.value)} 
                                className="mt-2 w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:border-primary bg-blue-50/50" 
                                placeholder="Enter new service type..." 
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lead Source</label>
                        <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">
                            <option value="Website">Website</option>
                            <option value="LinkedIn">LinkedIn</option>
                            <option value="Referral">Referral</option>
                            <option value="Cold Call">Cold Call</option>
                            <option value="Social Media">Social Media</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">
                            {['New', 'Contacted', 'Qualified', 'Demo Scheduled', 'Proposal Made', 'Negotiation Started', 'Won', 'Lost'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Approx. Budget</label>
                        <input type="text" value={formData.budgetRange} onChange={e => setFormData({...formData, budgetRange: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="e.g. $5k - $10k" />
                     </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Requirement Description</label>
                    <textarea value={formData.requirement} onChange={e => setFormData({...formData, requirement: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-24" placeholder="Client requirements, notes, etc." />
                </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
                <button onClick={handleCreate} className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">Add Lead</button>
            </div>
        </div>
    </div>
  );
};

const LeadsView = () => {
    const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
    const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
    const statuses = ['New', 'Contacted', 'Qualified', 'Proposal Made', 'Negotiation Started', 'Won', 'Lost'];
    
    return (
        <div className="h-full flex flex-col animate-in fade-in">
            <CreateLeadModal 
                isOpen={isNewLeadOpen} 
                onClose={() => setIsNewLeadOpen(false)} 
                onCreate={(lead: Lead) => { setLeads([...leads, lead]); setIsNewLeadOpen(false); }}
            />
            <SectionHeader 
                title="Leads & CRM" 
                subtitle="Manage your sales pipeline" 
                action={
                    <button 
                        onClick={() => setIsNewLeadOpen(true)} 
                        className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus size={18} /> Add Lead
                    </button>
                } 
            />
            <div className="flex-1 overflow-x-auto pb-4">
                <div className="flex space-x-4 h-full min-w-max">
                    {statuses.map(status => (
                        <div key={status} className="w-72 bg-slate-50/50 rounded-2xl border border-slate-200/60 flex flex-col">
                            <div className="p-3 border-b border-slate-100 font-bold text-sm text-slate-700 flex justify-between items-center bg-slate-100/50 rounded-t-2xl">
                                {status}
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{leads.filter(l => l.status === status).length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {leads.filter(l => l.status === status).map(l => <LeadCard key={l.id} lead={l} />)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- PLAYBOOK COMPONENTS ---

const PlaybookStepCard: React.FC<{ step: PlaybookStep, onEdit: () => void, onDelete: () => void }> = ({ step, onEdit, onDelete }) => {
  const getIcon = () => {
    switch (step.channel) {
      case 'email': return <Mail size={16} className="text-blue-500" />;
      case 'whatsapp': return <MessageCircle size={16} className="text-green-500" />;
      case 'voice': return <Phone size={16} className="text-purple-500" />;
      case 'internal_task': return <CheckSquare size={16} className="text-orange-500" />;
      default: return <Zap size={16} />;
    }
  };

  return (
    <div className="relative flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className="w-px h-6 bg-slate-200"></div>
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center z-10 font-bold text-xs text-slate-500">
          {step.order}
        </div>
        <div className="w-px flex-1 bg-slate-200 min-h-[40px]"></div>
      </div>
      <div className="flex-1 pb-6">
        {step.trigger.value > 0 && (
           <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
             <Clock size={12} />
             <span>Wait {step.trigger.value} {step.trigger.unit}</span>
           </div>
        )}
        <div 
          onClick={onEdit}
          className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                {getIcon()}
              </div>
              <span className="font-bold text-sm text-slate-800 capitalize">{step.channel.replace('_', ' ')}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>
          <div className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
            {step.content}
          </div>
        </div>
      </div>
    </div>
  );
};

const PlaybookEditor = ({ playbook, onClose, onSave }: { playbook: Playbook | null, onClose: () => void, onSave: (p: Playbook) => void }) => {
  const [formData, setFormData] = useState<Playbook>(playbook || {
    id: `PB-${Date.now()}`,
    name: '',
    description: '',
    leadType: '',
    isActive: true,
    steps: [],
    activeLeadsCount: 0
  });

  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  const addStep = () => {
    const newStep: PlaybookStep = {
      id: `step-${Date.now()}`,
      order: formData.steps.length + 1,
      channel: 'email',
      trigger: { type: 'delay', value: 1, unit: 'days' },
      content: ''
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
    setEditingStepId(newStep.id);
  };

  const updateStep = (id: string, updates: Partial<PlaybookStep>) => {
    setFormData({
      ...formData,
      steps: formData.steps.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const deleteStep = (id: string) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 }))
    });
  };

  const activeStep = formData.steps.find(s => s.id === editingStepId);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300 relative">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-20">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{playbook ? 'Edit Playbook' : 'New Playbook'}</h2>
            <p className="text-xs text-slate-500">Design your automated lead nurturing sequence</p>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
             <button onClick={() => { onSave(formData); onClose(); }} className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">Save Playbook</button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Steps List */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-slate-100 bg-white">
             <div className="space-y-4 mb-8">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Playbook Name</label>
                 <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-bold" placeholder="e.g. Wedding Lead Nurture" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lead Type / Context</label>
                 <input type="text" value={formData.leadType} onChange={e => setFormData({...formData, leadType: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="e.g. Wedding, B2B, Real Estate" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                 <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-20" placeholder="Describe the goal of this playbook..." />
               </div>
             </div>

             <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-slate-800">Sequence Steps</h3>
               <button onClick={addStep} className="flex items-center gap-1 text-xs font-bold text-primary hover:bg-blue-50 px-2 py-1 rounded transition-colors"><Plus size={14}/> Add Step</button>
             </div>

             <div className="pl-2">
                {formData.steps.map(step => (
                  <PlaybookStepCard 
                    key={step.id} 
                    step={step} 
                    onEdit={() => setEditingStepId(step.id)} 
                    onDelete={() => deleteStep(step.id)} 
                  />
                ))}
                {formData.steps.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl">
                    <p className="text-sm text-slate-400 font-medium">No steps yet.</p>
                    <button onClick={addStep} className="mt-2 text-primary text-xs font-bold hover:underline">Add your first step</button>
                  </div>
                )}
             </div>
          </div>

          {/* Right Panel: Step Detail Editor */}
          {activeStep && (
            <div className="w-80 bg-slate-50 p-6 overflow-y-auto border-l border-slate-100 animate-in slide-in-from-right duration-300 shadow-xl z-10">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="font-bold text-slate-800">Edit Step {activeStep.order}</h3>
                 <button onClick={() => setEditingStepId(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
               </div>

               <div className="space-y-5">
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Delay Trigger</label>
                   <div className="flex gap-2">
                     <input 
                       type="number" 
                       min="0"
                       value={activeStep.trigger.value} 
                       onChange={e => updateStep(activeStep.id, { trigger: { ...activeStep.trigger, value: parseInt(e.target.value) || 0 } })} 
                       className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary"
                     />
                     <select 
                       value={activeStep.trigger.unit} 
                       onChange={e => updateStep(activeStep.id, { trigger: { ...activeStep.trigger, unit: e.target.value as any } })}
                       className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white"
                     >
                       <option value="hours">Hours</option>
                       <option value="days">Days</option>
                     </select>
                   </div>
                   <p className="text-[10px] text-slate-400 mt-1">Wait time after previous step.</p>
                 </div>

                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Channel</label>
                   <div className="grid grid-cols-2 gap-2">
                     {['email', 'whatsapp', 'voice', 'internal_task'].map(c => (
                       <button 
                         key={c}
                         onClick={() => updateStep(activeStep.id, { channel: c as any })}
                         className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border text-xs font-bold transition-all ${activeStep.channel === c ? 'bg-white border-primary text-primary shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                       >
                         {c === 'email' && <Mail size={16}/>}
                         {c === 'whatsapp' && <MessageCircle size={16}/>}
                         {c === 'voice' && <Phone size={16}/>}
                         {c === 'internal_task' && <CheckSquare size={16}/>}
                         <span className="capitalize">{c.replace('_', ' ')}</span>
                       </button>
                     ))}
                   </div>
                 </div>

                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">
                     {activeStep.channel === 'internal_task' ? 'Task Description' : 'Message Template'}
                   </label>
                   <div className="relative">
                     <textarea 
                       value={activeStep.content} 
                       onChange={e => updateStep(activeStep.id, { content: e.target.value })} 
                       className="w-full px-3 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-48 leading-relaxed" 
                       placeholder={activeStep.channel === 'internal_task' ? "Describe what needs to be done..." : "Hi {{lead_name}}, ..."}
                     />
                     {activeStep.channel !== 'internal_task' && (
                       <div className="absolute bottom-2 right-2 flex gap-1">
                         <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 cursor-help" title="Use {{lead_name}} variable">{'{{lead_name}}'}</span>
                         <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 cursor-help" title="Use {{calendar_link}} variable">{'{{calendar_link}}'}</span>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- NEW COMPONENT: Playbook Generator Modal ---

const PlaybookGeneratorModal = ({ onClose, onGenerate }: { onClose: () => void, onGenerate: (p: Playbook) => void }) => {
  const [formData, setFormData] = useState({
    leadType: '',
    requirementSummary: '',
    serviceType: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePlaybook = async () => {
     setIsGenerating(true);
     try {
       const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
       
       const prompt = `
         Create a structured Lead Nurturing Playbook for Seyal AI.
         Context:
         - Service Type: ${formData.serviceType}
         - Lead Type: ${formData.leadType}
         - Summary: ${formData.requirementSummary}

         Generate a JSON response with:
         1. name (string): A catchy title for the playbook.
         2. description (string): Short goal of this playbook.
         3. steps (array): 3-7 steps. Each step has:
            - channel (enum: 'email', 'whatsapp', 'voice', 'internal_task')
            - delayHours (number): Hours to wait before this step (from previous step). 0 means immediate.
            - content (string): The message template or task instruction. Use {{lead_name}}, {{calendar_link}} placeholders.
         
         The sequence should build trust, clarify requirements, and drive towards a booking/sale.
       `;

       const result = await ai.models.generateContent({
         model: "gemini-3-flash-preview",
         contents: prompt,
         config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      channel: { type: Type.STRING, enum: ['email', 'whatsapp', 'voice', 'internal_task'] },
                      delayHours: { type: Type.NUMBER },
                      content: { type: Type.STRING }
                    },
                    required: ['channel', 'delayHours', 'content']
                  }
                }
              },
              required: ['name', 'description', 'steps']
            }
         }
       });

       const json = JSON.parse(result.text || "{}");
       
       const newPlaybook: Playbook = {
         id: `PB-${Date.now()}`,
         name: json.name,
         description: json.description,
         leadType: formData.leadType || formData.serviceType,
         isActive: true,
         activeLeadsCount: 0,
         steps: json.steps.map((s: any, i: number) => ({
           id: `s-${Date.now()}-${i}`,
           order: i + 1,
           channel: s.channel,
           trigger: { type: 'delay', value: s.delayHours > 23 ? Math.round(s.delayHours / 24) : s.delayHours, unit: s.delayHours > 23 ? 'days' : 'hours' },
           content: s.content
         }))
       };

       onGenerate(newPlaybook);
       onClose();

     } catch (e) {
       console.error("Failed to generate playbook", e);
       alert("Failed to generate playbook. Please try again.");
     } finally {
       setIsGenerating(false);
     }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><Sparkles size={16}/></div>
            <h3 className="font-bold text-slate-800">Generate with AI</h3>
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-700"/></button>
        </div>
        
        <div className="p-6 space-y-4">
           {isGenerating ? (
             <div className="py-12 flex flex-col items-center justify-center text-center">
               <Loader2 size={40} className="text-primary animate-spin mb-4" />
               <h4 className="font-bold text-slate-800 text-lg">Designing Playbook...</h4>
               <p className="text-sm text-slate-500 mt-2 max-w-xs">Analyzing lead context and crafting the perfect nurturing sequence.</p>
             </div>
           ) : (
             <>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Service / Product</label>
                 <select value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                    <option value="">Select Service...</option>
                    {AVAILABLE_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="Wedding Photography">Wedding Photography</option>
                    <option value="Home Renovation">Home Renovation</option>
                    <option value="SaaS Product">SaaS Product</option>
                 </select>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lead Type</label>
                 <input type="text" value={formData.leadType} onChange={e => setFormData({...formData, leadType: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm" placeholder="e.g. High Budget, Urgent, Cold Lead" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Requirements Summary</label>
                 <textarea value={formData.requirementSummary} onChange={e => setFormData({...formData, requirementSummary: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm h-24 resize-none" placeholder="Paste lead details or summary here..." />
               </div>
             </>
           )}
        </div>

        {!isGenerating && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-lg">Cancel</button>
            <button onClick={generatePlaybook} disabled={!formData.serviceType} className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
               <Wand2 size={16} /> Generate Playbook
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PlaybooksView = () => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>(MOCK_PLAYBOOKS);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  const handleSavePlaybook = (updated: Playbook) => {
    if (playbooks.some(p => p.id === updated.id)) {
      setPlaybooks(playbooks.map(p => p.id === updated.id ? updated : p));
    } else {
      setPlaybooks([...playbooks, updated]);
    }
    setIsEditorOpen(false);
  };

  const handleDeletePlaybook = (id: string) => {
    if (confirm('Delete this playbook template?')) {
      setPlaybooks(playbooks.filter(p => p.id !== id));
    }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {isGeneratorOpen && (
        <PlaybookGeneratorModal 
          onClose={() => setIsGeneratorOpen(false)}
          onGenerate={(p) => {
             setEditingPlaybook(p);
             setIsEditorOpen(true);
          }}
        />
      )}

      {isEditorOpen && (
        <PlaybookEditor 
          playbook={editingPlaybook} 
          onClose={() => setIsEditorOpen(false)} 
          onSave={handleSavePlaybook} 
        />
      )}
      
      <SectionHeader 
        title="Lead Playbooks" 
        subtitle="Automate your nurturing sequences" 
        action={
          <div className="flex gap-2">
            <button 
              onClick={() => setIsGeneratorOpen(true)}
              className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-5 py-2 rounded-xl text-sm font-bold hover:bg-indigo-200 transition-all"
            >
              <Sparkles size={18} /><span>Create with AI</span>
            </button>
            <button 
              onClick={() => { setEditingPlaybook(null); setIsEditorOpen(true); }} 
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all"
            >
              <Plus size={18} /><span>New Manual</span>
            </button>
          </div>
        } 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
        {playbooks.map(playbook => (
          <div key={playbook.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileText size={20} />
              </div>
              <div className="relative">
                <button onClick={() => handleDeletePlaybook(playbook.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <h3 className="text-base font-bold text-slate-900 mb-1">{playbook.name}</h3>
            <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{playbook.description || "No description provided."}</p>
            
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wide border border-slate-100">
                {playbook.leadType || 'General'}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${playbook.isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                {playbook.isActive ? <Play size={10} fill="currentColor"/> : <Pause size={10} fill="currentColor"/>}
                {playbook.isActive ? 'Active' : 'Paused'}
              </span>
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <ListIcon size={14} />
                <span>{playbook.steps.length} Steps</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={14} />
                <span>{playbook.activeLeadsCount} Active Leads</span>
              </div>
            </div>

            <button 
              onClick={() => { setEditingPlaybook(playbook); setIsEditorOpen(true); }}
              className="mt-4 w-full py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Edit Design
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const TasksView = ({ tasks, onUpdateTask, onAddTask, onDeleteTask, projects, projectId }: any) => {
    const [viewMode, setViewMode] = useState<'List' | 'Kanban' | 'Calendar'>('List');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [initialTaskDate, setInitialTaskDate] = useState<string | undefined>(undefined);

    const filteredTasks = useMemo(() => {
        return tasks.filter((t: Task) => !projectId || t.projectId === projectId);
    }, [tasks, projectId]);

    const handleEditTask = (task: Task) => {
        setSelectedTask(task);
        setIsDetailOpen(true);
        setInitialTaskDate(undefined);
    };

    const handleNewTask = (date?: string) => {
        setSelectedTask(null);
        setInitialTaskDate(date);
        setIsDetailOpen(true);
    };

    const handleSaveTask = (task: Task) => {
        if (tasks.find((t: any) => t.id === task.id)) {
            onUpdateTask(task);
        } else {
            onAddTask(task);
        }
        setIsDetailOpen(false);
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in">
             <div className="flex justify-between items-center mb-4">
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['List', 'Kanban', 'Calendar'].map((mode: any) => (
                        <button 
                            key={mode} 
                            onClick={() => setViewMode(mode)} 
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === mode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {mode}
                        </button>
                    ))}
                 </div>
                 <button onClick={() => handleNewTask()} className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 flex items-center gap-2">
                    <Plus size={16} /> Add Task
                 </button>
             </div>

             <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {viewMode === 'List' && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 overflow-hidden flex flex-col">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-slate-100 w-10">AI</th>
                                        <th className="px-4 py-3 border-b border-slate-100">Task</th>
                                        <th className="px-4 py-3 border-b border-slate-100 w-32">Assignee</th>
                                        <th className="px-4 py-3 border-b border-slate-100 w-32">Status</th>
                                        <th className="px-4 py-3 border-b border-slate-100 w-32">Priority</th>
                                        <th className="px-4 py-3 border-b border-slate-100 w-40">Due</th>
                                        <th className="px-4 py-3 border-b border-slate-100 w-24">Planned</th>
                                        <th className="px-4 py-3 border-b border-slate-100 w-24">Agreed</th>
                                        <th className="px-4 py-3 border-b border-slate-100 w-24">Paid</th>
                                        <th className="px-4 py-3 border-b border-slate-100 w-24">Balance</th>
                                        <th className="px-4 py-3 border-b border-slate-100 w-32">Pay Due</th>
                                        <th className="px-4 py-3 border-b border-slate-100 w-20 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-sm">
                                    {filteredTasks.map((t: Task) => (
                                        <TaskRow 
                                            key={t.id} 
                                            task={t} 
                                            onUpdateTask={onUpdateTask} 
                                            onAction={(action: string, item: any) => {
                                                if(action === 'delete') onDeleteTask(item.id);
                                                if(action === 'clone') onAddTask({...item, id: Date.now().toString(), title: item.title + ' (Copy)'});
                                            }}
                                            onEdit={() => handleEditTask(t)}
                                        />
                                    ))}
                                    {filteredTasks.length === 0 && (
                                        <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-400">No tasks found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {viewMode === 'Kanban' && (
                    <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                        <div className="flex space-x-4 h-full min-w-max">
                            {AVAILABLE_LISTS.map(list => (
                                <KanbanColumn 
                                    key={list} 
                                    list={list} 
                                    count={filteredTasks.filter((t: Task) => (t.list || 'General') === list).length} 
                                    tasks={filteredTasks} 
                                    onDrop={(e: any, listName: string) => {
                                        e.preventDefault();
                                        const taskId = e.dataTransfer.getData("text");
                                        const task = tasks.find((t: Task) => t.id === taskId);
                                        if (task) onUpdateTask({ ...task, list: listName });
                                    }}
                                    onDragStart={(e: any, id: string) => e.dataTransfer.setData("text", id)}
                                    onEditTask={handleEditTask}
                                    onNewTask={() => { setSelectedTask(null); setIsDetailOpen(true); }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === 'Calendar' && (
                    <CalendarBoard tasks={filteredTasks} onEditTask={handleEditTask} onNewTaskWithDate={handleNewTask} />
                )}
             </div>

             <TaskDetailPanel 
                isOpen={isDetailOpen} 
                onClose={() => setIsDetailOpen(false)} 
                task={selectedTask} 
                onSave={handleSaveTask}
                projectId={projectId}
                initialDate={initialTaskDate}
                onAction={(action: string, item: any) => {
                    if(action === 'delete') { onDeleteTask(item.id); setIsDetailOpen(false); }
                    if(action === 'clone') { onAddTask({...item, id: Date.now().toString(), title: item.title + ' (Copy)'}); setIsDetailOpen(false); }
                }}
             />
        </div>
    );
};

const ProjectDetailView = ({ projectId, onBack, tasks, onUpdateTask, onAddTask, onDeleteTask, projects, onUpdateProject }: any) => {
    const project = projects.find((p: Project) => p.id === projectId);
    const [isEditOpen, setIsEditOpen] = useState(false);
    
    if (!project) return <div>Project not found</div>;

    const projectTasks = tasks.filter((t: Task) => t.projectId === projectId);
    const completedTasks = projectTasks.filter((t: Task) => t.status === 'Done');
    const progress = projectTasks.length > 0 ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;

    return (
        <div className="h-full flex flex-col animate-in fade-in">
            <EditProjectModal 
                isOpen={isEditOpen} 
                onClose={() => setIsEditOpen(false)} 
                project={project}
                onSave={(updated: Project) => { onUpdateProject(updated); setIsEditOpen(false); }}
            />
            <div className="mb-6 flex-none">
                <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 text-sm font-bold mb-4 transition-colors">
                    <ChevronLeft size={16} /> Back to Projects
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <h1 className="text-2xl font-black text-slate-900">{project.title}</h1>
                             <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${project.status === 'Execution' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{project.status}</span>
                        </div>
                        <p className="text-slate-500 text-sm max-w-2xl">{project.description}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditOpen(true)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Edit Settings"><Settings size={20}/></button>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Budget</div>
                        <div className="text-xl font-bold text-slate-800">${project.budget.total.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-1">${project.budget.spent.toLocaleString()} spent</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                         <div className="text-xs font-bold text-slate-400 uppercase mb-1">Progress</div>
                         <div className="text-xl font-bold text-slate-800">{progress}%</div>
                         <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                             <div className="h-full bg-green-500" style={{width: `${progress}%`}}></div>
                         </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Client</div>
                        <div className="text-sm font-bold text-slate-800">{project.clientName || 'Internal'}</div>
                        <div className="text-xs text-slate-500 mt-1">{project.clientPhone || project.clientEmail}</div>
                    </div>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Timeline</div>
                        <div className="text-sm font-bold text-slate-800">{formatDateDisplay(project.endDate)}</div>
                        <div className="text-xs text-slate-500 mt-1">Target Completion</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 border-t border-slate-100 pt-4 flex flex-col">
                 <TasksView 
                    tasks={tasks}
                    projectId={projectId}
                    onUpdateTask={onUpdateTask}
                    onAddTask={onAddTask}
                    onDeleteTask={onDeleteTask}
                    projects={projects}
                 />
            </div>
        </div>
    );
};

// --- APP COMPONENT ---

const App = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState<string | null>(null);
  const [lastDeletedTask, setLastDeletedTask] = useState<Task | null>(null);

  const handleCreateProject = (payload: NewProjectPayload) => {
      const newProject: Project = {
          id: `PROJ-${Date.now()}`,
          ...payload,
          status: payload.status || 'Planning',
          budget: { total: payload.budget, committed: 0, spent: 0 },
          riskLevel: payload.riskLevel || 'Low',
          progress: 0
      };
      setProjects([...projects, newProject]);
      setView('projects');
  };

  const handleUpdateProject = (updated: Project) => {
      setProjects(projects.map(p => p.id === updated.id ? updated : p));
  };

  const handleDeleteProject = (id: string) => {
      if(confirm('Are you sure you want to delete this project?')) {
          setProjects(projects.filter(p => p.id !== id));
          setTasks(tasks.filter(t => t.projectId !== id));
      }
  };

  const handleCloneProject = (project: Project) => {
      const newId = `PROJ-${Date.now()}`;
      const newProject = { ...project, id: newId, title: `${project.title} (Copy)`, status: 'Draft' as ProjectStatus };
      setProjects([...projects, newProject]);
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const newTasks = projectTasks.map(t => ({...t, id: `TASK-${Date.now()}-${Math.random()}`, projectId: newId}));
      setTasks([...tasks, ...newTasks]);
  };

  const handleUpdateTask = (updated: Task) => {
      setTasks(tasks.map(t => t.id === updated.id ? updated : t));
  };

  const handleAddTask = (task: Task) => {
      setTasks([...tasks, task]);
  };

  const handleDeleteTask = (id: string) => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        setLastDeletedTask(task);
        setTasks(tasks.filter(t => t.id !== id));
        setShowNotification('Task deleted');
      }
  };

  const undoDeleteTask = () => {
      if (lastDeletedTask) {
          setTasks([...tasks, lastDeletedTask]);
          setLastDeletedTask(null);
          setShowNotification(null);
      }
  };

  const renderContent = () => {
      if (selectedProjectId) {
          return <ProjectDetailView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} tasks={tasks} onUpdateTask={handleUpdateTask} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} projects={projects} onUpdateProject={handleUpdateProject} />;
      }

      switch (view) {
          case 'projects': return <ProjectsView projects={projects} tasks={tasks} onSelectProject={setSelectedProjectId} onCreateProject={handleCreateProject} onDeleteProject={handleDeleteProject} onUpdateProject={handleUpdateProject} onCloneProject={handleCloneProject} />;
          case 'tasks': return <div className="h-full flex flex-col"><SectionHeader title="All Tasks" subtitle="Global task list" /><TasksView tasks={tasks} onUpdateTask={handleUpdateTask} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} projects={projects} /></div>;
          case 'leads': return <LeadsView />;
          case 'playbooks': return <PlaybooksView />;
          case 'dashboard': return (
              <div className="p-8 flex flex-col items-center justify-center h-full text-slate-400">
                  <LayoutDashboard size={48} className="mb-4 opacity-50"/>
                  <h2 className="text-xl font-bold mb-2">Dashboard Coming Soon</h2>
                  <p>Overview of all projects and AI insights.</p>
                  <button onClick={() => setView('projects')} className="mt-6 text-primary font-bold hover:underline">Go to Projects</button>
              </div>
          );
          default: return <div className="p-10 text-center text-slate-500">Module under construction</div>;
      }
  };

  const NavItem = ({ id, icon: Icon, label }: any) => (
      <button 
          onClick={() => { setView(id); setSelectedProjectId(null); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === id && !selectedProjectId ? 'bg-primary text-white shadow-lg shadow-primary/30 font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium'}`}
      >
          <Icon size={20} />
          <span>{label}</span>
      </button>
  );

  return (
    <div className="flex h-screen bg-white font-sans text-slate-900">
        <aside className="w-64 border-r border-slate-100 flex flex-col bg-slate-50/30">
            <div className="p-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white"><Sparkles size={18} fill="currentColor" /></div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">Seyal<span className="text-primary">AI</span></h1>
            </div>
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                <div className="text-[10px] font-bold text-slate-400 uppercase px-4 mb-2 mt-4">Main</div>
                <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavItem id="projects" icon={Briefcase} label="Projects" />
                <NavItem id="tasks" icon={CheckSquare} label="My Tasks" />
                
                <div className="text-[10px] font-bold text-slate-400 uppercase px-4 mb-2 mt-6">Growth</div>
                <NavItem id="leads" icon={Users} label="Leads & CRM" />
                <NavItem id="playbooks" icon={FileText} label="Playbooks" />
                <NavItem id="automation" icon={Zap} label="Automations" />
                
                <div className="text-[10px] font-bold text-slate-400 uppercase px-4 mb-2 mt-6">Workspace</div>
                <NavItem id="contacts" icon={User} label="Contacts" />
                <NavItem id="settings" icon={Settings} label="Settings" />
            </nav>
            <div className="p-4 border-t border-slate-200/60">
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">JD</div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">John Doe</div>
                        <div className="text-[10px] text-slate-500 truncate">Pro Workspace</div>
                    </div>
                </div>
            </div>
        </aside>
        <main className="flex-1 min-w-0 h-full overflow-hidden bg-white relative">
            <div className="h-full p-6 overflow-hidden">
                {renderContent()}
            </div>
            {showNotification && <NotificationToast message={showNotification} onUndo={undoDeleteTask} onClose={() => setShowNotification(null)} />}
        </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}