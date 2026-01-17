import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  X, Share2, MoreHorizontal, Check, ChevronDown, Minus, 
  ChevronUp, AlertCircle, Repeat, Bot, MessageCircle, Clock, Phone, 
  History as HistoryIcon, Folder, ChevronRight, ChevronLeft, Plus, Hash, Sparkles, Save,
  LayoutDashboard, CheckSquare, Users, Settings, Zap,
  Kanban as KanbanIcon, Table as TableIcon, Filter,
  ArrowUpDown, ArrowUp, ArrowDown, Search, CheckCircle2, CopyPlus, Archive, Trash2, Maximize2,
  Bell, Mail, PieChart, TrendingUp, AlertTriangle, Wallet, ArrowRight, Pencil, Link,
  FileText, User, List as ListIcon, Layout, Globe, Copy, Briefcase, Calendar
} from 'lucide-react';

// --- Types ---

type ViewState = 'dashboard' | 'projects' | 'leads' | 'contacts' | 'automation' | 'settings' | 'tasks';

type ProjectStatus = 'Draft' | 'Planning' | 'Ready' | 'Execution' | 'On Hold' | 'Completed' | 'Cancelled' | 'Archived';

interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}

interface AiHistoryItem {
  id: string;
  timestamp: string;
  status: 'success' | 'failure' | 'pending' | 'neutral';
  action: string;
  details: string;
}

interface AiChannelSettings {
  triggers?: string[];
  custom?: {
    date?: string;
    time?: string;
    frequency?: string;
  };
}

export interface Task {
  id: string;
  projectId?: string; 
  title: string;
  status: string;
  priority: string;
  assignee: string; 
  assignmentType?: 'Self' | 'Contact' | 'Team' | 'Unknown';
  dueDate: string;
  dueTime?: string;
  description: string;
  tags: string[];
  subtasks: Subtask[];
  dependencies: string[];
  recurrence: {
    enabled: boolean;
    frequency: string;
    interval: number;
    endDate?: string;
    [key: string]: any;
  };
  aiCoordination: boolean;
  aiChannels: {
    whatsapp: boolean;
    email: boolean;
    voice: boolean;
    whatsappSettings?: AiChannelSettings;
    voiceSettings?: AiChannelSettings;
    [key: string]: any;
  };
  aiHistory: AiHistoryItem[];
  budget: {
    planned: number;
    agreed: number;
    advance: number;
    status: string;
    paymentDueDate: string;
    [key: string]: any;
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
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';
  source: 'LinkedIn' | 'Website' | 'Referral' | 'Cold Call' | 'Event';
  value: number;
  lastContact: string;
  probability: number;
  notes: string;
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
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

// --- Mock Data ---

const AVAILABLE_LISTS = ['General', 'Marketing', 'Sales', 'Engineering', 'Design', 'HR', 'Finance'];

const MOCK_LEADS: Lead[] = [
  {
    id: 'LEAD-001',
    name: 'Alice Johnson',
    company: 'TechFlow Inc.',
    email: 'alice@techflow.com',
    phone: '+1 (555) 123-4567',
    status: 'Proposal',
    source: 'Website',
    value: 15000,
    lastContact: '2023-11-10',
    probability: 75,
    notes: 'Interested in full-stack modernization.'
  },
  {
    id: 'LEAD-002',
    name: 'Bob Smith',
    company: 'Global Logistics',
    email: 'bsmith@glogistics.net',
    phone: '+1 (555) 987-6543',
    status: 'New',
    source: 'LinkedIn',
    value: 5000,
    lastContact: '2023-11-12',
    probability: 20,
    notes: 'Connected via LinkedIn, sent intro deck.'
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
    clientName: 'TechFlow Inc.',
    clientEmail: 'contact@techflow.com',
    clientPhone: '+1 (555) 123-4567'
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
    clientName: 'Internal',
    clientEmail: 'ops@ourcompany.com'
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

const MOCK_ACTIVITY_LOGS: ActivityLogItem[] = [
    {
        id: 'act-1',
        projectId: 'PROJ-001',
        type: 'creation',
        user: 'John Doe',
        userInitials: 'JD',
        action: 'created the project',
        details: 'Project "Q4 Marketing Blitz" was initialized with a budget of $50,000.',
        timestamp: '2023-09-15T09:00:00',
    },
    {
        id: 'act-2',
        projectId: 'PROJ-001',
        type: 'ai_action',
        user: 'AI Agent',
        action: 'generated initial plan',
        details: 'Created 12 tasks based on the project description and timeline.',
        timestamp: '2023-09-15T09:05:00',
    }
];

// --- Helper Functions ---

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const calculateRiskMetrics = (project: Project, tasks: Task[]) => {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const now = new Date();
  const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  
  const overdueTasks = projectTasks.filter(t => t.status !== 'Done' && t.status !== 'Archived' && t.dueDate && t.dueDate < today);
  const committed = projectTasks.reduce((sum, t) => sum + (t.budget?.agreed || 0), 0);
  const totalBudget = project.budget.total;
  const budgetUsage = totalBudget > 0 ? committed / totalBudget : 0;

  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];
  const atRiskTasks = projectTasks.filter(t => t.status !== 'Done' && t.status !== 'Archived' && t.dueDate && t.dueDate >= today && t.dueDate <= threeDaysStr);

  let score = 0;
  if (budgetUsage > 1.0) score += 10;
  else if (budgetUsage > 0.85) score += 3;

  score += overdueTasks.length * 3;
  score += atRiskTasks.length * 1;

  let level: 'Low' | 'Medium' | 'High' = 'Low';
  if (score >= 10) level = 'High';
  else if (score >= 5) level = 'Medium';

  return { level, overdueCount: overdueTasks.length, atRiskCount: atRiskTasks.length, budgetUsage };
};

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void 
}) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-primary text-white shadow-lg shadow-primary/30' 
        : 'text-slate-500 hover:bg-white hover:text-primary'
    }`}
  >
    <Icon size={20} className={active ? 'text-white' : 'text-slate-400 group-hover:text-primary'} />
    {label && <span className="font-medium text-sm truncate">{label}</span>}
  </button>
);

const CustomDatePicker = ({ 
  value, 
  onChange, 
  label, 
  className,
  compact = false,
  minDate,
  maxDate
}: { 
  value: string, 
  onChange: (val: string) => void, 
  label?: string, 
  className?: string,
  compact?: boolean,
  minDate?: string,
  maxDate?: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  
  const dateValue = value ? new Date(value) : new Date();
  const safeDate = isNaN(dateValue.getTime()) ? new Date() : dateValue;
  const [viewDate, setViewDate] = useState(safeDate);

  useEffect(() => {
    if (isOpen && value) {
        const d = new Date(value);
        if (!isNaN(d.getTime())) setViewDate(d);
    }
  }, [isOpen, value]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const screenH = window.innerHeight;
      const spaceBelow = screenH - rect.bottom;
      const top = spaceBelow < 300 ? rect.top - 280 : rect.bottom + 5;
      setDropdownPos({ top, left: rect.left });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleScroll = () => { if(isOpen) setIsOpen(false); }
    
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDayClick = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const newDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (minDate && newDateStr < minDate) return;
    if (maxDate && newDateStr > maxDate) return;
    onChange(newDateStr);
    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  return (
     <div className={`relative ${className || ''}`} ref={containerRef}>
        {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{label}</label>}
        <button 
            onClick={() => setIsOpen(!isOpen)} 
            className={`flex items-center w-full text-left transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50 ${compact ? 'bg-transparent text-xs text-slate-600 font-medium py-1 hover:text-primary' : 'px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white hover:border-primary text-slate-700'}`}
        >
           {!compact && <Calendar size={16} className="mr-2 text-slate-400" />}
           <span className={`${!value && 'text-slate-400'}`}>{value ? formatDateDisplay(value) : 'Select Date'}</span>
        </button>
        {isOpen && (
           <div 
             className="fixed z-[9999] bg-white shadow-2xl border border-slate-100 p-4 w-72 rounded-2xl animate-in fade-in zoom-in-95 duration-200"
             style={{ top: dropdownPos.top, left: dropdownPos.left }}
           >
              <div className="flex justify-between items-center mb-4">
                  <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronLeft size={18}/></button>
                  <span className="text-sm font-bold text-slate-800">{monthName} {viewDate.getFullYear()}</span>
                  <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronRight size={18}/></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                  {emptyDays.map(d => <div key={`empty-${d}`} />)}
                  {daysArray.map(day => {
                      const currentDayStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isDisabled = (minDate && currentDayStr < minDate) || (maxDate && currentDayStr > maxDate);
                      const isSelected = value === currentDayStr;
                      const isToday = new Date().toISOString().split('T')[0] === currentDayStr;
                      return (
                          <button 
                            key={day} 
                            onClick={() => !isDisabled && handleDayClick(day)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all 
                              ${isDisabled ? 'text-slate-300 cursor-not-allowed' : 
                                isSelected ? 'bg-primary text-white shadow-md shadow-primary/30' : 
                                isToday ? 'bg-slate-100 text-primary font-bold' : 
                                'text-slate-600 hover:bg-slate-100'}`}
                          >
                              {day}
                          </button>
                      );
                  })}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                  <button onClick={() => { onChange(new Date().toISOString().split('T')[0]); setIsOpen(false); }} className="text-[10px] font-bold text-primary hover:underline">Today</button>
                  <button onClick={() => { onChange(''); setIsOpen(false); }} className="text-[10px] text-slate-400 hover:text-slate-600">Clear</button>
              </div>
           </div>
        )}
     </div>
  );
};

const CustomTimePicker = ({ value, onChange, label, className, compact = false }: { value: string, onChange: (val: string) => void, label?: string, className?: string, compact?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const screenH = window.innerHeight;
        const spaceBelow = screenH - rect.bottom;
        const top = spaceBelow < 250 ? rect.top - 200 : rect.bottom + 5;
        setDropdownPos({ top, left: rect.left });
      }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
        const handleScroll = () => { if(isOpen) setIsOpen(false); }
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
    
    return (
        <div className={`relative ${className || ''}`} ref={containerRef}>
            {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{label}</label>}
            <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center w-full text-left transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50 ${compact ? 'bg-transparent text-[10px] text-slate-400 hover:text-primary py-1' : 'px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white hover:border-primary text-slate-700'}`}>
               {!compact && <Clock size={16} className="mr-2 text-slate-400" />}<span className={`${!value && 'text-slate-400'}`}>{value || (compact ? '--:--' : 'Select Time')}</span>
            </button>
            {isOpen && (
                <div 
                  className="fixed z-[9999] bg-white shadow-2xl border border-slate-100 p-2 w-48 rounded-2xl flex gap-2 h-48 animate-in fade-in zoom-in-95 duration-200"
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="text-[10px] font-bold text-slate-400 text-center mb-1 sticky top-0 bg-white/90 backdrop-blur-sm py-1">HR</div>
                        {hours.map(h => (
                            <button key={h} onClick={() => onChange(`${h}:${value ? value.split(':')[1] || '00' : '00'}`)} className={`w-full py-1.5 text-xs rounded-lg hover:bg-slate-50 mb-0.5 transition-colors ${value?.startsWith(h) ? 'bg-primary text-white font-bold shadow-md shadow-primary/20 hover:bg-primary' : 'text-slate-600'}`}>
                                {h}
                            </button>
                        ))}
                    </div>
                    <div className="w-px bg-slate-100 my-2" />
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="text-[10px] font-bold text-slate-400 text-center mb-1 sticky top-0 bg-white/90 backdrop-blur-sm py-1">MIN</div>
                        {minutes.map(m => (
                            <button key={m} onClick={() => onChange(`${value ? value.split(':')[0] || '09' : '09'}:${m}`)} className={`w-full py-1.5 text-xs rounded-lg hover:bg-slate-50 mb-0.5 transition-colors ${value?.endsWith(m) ? 'bg-primary text-white font-bold shadow-md shadow-primary/20 hover:bg-primary' : 'text-slate-600'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Toggle = ({ enabled, onToggle, size }: { enabled: boolean; onToggle: () => void; size?: string }) => (
  <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className={`relative inline-flex items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-primary' : 'bg-slate-300'} ${size === 'sm' ? 'h-5 w-9' : 'h-6 w-11'}`}><span className={`${enabled ? 'translate-x-5' : 'translate-x-1'} inline-block transform rounded-full bg-white transition-transform ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} /></button>
);

const MultiSelectDropdown = ({ options, selected, onChange, label }: { options: string[]; selected: string[]; onChange: (val: string[]) => void, label: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false); };
    if(isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) onChange(selected.filter(s => s !== option));
    else onChange([...selected, option]);
  };

  return (
    <div className="relative" ref={containerRef}>
        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{label}</label>
        <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 hover:border-slate-300">
            <span className="truncate">{selected.length > 0 ? `${selected.length} selected` : 'Select triggers...'}</span>
            <ChevronDown size={14} className="text-slate-400" />
        </button>
        {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {options.map(option => (
                    <div key={option} onClick={() => toggleOption(option)} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${selected.includes(option) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                            {selected.includes(option) && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-xs text-slate-700">{option}</span>
                    </div>
                ))}
            </div>
        )}
        {selected.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
                {selected.map(s => (
                    <span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {s} <button onClick={() => toggleOption(s)} className="ml-1 text-slate-400 hover:text-slate-600"><X size={10} /></button>
                    </span>
                ))}
            </div>
        )}
    </div>
  );
};

const SectionHeader = ({ title, subtitle, action }: any) => (
  <div className="flex justify-between items-end mb-6">
    <div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const ActionMenu = ({ onShare, onClone, onArchive, onDelete, isOpen, onClose }: any) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose(); };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div ref={menuRef} className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
      <div className="py-1">
        <button onClick={() => { onShare(); onClose(); }} className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"><Share2 size={16} className="mr-2 text-slate-400" /> Share</button>
        <button onClick={() => { onClone(); onClose(); }} className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"><CopyPlus size={16} className="mr-2 text-slate-400" /> Clone</button>
        <button onClick={() => { onArchive(); onClose(); }} className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"><Archive size={16} className="mr-2 text-slate-400" /> Archive</button>
        <div className="h-px bg-slate-100 my-1" />
        <button onClick={() => { onDelete(); onClose(); }} className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} className="mr-2" /> Delete</button>
      </div>
    </div>
  );
};

const NewProjectModal = ({ isOpen, onClose, onSubmit }: any) => {
  const [formData, setFormData] = useState<NewProjectPayload>({ title: '', category: 'General', startDate: new Date().toISOString().split('T')[0], endDate: '', budget: 0, description: '', clientName: '', clientEmail: '', clientPhone: '' });
  const [isAiLoading, setIsAiLoading] = useState(false);
  if (!isOpen) return null;
  const handleSubmit = () => {
    if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
        alert('End date cannot be earlier than start date.');
        return;
    }
    setIsAiLoading(true);
    setTimeout(() => { onSubmit(formData); setIsAiLoading(false); onClose(); setFormData({ title: '', category: 'General', startDate: new Date().toISOString().split('T')[0], endDate: '', budget: 0, description: '', clientName: '', clientEmail: '', clientPhone: '' }); }, 1500);
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl"><div><h2 className="text-lg font-bold text-slate-900">New Project</h2><p className="text-xs text-slate-500">Define goals for the AI Planning Coach</p></div><button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
               {isAiLoading ? (
                   <div className="flex flex-col items-center justify-center py-10 space-y-4"><div className="w-16 h-16 relative"><div className="absolute inset-0 rounded-full border-4 border-slate-100"></div><div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div><Bot className="absolute inset-0 m-auto text-primary" size={24}/></div><div className="text-center"><h3 className="text-sm font-bold text-slate-800">AI Planning Coach is working...</h3><p className="text-xs text-slate-500 mt-1">Generating tasks, budget breakdown, and timeline.</p></div></div>
               ) : (
                   <>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Project Title</label><input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" placeholder="e.g. Summer Marketing Campaign" autoFocus /></div>
                        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{AVAILABLE_LISTS.map(l => <option key={l} value={l}>{l}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Budget</label><div className="relative"><span className="absolute left-3 top-2 text-slate-400 text-sm">$</span><input type="number" value={formData.budget || ''} onChange={e => setFormData({...formData, budget: parseFloat(e.target.value) || 0})} className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" placeholder="0.00" /></div></div></div>
                        <div className="grid grid-cols-2 gap-4"><div><CustomDatePicker label="Start Date" value={formData.startDate} onChange={val => setFormData({...formData, startDate: val})} /></div><div><CustomDatePicker label="End Date" value={formData.endDate} onChange={val => setFormData({...formData, endDate: val})} minDate={formData.startDate} /></div></div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                             <div className="text-xs font-bold text-slate-500 uppercase mb-2">Client Details (Optional)</div>
                             <div className="grid grid-cols-1 gap-3">
                                 <div><input type="text" value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Client Name" /></div>
                                 <div className="grid grid-cols-2 gap-3">
                                     <input type="email" value={formData.clientEmail || ''} onChange={e => setFormData({...formData, clientEmail: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Email Address" />
                                     <input type="text" value={formData.clientPhone || ''} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Phone Number" />
                                 </div>
                             </div>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 mt-2">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-24" placeholder="Describe the goals and scope..." /></div>
                   </>
               )}
            </div>
            {!isAiLoading && (<div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl"><button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button><button onClick={handleSubmit} disabled={!formData.title} className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><Sparkles size={16} /><span>Start Planning Coach</span></button></div>)}
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
  const [isDependencyPickerOpen, setIsDependencyPickerOpen] = useState(false);
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
  
  // Auto-categorize list based on title keywords
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

  // Auto-generate tags based on description keywords and hashtags
  const autoGenerateTags = () => {
    const desc = formData.description;
    if (!desc) return;
    const existing = new Set(formData.tags || []);
    
    // Explicit hashtags
    const matches = desc.match(/#[a-z0-9_]+/gi);
    if (matches) matches.forEach(t => existing.add(t));
    
    // Keywords
    const lowerDesc = desc.toLowerCase();
    const map: any = { 'urgent': '#urgent', 'deadline': '#deadline', 'meeting': '#meeting', 'follow up': '#followup', 'review': '#review' };
    Object.keys(map).forEach(k => {
        if (lowerDesc.includes(k)) existing.add(map[k]);
    });
    
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

  const removeTag = (tag: string) => {
    updateField('tags', (formData.tags || []).filter(t => t !== tag));
  };

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
                 <CustomDatePicker 
                    value={settings.custom?.date || ''} 
                    onChange={(val) => updateSettings({...settings, custom: {...settings.custom, date: val}})} 
                    compact 
                    label="Date"
                 />
                 <CustomTimePicker 
                    value={settings.custom?.time || ''} 
                    onChange={(val) => updateSettings({...settings, custom: {...settings.custom, time: val}})} 
                    compact 
                    label="Time"
                 />
             </div>
             <div className="mt-2">
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Frequency</label>
                 <select 
                    value={settings.custom?.frequency || ''} 
                    onChange={(e) => updateSettings({...settings, custom: {...settings.custom, frequency: e.target.value}})}
                    className="w-full bg-white text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary"
                 >
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
            <div className="flex gap-2">
                <button onClick={() => onAction?.('share', formData)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><Share2 size={20} /></button>
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
                <div className="flex gap-3"><div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Assignee</label><select value={formData.assignee} onChange={(e) => updateField('assignee', e.target.value)} className="w-full bg-slate-50 p-2 rounded-lg text-sm"><option value="Me">Me</option><option value="AI Agent">AI Agent</option><option value="Team">Team</option></select></div><div className="flex-1"><label className="block text-xs font-bold text-slate-500 mb-1">Due Date</label><div className="flex gap-2"><CustomDatePicker value={formData.dueDate} onChange={(val) => updateField('dueDate', val)} compact className="flex-1" /><CustomTimePicker value={formData.dueTime || ''} onChange={(val) => updateField('dueTime', val)} compact className="w-20" /></div></div></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-2">Priority</label><div className="flex gap-2">{['Low', 'Medium', 'High', 'Urgent'].map(p => (<button key={p} onClick={() => updateField('priority', p)} className={`flex-1 py-2 rounded-lg border text-xs font-bold ${formData.priority === p ? 'bg-slate-100 border-slate-300 text-slate-800' : 'border-slate-100 text-slate-400'}`}>{p}</button>))}</div></div>
                
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
                                    <MultiSelectDropdown 
                                        label="Trigger Events"
                                        options={WHATSAPP_TRIGGERS} 
                                        selected={formData.aiChannels.whatsappSettings?.triggers || []} 
                                        onChange={(triggers) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, whatsappSettings: {...p.aiChannels.whatsappSettings, triggers}}}))} 
                                    />
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
                                    <MultiSelectDropdown 
                                        label="Call Triggers"
                                        options={VOICE_TRIGGERS} 
                                        selected={formData.aiChannels.voiceSettings?.triggers || []} 
                                        onChange={(triggers) => setFormData(p => ({...p, aiChannels: {...p.aiChannels, voiceSettings: {...p.aiChannels.voiceSettings, triggers}}}))} 
                                    />
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
                             <CustomDatePicker value={formData.recurrence.endDate || ''} onChange={(val) => setFormData(prev => ({...prev, recurrence: {...prev.recurrence, endDate: val}}))} compact className="w-full" />
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

const KanbanColumn: React.FC<{ list: string, count: number, tasks: Task[], onDragOver: any, onDrop: any, onDragStart: any, onEditTask: any, onNewTask: any }> = ({ list, count, tasks, onDragOver, onDrop, onDragStart, onEditTask, onNewTask }) => {
  const columnTasks = tasks.filter((t: Task) => (t.list || 'General') === list);
  const getPriorityColor = (p: string) => { switch(p) { case 'Urgent': return 'border-l-red-500'; case 'High': return 'border-l-orange-500'; default: return 'border-l-slate-200'; } };
  return (
    <div className="flex-shrink-0 w-80 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col max-h-full" onDragOver={onDragOver} onDrop={(e) => onDrop(e, list)}>
      <div className="p-4 flex items-center justify-between border-b border-slate-100"><div className="flex items-center space-x-2"><h4 className="font-bold text-sm text-slate-700">{list}</h4><span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span></div><button onClick={onNewTask} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"><Plus size={16} /></button></div>
      <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
         {columnTasks.map((task: Task) => (
           <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task.id)} onClick={() => onEditTask(task)} className={`bg-white p-4 rounded-xl border border-slate-200 border-l-4 ${getPriorityColor(task.priority)} shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all`}>
              <div className="flex flex-wrap gap-2 mb-2">{task.priority === 'Urgent' && <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase">Urgent</span>}</div>
              <h4 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2">{task.title}</h4>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-700">{task.assignee === 'Me' ? 'ME' : task.assignee.charAt(0)}</div><span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{task.status}</span></div>
                  {task.dueDate && (
                    <div className="text-right">
                        <div className="text-xs text-slate-400 font-medium">{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                        {task.dueTime && <div className="text-[10px] text-slate-400 font-medium mt-0.5">{task.dueTime}</div>}
                    </div>
                  )}
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

const CalendarBoard = ({ tasks, onEditTask, onNewTaskWithDate }: any) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysArray = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    const days = [];
    
    // Previous month filler
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        days.push({ date: null, dayNum: prevMonthLastDay - i, isCurrentMonth: false });
    }
    
    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        days.push({ date: dateStr, dayNum: i, isCurrentMonth: true });
    }
    
    // Next month filler
    const remainingSlots = 42 - days.length; // 6 rows * 7 cols
    for (let i = 1; i <= remainingSlots; i++) {
        days.push({ date: null, dayNum: i, isCurrentMonth: false });
    }
    
    return days;
  };

  const days = getDaysArray(currentDate.getFullYear(), currentDate.getMonth());
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const today = () => setCurrentDate(new Date());

  const getTasksForDate = (dateStr: string) => tasks.filter((t: Task) => t.dueDate === dateStr);

  const priorityColor = (p: string) => {
      switch(p) {
          case 'Urgent': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
          case 'High': return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
          case 'Medium': return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
          case 'Low': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
          default: return 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200';
      }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-slate-800">{monthName}</h2>
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button onClick={prevMonth} className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-slate-800 hover:shadow-sm transition-all"><ChevronLeft size={18}/></button>
                    <button onClick={today} className="text-xs font-bold text-slate-600 px-3 hover:text-primary transition-colors">Today</button>
                    <button onClick={nextMonth} className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-slate-800 hover:shadow-sm transition-all"><ChevronRight size={18}/></button>
                </div>
            </div>
        </div>
        
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
            ))}
        </div>

        <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-100/50 gap-px border-b border-slate-100">
            {days.map((day, idx) => (
                <div 
                    key={idx} 
                    className={`min-h-[100px] p-2 transition-colors relative group flex flex-col gap-1 ${day.isCurrentMonth ? 'bg-white hover:bg-slate-50/30' : 'bg-slate-50 text-slate-300'}`}
                    onClick={() => day.isCurrentMonth && day.date && onNewTaskWithDate(day.date)}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${day.date === new Date().toISOString().split('T')[0] ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-500'}`}>
                            {day.dayNum}
                        </span>
                    </div>
                    
                    {day.isCurrentMonth && day.date && (
                        <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-[120px]">
                            {getTasksForDate(day.date).map((t: Task) => (
                                <div 
                                    key={t.id}
                                    onClick={(e) => { e.stopPropagation(); onEditTask(t); }}
                                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shadow-sm ${priorityColor(t.priority)}`}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="truncate">{t.title}</span>
                                        {t.dueTime && <span className="opacity-75 text-[9px] whitespace-nowrap">{t.dueTime}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {day.isCurrentMonth && (
                        <button className="absolute bottom-2 right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 z-10">
                            <Plus size={14} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    </div>
  );
};

const TasksView = ({ tasks, onUpdateTask, onAddTask, onDeleteTask, projectId, projects }: any) => {
    const displayTasks = useMemo(() => projectId ? tasks.filter((t: Task) => t.projectId === projectId) : tasks, [tasks, projectId]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'board' | 'calendar'>('table');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [quickFilter, setQuickFilter] = useState('All');
    const [initialDate, setInitialDate] = useState<string>('');
    
    const processedTasks = useMemo(() => {
        let res = [...displayTasks];
        const today = new Date().toISOString().split('T')[0];
        
        switch (quickFilter) {
            case 'Pending':
                res = res.filter(t => t.status !== 'Done');
                break;
            case 'Overdue':
                res = res.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Done');
                break;
            case 'Completed':
                res = res.filter(t => t.status === 'Done');
                break;
            case 'Assigned to Me':
                res = res.filter(t => t.assignee === 'Me');
                break;
            case 'High Priority':
                res = res.filter(t => ['High', 'Urgent'].includes(t.priority));
                break;
            default: // 'All'
                break;
        }
        
        return res;
    }, [displayTasks, quickFilter]);
    
    const boardLists = useMemo(() => Array.from(new Set([...AVAILABLE_LISTS, ...processedTasks.map((t: Task) => t.list || 'General')])), [processedTasks]);

    const handleDragStart = (e: any, id: string) => { e.dataTransfer.setData('taskId', id); };
    const handleDrop = (e: any, list: string) => { const id = e.dataTransfer.getData('taskId'); const t = tasks.find((t: Task) => t.id === id); if(t) onUpdateTask({...t, list}); };

    const handleInlineUpdate = (task: Task, field: string, value: any) => {
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative flex flex-col h-full">
            <TaskDetailPanel isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={(t: Task) => { if(editingTask) onUpdateTask(t); else onAddTask(t); setIsModalOpen(false); }} task={editingTask} onAction={() => {}} projectId={projectId} availableTasks={tasks} projects={projects} initialDate={initialDate} />
            <div className="flex justify-between items-center mb-2">
                <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center">
                    <button onClick={() => setViewMode('board')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'board' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><KanbanIcon size={14} className="mr-2" /> Board</button>
                    <button onClick={() => setViewMode('table')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><TableIcon size={14} className="mr-2" /> Table</button>
                    <button onClick={() => setViewMode('calendar')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Calendar size={14} className="mr-2" /> Calendar</button>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isFilterOpen ? 'bg-slate-100 border-slate-300' : 'bg-white hover:bg-slate-50'}`}><Filter size={16} className="mr-2" /> Filter</button>
                    <button onClick={() => { setEditingTask(null); setInitialDate(new Date().toISOString().split('T')[0]); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"><Plus size={16} className="mr-2" /> Add Task</button>
                </div>
            </div>
            
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
                {['All', 'Pending', 'Overdue', 'Completed', 'Assigned to Me', 'High Priority'].map(f => (
                    <button 
                        key={f} 
                        onClick={() => setQuickFilter(f)} 
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                            quickFilter === f 
                            ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        {f}
                    </button>
                ))}
            </div>
            
            {viewMode === 'board' ? (
                <div className="flex-1 overflow-x-auto min-h-0 pb-4"><div className="flex space-x-6 h-full min-w-max pb-2">{boardLists.map(list => <KanbanColumn key={list} list={list} count={processedTasks.filter((t: Task) => (t.list || 'General') === list).length} tasks={processedTasks} onDragOver={(e: any) => e.preventDefault()} onDrop={handleDrop} onDragStart={handleDragStart} onEditTask={(t: Task) => { setEditingTask(t); setIsModalOpen(true); }} onNewTask={() => { setEditingTask(null); setIsModalOpen(true); }} />)}</div></div>
            ) : viewMode === 'table' ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left w-12 border-b border-slate-200">AI</th>
                                    <th className="px-4 py-3 text-left min-w-[200px] border-b border-slate-200">Task Name</th>
                                    <th className="px-4 py-3 text-left w-32 border-b border-slate-200">Assignee</th>
                                    <th className="px-4 py-3 text-left w-32 border-b border-slate-200">Status</th>
                                    <th className="px-4 py-3 text-left w-28 border-b border-slate-200">Priority</th>
                                    <th className="px-4 py-3 text-left w-36 border-b border-slate-200">Due Date</th>
                                    <th className="px-4 py-3 text-left w-28 border-b border-slate-200">Planned</th>
                                    <th className="px-4 py-3 text-left w-28 border-b border-slate-200">Agreed</th>
                                    <th className="px-4 py-3 text-left w-28 border-b border-slate-200">Advance</th>
                                    <th className="px-4 py-3 text-left w-28 border-b border-slate-200">Balance</th>
                                    <th className="px-4 py-3 text-left w-36 border-b border-slate-200">Due Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {processedTasks.map((t: Task) => {
                                    const agreed = t.budget?.agreed || 0;
                                    const advance = t.budget?.advance || 0;
                                    const balance = agreed - advance;
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                                                <Toggle enabled={t.aiCoordination} onToggle={() => handleInlineUpdate(t, 'aiCoordination', !t.aiCoordination)} size="sm" />
                                            </td>
                                            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                                                <input className="bg-transparent w-full focus:outline-none font-medium text-slate-700 truncate" value={t.title} onChange={e => handleInlineUpdate(t, 'title', e.target.value)} onClick={() => { setEditingTask(t); setIsModalOpen(true); }} />
                                            </td>
                                            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                                                <select className="bg-transparent w-full focus:outline-none text-xs text-slate-600 cursor-pointer appearance-none" value={t.assignee} onChange={e => handleInlineUpdate(t, 'assignee', e.target.value)}>
                                                    <option value="Me">Me</option>
                                                    <option value="AI Agent">AI Agent</option>
                                                    <option value="Team">Team</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                                                <select className={`bg-transparent w-full focus:outline-none text-xs font-bold cursor-pointer appearance-none rounded px-2 py-1 ${t.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`} value={t.status} onChange={e => handleInlineUpdate(t, 'status', e.target.value)}>
                                                    <option value="Draft">Draft</option>
                                                    <option value="Todo">Todo</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Done">Done</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                                                <select className={`bg-transparent w-full focus:outline-none text-xs font-bold cursor-pointer appearance-none ${t.priority === 'Urgent' ? 'text-red-600' : t.priority === 'High' ? 'text-orange-500' : 'text-slate-500'}`} value={t.priority} onChange={e => handleInlineUpdate(t, 'priority', e.target.value)}>
                                                    <option value="Low">Low</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="High">High</option>
                                                    <option value="Urgent">Urgent</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                                                <div className="flex flex-col items-start gap-1">
                                                    <CustomDatePicker value={t.dueDate} onChange={(val: any) => handleInlineUpdate(t, 'dueDate', val)} compact />
                                                    <CustomTimePicker value={t.dueTime || ''} onChange={(val: any) => handleInlineUpdate(t, 'dueTime', val)} compact />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                                                <div className="flex items-center text-xs text-slate-500">
                                                    <span className="mr-1">$</span>
                                                    <input type="number" className="bg-transparent w-full focus:outline-none" value={t.budget?.planned || ''} onChange={e => handleInlineUpdate(t, 'budget.planned', e.target.value)} placeholder="0" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                                                <div className="flex items-center text-xs text-slate-700 font-medium">
                                                    <span className="mr-1">$</span>
                                                    <input type="number" className="bg-transparent w-full focus:outline-none" value={t.budget?.agreed || ''} onChange={e => handleInlineUpdate(t, 'budget.agreed', e.target.value)} placeholder="0" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                                                <div className="flex items-center text-xs text-green-600">
                                                    <span className="mr-1">$</span>
                                                    <input type="number" className="bg-transparent w-full focus:outline-none" value={t.budget?.advance || ''} onChange={e => handleInlineUpdate(t, 'budget.advance', e.target.value)} placeholder="0" />
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 border-r border-transparent group-hover:border-slate-100">
                                                <div className={`text-xs font-bold ${balance > 0 ? 'text-red-500' : 'text-slate-400'}`}>${balance.toLocaleString()}</div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <CustomDatePicker value={t.budget?.paymentDueDate || ''} onChange={(val: any) => handleInlineUpdate(t, 'budget.paymentDueDate', val)} compact />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <CalendarBoard 
                    tasks={processedTasks} 
                    onEditTask={(t: Task) => { setEditingTask(t); setIsModalOpen(true); }}
                    onNewTaskWithDate={(date: string) => { 
                        setEditingTask(null); 
                        setInitialDate(date);
                        setIsModalOpen(true); 
                    }}
                />
            )}
        </div>
    );
};

const ProjectDetailView = ({ projectId, onBack, tasks, onUpdateTask, onAddTask, onDeleteTask, projects, onUpdateProject }: any) => {
    const project = projects.find((p: Project) => p.id === projectId);
    const [activeTab, setActiveTab] = useState<'plan' | 'budget' | 'activity'>('plan');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    if (!project) return <div>Project not found</div>;

    return (
        <div className="h-full flex flex-col animate-in slide-in-from-right duration-300 relative">
            <EditProjectModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} project={project} onSave={onUpdateProject} />
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-start gap-4"><button onClick={onBack} className="mt-1 p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronLeft size={20} /></button><div><div className="flex items-center gap-3 mb-1"><h2 className="text-2xl font-bold text-slate-900">{project.title}</h2><span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wide">{project.status}</span></div>
                    {(project.clientName || project.startDate) && (
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                            {project.clientName && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-slate-200 shadow-sm">
                                    <User size={12} className="text-slate-400" />
                                    <span className="font-bold text-slate-700">{project.clientName}</span>
                                    {project.clientEmail && <span className="text-slate-400 border-l border-slate-200 pl-1.5 ml-0.5">{project.clientEmail}</span>}
                                    {project.clientPhone && <span className="text-slate-400 border-l border-slate-200 pl-1.5 ml-0.5">{project.clientPhone}</span>}
                                </div>
                            )}
                            {(project.startDate || project.endDate) && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-slate-200 shadow-sm">
                                    <Calendar size={12} className="text-slate-400" />
                                    <span className="font-medium">{formatDateDisplay(project.startDate)}</span>
                                    {project.endDate && <><ArrowRight size={10} className="text-slate-300" /><span className="font-medium">{formatDateDisplay(project.endDate)}</span></>}
                                </div>
                            )}
                        </div>
                    )}
                </div></div>
                <div className="flex gap-3"><button onClick={() => setIsEditModalOpen(true)} className="px-4 py-2 border rounded-lg text-sm font-bold hover:bg-slate-50"><Pencil size={16} className="mr-2 inline"/>Edit</button></div>
            </div>
            <div className="flex items-center gap-6 border-b border-slate-200 mb-6">{['plan', 'budget', 'activity'].map(tab => <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-3 text-sm font-bold capitalize transition-all border-b-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>{tab === 'plan' ? 'Tasks & Plan' : tab}</button>)}</div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                {activeTab === 'plan' && <TasksView projectId={projectId} tasks={tasks} onUpdateTask={onUpdateTask} onAddTask={onAddTask} onDeleteTask={onDeleteTask} projects={projects} />}
                {activeTab === 'budget' && <BudgetView project={project} tasks={tasks.filter((t: Task) => t.projectId === projectId)} />}
                {activeTab === 'activity' && <ActivityFeed logs={MOCK_ACTIVITY_LOGS.filter(l => l.projectId === projectId)} />}
            </div>
        </div>
    );
};

const LeadModal = ({ isOpen, onClose, lead, onSave }: { isOpen: boolean, onClose: () => void, lead: Lead | null, onSave: (lead: Lead) => void }) => {
  const [formData, setFormData] = useState<Partial<Lead>>({ name: '', company: '', email: '', phone: '', status: 'New', source: 'Website', value: 0, probability: 0, notes: '' });
  useEffect(() => { if (lead) setFormData(lead); else setFormData({ name: '', company: '', email: '', phone: '', status: 'New', source: 'Website', value: 0, probability: 0, notes: '', id: `LEAD-${Date.now()}`, lastContact: new Date().toISOString().split('T')[0] }); }, [lead, isOpen]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl"><h2 className="text-lg font-bold text-slate-900">{lead ? 'Edit Lead' : 'New Lead'}</h2><button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button></div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Lead Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" autoFocus /></div>
          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Company</label><input type="text" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value as any})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">{['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'].map(s => <option key={s} value={s}>{s}</option>)}</select></div><div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Value ($)</label><input type="number" value={formData.value} onChange={(e) => setFormData({...formData, value: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" /></div></div>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl"><button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button><button onClick={() => { onSave(formData as Lead); onClose(); }} disabled={!formData.name} className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 disabled:opacity-50 transition-all">Save Lead</button></div>
      </div>
    </div>
  );
};

const LeadCard: React.FC<{ lead: Lead, onClick: () => void }> = ({ lead, onClick }) => (
    <div onClick={onClick} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col gap-2 relative">
      <div className="flex justify-between items-start"><h4 className="font-bold text-sm text-slate-800">{lead.name}</h4>{lead.probability > 70 && <span className="bg-orange-100 text-orange-600 p-1 rounded-full"><TrendingUp size={12} /></span>}</div>
      <p className="text-xs text-slate-500">{lead.company}</p>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50"><span className="text-xs font-bold text-slate-700">${lead.value.toLocaleString()}</span><span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{lead.source}</span></div>
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${lead.probability}%` }} /></div>
    </div>
);

const LeadKanbanColumn: React.FC<{ status: string, leads: Lead[], onEdit: (lead: Lead) => void }> = ({ status, leads, onEdit }) => (
    <div className="flex-shrink-0 w-72 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col max-h-full">
      <div className="p-4 flex items-center justify-between border-b border-slate-100"><div className="flex items-center gap-2"><h4 className="font-bold text-sm text-slate-700">{status}</h4><span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{leads.length}</span></div><span className="text-[10px] text-slate-400 font-medium">${leads.reduce((sum, l) => sum + l.value, 0).toLocaleString()}</span></div>
      <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">{leads.map(lead => <LeadCard key={lead.id} lead={lead} onClick={() => onEdit(lead)} />)}</div>
    </div>
);

const LeadsView = () => {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const handleSaveLead = (lead: Lead) => { if (editingLead) setLeads(prev => prev.map(l => l.id === lead.id ? lead : l)); else setLeads(prev => [...prev, lead]); };
  const handleDeleteLead = (id: string) => { if (confirm('Delete this lead?')) { setLeads(prev => prev.filter(l => l.id !== id)); setIsModalOpen(false); } };
  const statuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <LeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} lead={editingLead} onSave={handleSaveLead} />
      <SectionHeader title="Lead Management" subtitle="Track and convert potential clients" action={<div className="flex items-center gap-3"><div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center"><button onClick={() => setViewMode('board')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'board' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><KanbanIcon size={14} className="mr-2" /> Board</button><button onClick={() => setViewMode('list')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><ListIcon size={14} className="mr-2" /> List</button></div><button onClick={() => { setEditingLead(null); setIsModalOpen(true); }} className="flex items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"><Plus size={16} className="mr-2" /> Add Lead</button></div>} />
      {viewMode === 'board' ? <div className="flex-1 overflow-x-auto min-h-0 pb-4"><div className="flex space-x-4 h-full min-w-max px-2">{statuses.map(status => <LeadKanbanColumn key={status} status={status} leads={leads.filter(l => l.status === status)} onEdit={(l) => { setEditingLead(l); setIsModalOpen(true); }} />)}</div></div> : <div className="flex-1 overflow-y-auto custom-scrollbar bg-white rounded-2xl border border-slate-100 shadow-sm"><table className="w-full text-left text-sm text-slate-600"><thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 sticky top-0 z-10"><tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Company</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Value</th><th className="px-6 py-4"></th></tr></thead><tbody className="divide-y divide-slate-100">{leads.map(lead => (<tr key={lead.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setEditingLead(lead); setIsModalOpen(true); }}><td className="px-6 py-4 font-medium text-slate-900">{lead.name}</td><td className="px-6 py-4">{lead.company}</td><td className="px-6 py-4"><span className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-600">{lead.status}</span></td><td className="px-6 py-4 font-mono text-slate-700">${lead.value.toLocaleString()}</td><td className="px-6 py-4 text-right"><button onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>}
    </div>
  );
};

const ProjectCard = ({ project, onClick, onClone, onDelete, onUpdate }: any) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  return (
    <>
      <div onClick={onClick} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col h-full relative overflow-visible">
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${project.status === 'Execution' ? 'bg-green-500' : project.status === 'Planning' ? 'bg-blue-500' : project.status === 'High Risk' ? 'bg-red-500' : 'bg-slate-300'}`} />
        <div className="flex justify-between items-start mb-3 pl-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-800 truncate text-base mb-1">{project.title}</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wide">{project.category}</span>
          </div>
          <div className="relative">
             <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className={`p-1.5 rounded-lg transition-colors ${isMenuOpen ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600 opacity-0 group-hover:opacity-100'}`}><MoreHorizontal size={18} /></button>
             <ActionMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} onShare={() => setIsShareModalOpen(true)} onClone={onClone} onArchive={() => onUpdate({...project, status: 'Archived'})} onDelete={onDelete} />
          </div>
        </div>
        <div className="flex-1 pl-3">
          <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-10">{project.description || 'No description provided.'}</p>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2"><span>Progress</span><span className="font-bold text-slate-700">{project.progress}%</span></div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4"><div className={`h-full rounded-full transition-all duration-500 ${project.riskLevel === 'High' ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${project.progress}%` }}></div></div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-50">
             <div className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /><span className="text-xs font-medium text-slate-600">{formatDateDisplay(project.startDate)}</span></div>
             {project.riskLevel && <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${project.riskLevel === 'High' ? 'bg-red-50 text-red-600' : project.riskLevel === 'Medium' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>{project.riskLevel} Risk</div>}
          </div>
        </div>
      </div>
    </>
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
                <div className="grid grid-cols-2 gap-4"><div><CustomDatePicker label="Start Date" value={formData.startDate} onChange={val => setFormData({...formData, startDate: val})} /></div><div><CustomDatePicker label="End Date" value={formData.endDate} onChange={val => setFormData({...formData, endDate: val})} minDate={formData.startDate} /></div></div>
                <div className="pt-2 border-t border-slate-100 mt-2">
                     <div className="text-xs font-bold text-slate-500 uppercase mb-2">Client Details (Optional)</div>
                     <div className="grid grid-cols-1 gap-3">
                         <div><input type="text" value={formData.clientName || ''} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Client Name" /></div>
                         <div className="grid grid-cols-2 gap-3">
                             <input type="email" value={formData.clientEmail || ''} onChange={e => setFormData({...formData, clientEmail: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Email Address" />
                             <input type="text" value={formData.clientPhone || ''} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary" placeholder="Phone Number" />
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

const BudgetView = ({ project, tasks }: { project: Project, tasks: Task[] }) => {
  const stats = useMemo(() => {
    let committed = 0, spent = 0;
    const byCategory: Record<string, { committed: number, spent: number, count: number }> = {};
    tasks.forEach(t => {
      const taskCommitted = t.budget?.agreed || 0;
      const taskSpent = (t.budget?.status === 'Paid in Full' && t.budget?.agreed) ? t.budget.agreed : (t.budget?.advance || 0);
      committed += taskCommitted; spent += taskSpent;
      const cat = t.list || 'General';
      if (!byCategory[cat]) byCategory[cat] = { committed: 0, spent: 0, count: 0 };
      byCategory[cat].committed += taskCommitted; byCategory[cat].spent += taskSpent; byCategory[cat].count += 1;
    });
    return { committed, spent, remaining: project.budget.total - committed, categories: Object.entries(byCategory).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.committed - a.committed) };
  }, [project, tasks]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];
  let currentAngle = 0;
  const pieGradient = `conic-gradient(${stats.categories.map((cat, i) => { const pct = (cat.committed / (stats.committed || 1)) * 100; const start = currentAngle; currentAngle += pct; return `${COLORS[i % COLORS.length]} ${start}% ${currentAngle}%`; }).join(', ')}${stats.categories.length ? '' : ', #e2e8f0 0% 100%'})`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Budget</div><div className="text-xl font-bold text-slate-900">${project.budget.total.toLocaleString()}</div></div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Committed</div><div className="text-xl font-bold text-blue-600">${stats.committed.toLocaleString()}</div></div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Spent</div><div className="text-xl font-bold text-green-600">${stats.spent.toLocaleString()}</div></div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Remaining</div><div className={`text-xl font-bold ${stats.remaining < 0 ? 'text-red-600' : 'text-slate-700'}`}>${stats.remaining.toLocaleString()}</div></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                <h3 className="text-sm font-bold text-slate-700 mb-6 w-full text-left">Budget Distribution</h3>
                <div className="relative w-48 h-48 rounded-full mb-6" style={{ background: pieGradient }}><div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center"><span className="text-xs text-slate-400 font-bold uppercase">Committed</span><span className="text-xl font-bold text-slate-800">${stats.committed.toLocaleString()}</span></div></div>
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-700 mb-6">Category Breakdown</h3>
                 <div className="space-y-6">{stats.categories.map((cat, i) => { const pct = project.budget.total > 0 ? (cat.committed / project.budget.total) * 100 : 0; return (<div key={cat.name}><div className="flex justify-between text-sm mb-1.5"><span className="font-bold text-slate-700">{cat.name}</span><span className="text-slate-500">{cat.count} Tasks • <span className="text-slate-900 font-bold">${cat.committed.toLocaleString()}</span></span></div><div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}></div></div></div>); })}</div>
            </div>
        </div>
    </div>
  );
};

const ActivityFeed = ({ logs }: { logs: ActivityLogItem[] }) => (
    <div className="max-w-3xl mx-auto p-2 space-y-6">
        {logs.map((log) => (
            <div key={log.id} className="relative pl-8 before:absolute before:left-3 before:top-8 before:bottom-[-24px] before:w-px before:bg-slate-200 last:before:hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center z-10 ${log.type === 'ai_action' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>{log.type === 'ai_action' ? <Sparkles size={12}/> : <MessageCircle size={12}/>}</div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-1.5"><div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-wide">{new Date(log.timestamp).toLocaleDateString()}</span></div></div>
                    <div className="flex items-start gap-2">
                        {log.user === 'AI Agent' ? <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5"><Bot size={12} /></div> : <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{log.userInitials}</div>}
                        <div><h4 className="text-sm text-slate-800 leading-snug"><span className="font-bold">{log.user}</span> {log.action}</h4><p className="text-xs text-slate-500 mt-1">{log.details}</p></div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const ProjectsView = ({ projects, tasks, onSelectProject, onCreateProject, onDeleteProject, onUpdateProject, onCloneProject }: any) => {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
        <NewProjectModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} onSubmit={onCreateProject} />
        <SectionHeader title="Projects" subtitle="Manage your ongoing initiatives" action={<button onClick={() => setIsNewModalOpen(true)} className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all"><Plus size={18} /><span>New Project</span></button>} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-4 custom-scrollbar flex-1 min-h-0">
            {projects.map((project: Project) => (
                <ProjectCard key={project.id} project={project} onClick={() => onSelectProject(project.id)} onClone={() => onCloneProject(project)} onDelete={() => onDeleteProject(project.id)} onUpdate={(p: Project) => onUpdateProject(p)} />
            ))}
            <button onClick={() => setIsNewModalOpen(true)} className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary hover:bg-slate-50 transition-all group h-full min-h-[250px]">
                <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white border border-slate-200 group-hover:border-primary/30 flex items-center justify-center mb-3 transition-all"><Plus size={24} /></div>
                <span className="font-bold text-sm">Create New Project</span>
            </button>
        </div>
    </div>
  );
};

const App = () => {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);

  const projectsWithRisk = useMemo(() => {
    return projects.map(p => {
        const metrics = calculateRiskMetrics(p, tasks);
        return { ...p, riskLevel: metrics.level };
    });
  }, [projects, tasks]);

  const handleUpdateTask = (updatedTask: Task) => setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  const handleAddTask = (newTask: Task) => setTasks(prev => [newTask, ...prev]);
  const handleDeleteTask = (taskId: string) => setTasks(prev => prev.filter(t => t.id !== taskId));
  const handleUpdateProject = (updatedProject: Project) => setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  const handleDeleteProject = (projectId: string) => { if (confirm('Are you sure you want to delete this project?')) setProjects(prev => prev.filter(p => p.id !== projectId)); };
  const handleCloneProject = (project: Project) => { const newId = `PROJ-${Date.now()}`; setProjects(prev => [...prev, { ...project, id: newId, title: `${project.title} (Copy)`, status: 'Draft', progress: 0 }]); };
  const handleCreateProject = (data: NewProjectPayload) => {
      const newId = `PROJ-${Date.now()}`;
      setProjects(prev => [...prev, { id: newId, title: data.title, category: data.category, status: 'Planning', startDate: data.startDate, endDate: data.endDate, budget: { total: data.budget, committed: 0, spent: 0 }, riskLevel: 'Low', description: data.description, progress: 0, clientName: data.clientName, clientEmail: data.clientEmail, clientPhone: data.clientPhone }]);
      setSelectedProjectId(newId);
      setActiveView('projects');
  };

  const navigateToProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveView('projects');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-50"><div className={`flex items-center gap-2 ${!isSidebarOpen && 'justify-center w-full'}`}><div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0"><Zap size={18} fill="currentColor" /></div>{isSidebarOpen && <span className="font-bold text-lg tracking-tight">Seyal AI</span>}</div>{isSidebarOpen && (<button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"><ChevronLeft size={18} /></button>)}</div>
        {!isSidebarOpen && (<button onClick={() => setIsSidebarOpen(true)} className="mx-auto mt-4 p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"><ChevronRight size={18} /></button>)}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
            <SidebarItem icon={LayoutDashboard} label={isSidebarOpen ? "Dashboard" : ""} active={activeView === 'dashboard'} onClick={() => { setActiveView('dashboard'); setSelectedProjectId(null); }} />
            <SidebarItem icon={Briefcase} label={isSidebarOpen ? "Projects" : ""} active={activeView === 'projects'} onClick={() => { setActiveView('projects'); setSelectedProjectId(null); }} />
            <SidebarItem icon={CheckSquare} label={isSidebarOpen ? "My Tasks" : ""} active={activeView === 'tasks'} onClick={() => { setActiveView('tasks'); setSelectedProjectId(null); }} />
            <SidebarItem icon={Briefcase} label={isSidebarOpen ? "Leads" : ""} active={activeView === 'leads'} onClick={() => { setActiveView('leads'); setSelectedProjectId(null); }} />
            <SidebarItem icon={Users} label={isSidebarOpen ? "Contacts" : ""} active={activeView === 'contacts'} onClick={() => setActiveView('contacts')} />
            <SidebarItem icon={Bot} label={isSidebarOpen ? "Automation" : ""} active={activeView === 'automation'} onClick={() => setActiveView('automation')} />
        </nav>
        <div className="p-3 border-t border-slate-50 space-y-1"><SidebarItem icon={Settings} label={isSidebarOpen ? "Settings" : ""} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />{isSidebarOpen && (<div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"><div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">JD</div><div className="flex-1 min-w-0"><div className="text-xs font-bold text-slate-900 truncate">John Doe</div><div className="text-[10px] text-slate-500 truncate">john@example.com</div></div></div>)}</div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50 p-6">
        {activeView === 'dashboard' && <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl m-4 animate-in fade-in zoom-in-95 duration-500"><LayoutDashboard size={48} className="mb-4 text-slate-200" /><h2 className="text-xl font-bold text-slate-600">Dashboard</h2><p className="text-sm">Widgets coming soon.</p></div>}
        {activeView === 'projects' && (selectedProjectId ? <ProjectDetailView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} tasks={tasks} onUpdateTask={handleUpdateTask} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} projects={projectsWithRisk} onUpdateProject={handleUpdateProject} /> : <ProjectsView projects={projectsWithRisk} tasks={tasks} onSelectProject={navigateToProject} onCreateProject={handleCreateProject} onDeleteProject={handleDeleteProject} onUpdateProject={handleUpdateProject} onCloneProject={handleCloneProject} />)}
        {activeView === 'tasks' && <TasksView tasks={tasks} onUpdateTask={handleUpdateTask} onAddTask={handleAddTask} onDeleteTask={handleDeleteTask} projects={projectsWithRisk} />}
        {activeView === 'leads' && <LeadsView />}
        {(activeView === 'contacts' || activeView === 'automation' || activeView === 'settings') && <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl m-4 animate-in fade-in zoom-in-95 duration-500"><Bot size={48} className="mb-4 text-slate-200" /><h2 className="text-xl font-bold text-slate-600">Coming Soon</h2><p className="text-sm">The {activeView} module is under construction.</p></div>}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { const root = createRoot(container); root.render(<App />); }
