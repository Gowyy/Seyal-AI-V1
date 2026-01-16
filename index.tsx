import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  X, Share2, MoreHorizontal, Check, CalendarClock, ChevronDown, Minus, 
  ChevronUp, AlertCircle, Repeat, Bot, MessageCircle, Clock, Phone, 
  History as HistoryIcon, Folder, ChevronRight, ChevronLeft, Plus, Hash, Sparkles, Save,
  LayoutDashboard, CheckSquare, Briefcase, Users, Settings, Zap,
  Kanban as KanbanIcon, Table as TableIcon, Calendar as CalendarIcon, Filter,
  ArrowUpDown, ArrowUp, ArrowDown, Search, CheckCircle2, CopyPlus, Archive, Trash2, Maximize2,
  Bell, Mail, PieChart, TrendingUp, AlertTriangle, Wallet, ArrowRight, Pencil, Calendar, Link
} from 'lucide-react';

// --- Types ---

type ViewState = 'dashboard' | 'projects' | 'leads' | 'contacts' | 'automation' | 'settings' | 'tasks';

type ProjectStatus = 'Draft' | 'Planning' | 'Ready' | 'Execution' | 'On Hold' | 'Completed' | 'Cancelled';

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

interface Task {
  id: string;
  projectId?: string; // Link to Project
  title: string;
  status: string;
  priority: string;
  assignee: string; // 'Me' | 'AI Agent' | 'Team' | Contact Name
  assignmentType?: 'Self' | 'Contact' | 'Team' | 'Unknown';
  dueDate: string;
  dueTime?: string;
  description: string;
  tags: string[];
  subtasks: Subtask[];
  dependencies: string[]; // List of Task IDs that this task depends on
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
  progress: number; // 0-100 calculated from tasks
}

interface NewProjectPayload {
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  budget: number;
  description: string;
}

// --- Mock Data ---

const AVAILABLE_LISTS = ['General', 'Marketing', 'Sales', 'Engineering', 'Design', 'HR', 'Finance'];

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
    progress: 45
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
    progress: 15
  },
  {
    id: 'PROJ-003',
    title: 'Mobile App Launch',
    category: 'Engineering',
    status: 'Ready',
    startDate: '2023-11-20',
    endDate: '2024-02-10',
    budget: { total: 75000, committed: 0, spent: 0 },
    riskLevel: 'High',
    description: 'Launch of the new customer facing mobile application.',
    progress: 0
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
  },
  {
    id: 'TASK-103',
    projectId: 'PROJ-002',
    title: 'Quarterly Review',
    status: 'Done',
    priority: 'Medium',
    assignee: 'Team',
    assignmentType: 'Team',
    dueDate: '2023-10-30',
    dueTime: '16:30',
    description: 'Conduct quarterly performance review.',
    tags: ['#internal'],
    subtasks: [
        { id: '1', text: 'Collect metrics', completed: true },
        { id: '2', text: 'Prepare slides', completed: true },
    ],
    dependencies: [],
    recurrence: { enabled: false, frequency: 'Monthly', interval: 1 },
    aiCoordination: false,
    aiChannels: { whatsapp: false, email: false, voice: false },
    aiHistory: [],
    budget: { planned: 0, agreed: 0, advance: 0, status: 'Paid in Full', paymentDueDate: '' },
    list: 'Management'
  }
];

// --- Helper Functions ---

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

// --- Custom Picker Components ---

const CustomDatePicker = ({ 
  value, 
  onChange, 
  label, 
  className,
  compact = false 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  label?: string, 
  className?: string,
  compact?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Parse value or default to today for view
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
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDayClick = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const newDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
           <div className="absolute top-full left-0 z-50 bg-white shadow-xl border border-slate-100 p-4 w-64 rounded-2xl mt-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                  <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronLeft size={16}/></button>
                  <span className="text-sm font-bold text-slate-800">{monthName} {viewDate.getFullYear()}</span>
                  <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronRight size={16}/></button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                  {emptyDays.map(d => <div key={`empty-${d}`} />)}
                  {daysArray.map(day => {
                      const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === viewDate.getMonth() && new Date(value).getFullYear() === viewDate.getFullYear();
                      const isToday = new Date().getDate() === day && new Date().getMonth() === viewDate.getMonth() && new Date().getFullYear() === viewDate.getFullYear();
                      return (
                          <button 
                            key={day} 
                            onClick={() => handleDayClick(day)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                                ${isSelected ? 'bg-primary text-white shadow-md' : isToday ? 'bg-slate-100 text-primary font-bold' : 'text-slate-600 hover:bg-slate-50'}
                            `}
                          >
                              {day}
                          </button>
                      );
                  })}
              </div>
           </div>
        )}
     </div>
  );
};

const CustomTimePicker = ({ 
    value, 
    onChange, 
    label,
    className,
    compact = false
}: { 
    value: string, 
    onChange: (val: string) => void, 
    label?: string,
    className?: string,
    compact?: boolean
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

    return (
        <div className={`relative ${className || ''}`} ref={containerRef}>
            {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{label}</label>}
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`flex items-center w-full text-left transition-colors focus:outline-none focus:ring-1 focus:ring-primary/50 ${compact ? 'bg-transparent text-[10px] text-slate-400 hover:text-primary py-1' : 'px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium bg-white hover:border-primary text-slate-700'}`}
            >
               {!compact && <Clock size={16} className="mr-2 text-slate-400" />}
               <span className={`${!value && 'text-slate-400'}`}>{value || (compact ? '--:--' : 'Select Time')}</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 z-50 bg-white shadow-xl border border-slate-100 p-2 w-48 rounded-2xl mt-2 flex gap-2 h-48 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="text-[10px] font-bold text-slate-400 text-center mb-1 sticky top-0 bg-white">HR</div>
                        {hours.map(h => (
                            <button key={h} onClick={() => onChange(`${h}:${value ? value.split(':')[1] || '00' : '00'}`)} className={`w-full py-1.5 text-xs rounded hover:bg-slate-50 mb-0.5 ${value?.startsWith(h) ? 'bg-blue-50 text-primary font-bold' : 'text-slate-600'}`}>{h}</button>
                        ))}
                    </div>
                    <div className="w-px bg-slate-100" />
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="text-[10px] font-bold text-slate-400 text-center mb-1 sticky top-0 bg-white">MIN</div>
                        {minutes.map(m => (
                            <button key={m} onClick={() => onChange(`${value ? value.split(':')[0] || '09' : '09'}:${m}`)} className={`w-full py-1.5 text-xs rounded hover:bg-slate-50 mb-0.5 ${value?.endsWith(m) ? 'bg-blue-50 text-primary font-bold' : 'text-slate-600'}`}>{m}</button>
                        ))}
                    </div>
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

const Toggle = ({ enabled, onToggle, size }: { enabled: boolean; onToggle: () => void; size?: string }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className={`relative inline-flex items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-primary' : 'bg-slate-300'} ${size === 'sm' ? 'h-5 w-9' : 'h-6 w-11'}`}
  >
    <span className={`${enabled ? 'translate-x-5' : 'translate-x-1'} inline-block transform rounded-full bg-white transition-transform ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
  </button>
);

const MultiSelect = ({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (val: string[]) => void }) => {
  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(option => (
        <button
          key={option}
          onClick={() => toggleOption(option)}
          className={`px-2 py-1 text-xs rounded border transition-colors ${
            selected.includes(option)
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
};

const ActionMenu = ({ 
  onShare, 
  onClone, 
  onArchive, 
  onDelete,
  isOpen,
  onClose
}: { 
  onShare: () => void, 
  onClone: () => void, 
  onArchive: () => void, 
  onDelete: () => void,
  isOpen: boolean,
  onClose: () => void
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={menuRef} className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
      <div className="py-1">
        <button onClick={() => { onShare(); onClose(); }} className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
          <Share2 size={16} className="mr-2 text-slate-400" /> Share
        </button>
        <button onClick={() => { onClone(); onClose(); }} className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
          <CopyPlus size={16} className="mr-2 text-slate-400" /> Clone
        </button>
        <button onClick={() => { onArchive(); onClose(); }} className="flex items-center w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
          <Archive size={16} className="mr-2 text-slate-400" /> Archive
        </button>
        <div className="h-px bg-slate-100 my-1" />
        <button onClick={() => { onDelete(); onClose(); }} className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 size={16} className="mr-2" /> Delete
        </button>
      </div>
    </div>
  );
};

const NewProjectModal = ({ isOpen, onClose, onSubmit }: { isOpen: boolean, onClose: () => void, onSubmit: (data: NewProjectPayload) => void }) => {
  const [formData, setFormData] = useState<NewProjectPayload>({
    title: '',
    category: 'General',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    budget: 0,
    description: ''
  });
  const [isAiLoading, setIsAiLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    setIsAiLoading(true);
    // Simulate AI thinking time
    setTimeout(() => {
        onSubmit(formData);
        setIsAiLoading(false);
        onClose();
        // Reset form
        setFormData({
            title: '',
            category: 'General',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            budget: 0,
            description: ''
        });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">New Project</h2>
                    <p className="text-xs text-slate-500">Define goals for the AI Planning Coach</p>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
               {isAiLoading ? (
                   <div className="flex flex-col items-center justify-center py-10 space-y-4">
                       <div className="w-16 h-16 relative">
                           <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                           <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                           <Bot className="absolute inset-0 m-auto text-primary" size={24}/>
                       </div>
                       <div className="text-center">
                           <h3 className="text-sm font-bold text-slate-800">AI Planning Coach is working...</h3>
                           <p className="text-xs text-slate-500 mt-1">Generating tasks, budget breakdown, and timeline.</p>
                       </div>
                   </div>
               ) : (
                   <>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Project Title</label>
                            <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" placeholder="e.g. Summer Marketing Campaign" autoFocus />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label>
                                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">
                                    {AVAILABLE_LISTS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Budget</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                                    <input type="number" value={formData.budget || ''} onChange={e => setFormData({...formData, budget: parseFloat(e.target.value)})} className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" placeholder="0.00" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <CustomDatePicker label="Start Date" value={formData.startDate} onChange={val => setFormData({...formData, startDate: val})} />
                            </div>
                             <div>
                                <CustomDatePicker label="End Date" value={formData.endDate} onChange={val => setFormData({...formData, endDate: val})} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-24" placeholder="Describe the goals and scope..." />
                        </div>
                   </>
               )}
            </div>

            {/* Footer */}
            {!isAiLoading && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={!formData.title} className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        <Sparkles size={16} />
                        <span>Start Planning Coach</span>
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

const EditProjectModal = ({ 
  isOpen, 
  onClose, 
  project, 
  onSave 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  project: Project, 
  onSave: (updatedProject: Project) => void 
}) => {
  const [formData, setFormData] = useState<Project>(project);

  useEffect(() => {
    setFormData(project);
  }, [project, isOpen]);

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  const updateBudget = (value: number) => {
      setFormData(prev => ({
          ...prev,
          budget: { ...prev.budget, total: value }
      }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">Edit Project Settings</h2>
                <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Project Title</label>
                    <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Category</label>
                        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">
                            {AVAILABLE_LISTS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Total Budget</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
                            <input type="number" value={formData.budget.total} onChange={e => updateBudget(parseFloat(e.target.value) || 0)} className="w-full pl-6 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary font-medium" placeholder="0.00" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ProjectStatus})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">
                            {['Draft', 'Planning', 'Ready', 'Execution', 'On Hold', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Risk Level</label>
                        <select value={formData.riskLevel} onChange={e => setFormData({...formData, riskLevel: e.target.value as any})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary bg-white">
                            {['Low', 'Medium', 'High'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <CustomDatePicker label="Start Date" value={formData.startDate} onChange={val => setFormData({...formData, startDate: val})} />
                    </div>
                     <div>
                        <CustomDatePicker label="End Date" value={formData.endDate} onChange={val => setFormData({...formData, endDate: val})} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-primary resize-none h-24" />
                </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:text-slate-800 transition-colors">Cancel</button>
                <button onClick={handleSubmit} className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">Save Changes</button>
            </div>
        </div>
    </div>
  );
};

const BudgetView = ({ project, tasks }: { project: Project, tasks: Task[] }) => {
  const stats = useMemo(() => {
    let committed = 0;
    let spent = 0;
    let planned = 0;
    const byCategory: Record<string, { committed: number, spent: number, count: number }> = {};

    tasks.forEach(t => {
      const taskCommitted = t.budget?.agreed || 0;
      const taskSpent = (t.budget?.status === 'Paid in Full' && t.budget?.agreed) 
          ? t.budget.agreed 
          : (t.budget?.advance || 0);
      const taskPlanned = t.budget?.planned || 0;

      committed += taskCommitted;
      spent += taskSpent;
      planned += taskPlanned;

      const cat = t.list || 'General';
      if (!byCategory[cat]) byCategory[cat] = { committed: 0, spent: 0, count: 0 };
      byCategory[cat].committed += taskCommitted;
      byCategory[cat].spent += taskSpent;
      byCategory[cat].count += 1;
    });

    // Sort categories by committed amount desc
    const categories = Object.entries(byCategory)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.committed - a.committed);

    return {
      committed,
      spent,
      planned,
      remaining: project.budget.total - committed,
      categories
    };
  }, [project, tasks]);

  // Pie Chart Data
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#64748b'];
  const totalForPie = stats.committed || 1; // avoid divide by zero
  let currentAngle = 0;
  const gradientParts = stats.categories.map((cat, i) => {
      const pct = (cat.committed / totalForPie) * 100;
      const start = currentAngle;
      const end = currentAngle + pct;
      currentAngle = end;
      return `${COLORS[i % COLORS.length]} ${start}% ${end}%`;
  });
  const pieGradient = `conic-gradient(${gradientParts.join(', ')}${gradientParts.length ? '' : ', #e2e8f0 0% 100%'})`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
        {/* Top Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Budget</div>
                <div className="text-xl font-bold text-slate-900">${project.budget.total.toLocaleString()}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Committed</div>
                 <div className="text-xl font-bold text-blue-600">${stats.committed.toLocaleString()}</div>
                 <div className="text-xs text-slate-400 mt-1">{project.budget.total > 0 ? ((stats.committed/project.budget.total)*100).toFixed(1) : 0}% of total</div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Spent</div>
                 <div className="text-xl font-bold text-green-600">${stats.spent.toLocaleString()}</div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Remaining</div>
                 <div className={`text-xl font-bold ${stats.remaining < 0 ? 'text-red-600' : 'text-slate-700'}`}>${stats.remaining.toLocaleString()}</div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center">
                <h3 className="text-sm font-bold text-slate-700 mb-6 w-full text-left">Budget Distribution (Committed)</h3>
                <div className="relative w-48 h-48 rounded-full mb-6" style={{ background: pieGradient }}>
                    <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center">
                        <span className="text-xs text-slate-400 font-bold uppercase">Committed</span>
                        <span className="text-xl font-bold text-slate-800">${stats.committed.toLocaleString()}</span>
                    </div>
                </div>
                <div className="w-full space-y-2">
                    {stats.categories.slice(0, 5).map((cat, i) => (
                        <div key={cat.name} className="flex items-center text-xs">
                            <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span className="text-slate-600 flex-1 truncate">{cat.name}</span>
                            <span className="font-bold text-slate-700">${cat.committed.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Breakdown Section */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-700 mb-6">Category Breakdown</h3>
                 <div className="space-y-6">
                    {stats.categories.map((cat, i) => {
                        const pct = project.budget.total > 0 ? (cat.committed / project.budget.total) * 100 : 0;
                        return (
                            <div key={cat.name}>
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="font-bold text-slate-700">{cat.name}</span>
                                    <span className="text-slate-500">{cat.count} Tasks • <span className="text-slate-900 font-bold">${cat.committed.toLocaleString()}</span></span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                    <span>Spent: ${cat.spent.toLocaleString()}</span>
                                    <span>{pct.toFixed(1)}% of Budget</span>
                                </div>
                            </div>
                        );
                    })}
                    {stats.categories.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                            <p>No budget data available yet.</p>
                            <p className="text-xs">Add budget details to your tasks.</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    </div>
  );
};

const TaskDetailPanel = ({ 
  isOpen, 
  onClose, 
  onSave, 
  task,
  onAction,
  initialDate,
  projectId,
  availableTasks = []
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (task: Task) => void, 
  task?: Task | null,
  onAction?: (action: 'share'|'clone'|'archive'|'delete', task: Task) => void,
  initialDate?: string,
  projectId?: string,
  availableTasks?: Task[]
}) => {
  const [formData, setFormData] = useState<Task>(task || {
    id: Date.now().toString(),
    projectId: projectId,
    title: '',
    status: 'Todo',
    priority: 'Medium',
    assignee: 'Me',
    assignmentType: 'Self',
    dueDate: initialDate || new Date().toISOString().split('T')[0],
    dueTime: '',
    description: '',
    tags: [],
    subtasks: [],
    dependencies: [],
    recurrence: { enabled: false, frequency: 'Weekly', interval: 1 },
    aiCoordination: false,
    aiChannels: { whatsapp: true, email: false, voice: false },
    aiHistory: [],
    budget: { planned: 0, agreed: 0, advance: 0, status: 'None', paymentDueDate: '' },
    list: 'General'
  });

  const [isListOpen, setIsListOpen] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isTagInputVisible, setIsTagInputVisible] = useState(false);
  const [tagInputValue, setTagInputValue] = useState('');
  const [isDependencyPickerOpen, setIsDependencyPickerOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const depRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      setFormData(task);
    } else {
       // Reset for new task
       setFormData({
        id: Date.now().toString(),
        projectId: projectId,
        title: '',
        status: 'Todo',
        priority: 'Medium',
        assignee: 'Me',
        assignmentType: 'Self',
        dueDate: initialDate || new Date().toISOString().split('T')[0],
        dueTime: '',
        description: '',
        tags: [],
        subtasks: [],
        dependencies: [],
        recurrence: { enabled: false, frequency: 'Weekly', interval: 1 },
        aiCoordination: false,
        aiChannels: { whatsapp: true, email: false, voice: false },
        aiHistory: [],
        budget: { planned: 0, agreed: 0, advance: 0, status: 'None', paymentDueDate: '' },
        list: 'General'
      });
    }
  }, [task, isOpen, initialDate, projectId]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (listRef.current && !listRef.current.contains(event.target as Node)) {
              setIsListOpen(false);
          }
           if (depRef.current && !depRef.current.contains(event.target as Node)) {
              setIsDependencyPickerOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset creation mode when list dropdown closes
  useEffect(() => {
      if (!isListOpen) {
          setIsCreatingList(false);
          setNewListName('');
      }
  }, [isListOpen]);

  const displayLists = useMemo(() => {
      const lists = new Set(AVAILABLE_LISTS);
      if (formData.list) lists.add(formData.list);
      return Array.from(lists);
  }, [formData.list]);

  // Valid candidates for dependencies (exclude self and already linked)
  const dependencyCandidates = useMemo(() => {
      return availableTasks.filter(t => t.id !== formData.id && !formData.dependencies?.includes(t.id));
  }, [availableTasks, formData.id, formData.dependencies]);

  if (!isOpen) return null;

  const updateField = (field: keyof Task, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateRecurrence = (field: string, value: any) => {
      setFormData(prev => ({
          ...prev,
          recurrence: {
              enabled: false,
              frequency: 'Weekly',
              interval: 1,
              ...(prev.recurrence || {}),
              [field]: value
          }
      }));
  };

  const updateBudget = (field: string, value: any) => {
    setFormData(prev => {
        const newBudget = { ...prev.budget, [field]: value };
        
        // 1. Handle Manual Status Changes
        if (field === 'status') {
             if (value === 'Paid in Full') {
                 newBudget.paymentDueDate = '';
                 if (newBudget.agreed) newBudget.advance = newBudget.agreed;
             }
        } 
        // 2. Handle Auto-Status Calculation (only when changing amounts or date)
        else if (['agreed', 'advance', 'paymentDueDate'].includes(field)) {
             const agreed = parseFloat(newBudget.agreed?.toString() || '0');
             const advance = parseFloat(newBudget.advance?.toString() || '0');
             const pDate = newBudget.paymentDueDate;
             
             if (agreed > 0) {
                 const remaining = agreed - advance;
                 const now = new Date();
                 const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                 
                 // If balance is effectively zero (or negative), mark as Paid in Full
                 if (remaining <= 0.001) { 
                     newBudget.status = 'Paid in Full';
                 } else {
                     // There is a balance
                     if (pDate && pDate < today) {
                         newBudget.status = 'Overdue';
                     } else if (advance > 0) {
                         newBudget.status = 'Advance Paid';
                     } else {
                         newBudget.status = 'Balance Due';
                     }
                 }
             } else {
                 newBudget.status = 'None';
             }
        }
        
        return { ...prev, budget: newBudget };
    });
  };

  // --- Auto-tagging Logic ---
  const autoCategorizeList = () => {
    if (!formData.title || (formData.list && formData.list !== 'General')) return;
    const titleLower = formData.title.toLowerCase();
    if (titleLower.includes('market') || titleLower.includes('camp') || titleLower.includes('ad') || titleLower.includes('social') || titleLower.includes('post')) {
        updateField('list', 'Marketing');
    } else if (titleLower.includes('sale') || titleLower.includes('client') || titleLower.includes('deal') || titleLower.includes('lead')) {
        updateField('list', 'Sales');
    } else if (titleLower.includes('code') || titleLower.includes('bug') || titleLower.includes('dev') || titleLower.includes('api') || titleLower.includes('feature')) {
        updateField('list', 'Engineering');
    } else if (titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux') || titleLower.includes('mockup')) {
        updateField('list', 'Design');
    } else if (titleLower.includes('hire') || titleLower.includes('interview') || titleLower.includes('onboard')) {
        updateField('list', 'HR');
    } else if (titleLower.includes('budget') || titleLower.includes('invoice') || titleLower.includes('cost') || titleLower.includes('pay')) {
        updateField('list', 'Finance');
    }
  };

  const autoGenerateTags = () => {
    if (!formData.description) return;
    const descLower = formData.description.toLowerCase();
    const newTags = new Set(formData.tags || []);
    const explicitTags = formData.description.match(/#[a-z0-9_]+/gi);
    if (explicitTags) explicitTags.forEach(tag => newTags.add(tag));
    const keywords: Record<string, string> = {
        'urgent': '#urgent', 'deadline': '#deadline', 'review': '#review', 'budget': '#budget', 'meeting': '#meeting',
        'report': '#report', 'launch': '#launch', 'q1': '#q1', 'q2': '#q2', 'q3': '#q3', 'q4': '#q4', 'important': '#important'
    };
    Object.keys(keywords).forEach(keyword => {
        if (descLower.includes(keyword)) newTags.add(keywords[keyword]);
    });
    const updatedTagsList = Array.from(newTags);
    if (JSON.stringify(updatedTagsList) !== JSON.stringify(formData.tags)) updateField('tags', updatedTagsList);
  };

  const addTag = () => {
    if (tagInputValue.trim()) {
        const newTag = tagInputValue.trim().startsWith('#') ? tagInputValue.trim() : `#${tagInputValue.trim()}`;
        if (!formData.tags?.includes(newTag)) updateField('tags', [...(formData.tags || []), newTag]);
        setTagInputValue('');
        setIsTagInputVisible(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = formData.tags?.filter(tag => tag !== tagToRemove);
    updateField('tags', newTags);
  };

  const createNewList = () => {
      if (newListName.trim()) {
          updateField('list', newListName.trim());
          setIsCreatingList(false);
          setNewListName('');
          setIsListOpen(false);
      }
  };

  const addDependency = (depId: string) => {
      updateField('dependencies', [...(formData.dependencies || []), depId]);
      setIsDependencyPickerOpen(false);
  };

  const removeDependency = (depId: string) => {
      updateField('dependencies', formData.dependencies?.filter(id => id !== depId) || []);
  };

  const updateAiChannel = (channel: 'whatsapp' | 'email' | 'voice', value: boolean) => {
      setFormData(prev => ({
          ...prev,
          aiChannels: { whatsapp: false, email: false, voice: false, ...(prev.aiChannels || {}), [channel]: value }
      }));
  };

  const updateAiChannelSettings = (channel: 'whatsapp' | 'voice', settings: Partial<AiChannelSettings>) => {
      setFormData(prev => {
          const currentSettings = prev.aiChannels?.[`${channel}Settings`] || { triggers: [] };
          return {
              ...prev,
              aiChannels: {
                  ...(prev.aiChannels || { whatsapp: false, email: false, voice: false }),
                  [`${channel}Settings`]: { ...currentSettings, ...settings }
              }
          };
      });
  };

  const handleSubtaskChange = (id: string, text: string) => {
      const newSubtasks = formData.subtasks?.map(st => st.id === id ? { ...st, text } : st);
      updateField('subtasks', newSubtasks);
  };

  const toggleSubtask = (id: string) => {
      const newSubtasks = formData.subtasks?.map(st => st.id === id ? { ...st, completed: !st.completed } : st);
      updateField('subtasks', newSubtasks);
  };

  const addSubtask = () => {
      const newSubtasks = [...(formData.subtasks || []), { id: Date.now().toString(), text: '', completed: false }];
      updateField('subtasks', newSubtasks);
  };

  const removeSubtask = (id: string) => {
      const newSubtasks = formData.subtasks?.filter(st => st.id !== id);
      updateField('subtasks', newSubtasks);
  };

  const WHATSAPP_TRIGGERS = ['Status Change', 'Daily briefing', 'AI Auto Mode', 'One day before', 'Custom Schedule'];
  const VOICE_TRIGGERS = ['1 hour before', 'Daily briefing', 'AI Auto Mode', 'One day before', 'Custom Schedule'];

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300 relative">
        <header className="flex items-center justify-between p-4 bg-white sticky top-0 z-20 border-b border-slate-100">
            <button onClick={onClose} className="text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20} /></button>
            <div className="flex items-center gap-2">
                <button onClick={() => onAction?.('share', formData)} className="text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors"><Share2 size={20} /></button>
                <button className="text-slate-500 hover:bg-slate-100 p-2 rounded-full transition-colors"><MoreHorizontal size={20} /></button>
                <button onClick={() => onSave(formData)} className="ml-2 bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 transition-colors hidden sm:block">Save</button>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-32 no-scrollbar">
            <div className="px-4 pt-4 pb-4">
                <div className="flex items-start gap-3">
                    <div className="pt-1.5">
                        <label className="relative flex items-center justify-center cursor-pointer group">
                            <input type="checkbox" checked={formData.status === 'Done'} onChange={() => updateField('status', formData.status === 'Done' ? 'Todo' : 'Done')} className="peer h-6 w-6 appearance-none rounded-full border-2 border-slate-300 checked:border-primary checked:bg-primary transition-all" />
                            <Check size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                        </label>
                    </div>
                    <div className="flex-1">
                        <textarea value={formData.title} onChange={(e) => updateField('title', e.target.value)} onBlur={autoCategorizeList} className="w-full bg-transparent text-2xl font-bold leading-tight text-slate-900 border-none p-0 focus:ring-0 resize-none placeholder-slate-300" placeholder="Task Name" rows={2} />
                    </div>
                </div>
            </div>

            <div className="px-4 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-5">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Assignee</label>
                            <div className="w-full flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">{formData.assignee === 'Me' ? 'ME' : formData.assignee.charAt(0)}</div>
                                <select value={formData.assignee} onChange={(e) => updateField('assignee', e.target.value)} className="bg-transparent text-sm font-medium text-slate-900 outline-none w-full">
                                    <option value="Me">Assign to me</option>
                                    <option value="AI Agent">AI Agent</option>
                                    <option value="Team">Team</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Due Date</label>
                            <div className="w-full flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                                <CustomDatePicker value={formData.dueDate} onChange={(val) => updateField('dueDate', val)} className="flex-1" compact />
                                <CustomTimePicker value={formData.dueTime || ''} onChange={(val) => updateField('dueTime', val)} className="w-24 border-l border-slate-100 pl-2" compact />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Priority Level</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                                <button key={p} onClick={() => updateField('priority', p)} className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border transition-all ${formData.priority === p ? p === 'Urgent' ? 'bg-red-50 border-red-200 text-red-700' : p === 'High' ? 'bg-orange-50 border-orange-200 text-orange-700' : p === 'Medium' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>
                                    {p === 'Low' && <ChevronDown size={20} className="mb-1" />}
                                    {p === 'Medium' && <Minus size={20} className="mb-1" />}
                                    {p === 'High' && <ChevronUp size={20} className="mb-1" />}
                                    {p === 'Urgent' && <AlertCircle size={20} className="mb-1" />}
                                    <span className="text-[10px] font-bold">{p}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Assignment Type Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Assignment Type</label>
                        <div className="flex gap-2 p-1 bg-slate-50 rounded-lg border border-slate-100">
                             {['Self', 'Contact', 'Team'].map((type) => (
                                 <button 
                                    key={type} 
                                    onClick={() => updateField('assignmentType', type)}
                                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${formData.assignmentType === type ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                                 >
                                    {type}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                 <div className="p-2 rounded-lg bg-slate-100 text-slate-600"><Repeat size={18} /></div>
                                 <div><h3 className="text-sm font-bold text-slate-900 leading-none">Recurring Task</h3><p className="text-[10px] text-slate-500 mt-0.5">Repeat this task automatically</p></div>
                            </div>
                            <Toggle enabled={formData.recurrence?.enabled || false} onToggle={() => updateRecurrence('enabled', !formData.recurrence?.enabled)} size="sm" />
                        </div>
                        {formData.recurrence?.enabled && (
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Frequency</label>
                                    <select value={formData.recurrence.frequency} onChange={(e) => updateRecurrence('frequency', e.target.value)} className="w-full bg-white border border-slate-200 text-xs rounded-lg p-2 outline-none focus:border-primary">
                                        <option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Monthly">Monthly</option>
                                    </select>
                                </div>
                                 <div>
                                    <CustomDatePicker label="End Date" value={formData.recurrence.endDate || ''} onChange={(val) => updateRecurrence('endDate', val)} compact />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md"><Bot size={18} /></div>
                                <div><h3 className="text-sm font-bold text-slate-900 leading-none">AI Coordination</h3><p className="text-[10px] text-slate-500 mt-0.5">Let Seyal manage updates</p></div>
                            </div>
                            <Toggle enabled={formData.aiCoordination} onToggle={() => updateField('aiCoordination', !formData.aiCoordination)} size="sm" />
                        </div>
                        {formData.aiCoordination && (
                            <div className="bg-slate-50 rounded-lg p-3 space-y-4 animate-in fade-in slide-in-from-top-2 border border-slate-100 mt-2">
                                {formData.assignmentType === 'Team' && (
                                    <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs font-medium border border-blue-100 flex items-center gap-2">
                                        <Bot size={14} /> AI will only coordinate with the Team Owner.
                                    </div>
                                )}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg transition-colors ${formData.aiChannels?.whatsapp ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}><MessageCircle size={18} /></div>
                                            <div><div className="text-sm font-semibold text-slate-800">WhatsApp Updates</div><div className="text-[10px] text-slate-500">Real-time status notifications</div></div>
                                        </div>
                                        <Toggle enabled={formData.aiChannels?.whatsapp ?? false} onToggle={() => updateAiChannel('whatsapp', !formData.aiChannels?.whatsapp)} size="sm" />
                                    </div>
                                    {formData.aiChannels?.whatsapp && (
                                        <div className="ml-11 animate-in fade-in slide-in-from-top-1 space-y-2">
                                            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm">
                                                <span className="text-xs font-medium text-slate-600 pl-2">Trigger on:</span>
                                                <MultiSelect options={WHATSAPP_TRIGGERS} selected={formData.aiChannels?.whatsappSettings?.triggers || []} onChange={(triggers) => updateAiChannelSettings('whatsapp', { triggers })} />
                                            </div>
                                            {/* Custom schedule UI (retained) */}
                                        </div>
                                    )}
                                </div>
                                <div className="h-px bg-slate-200 mx-2"></div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg transition-colors ${formData.aiChannels?.voice ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-400'}`}><Phone size={18} /></div>
                                            <div><div className="text-sm font-semibold text-slate-800">Voice Reminders</div><div className="text-[10px] text-slate-500">Calls for critical deadlines</div></div>
                                        </div>
                                        <Toggle enabled={formData.aiChannels?.voice ?? false} onToggle={() => updateAiChannel('voice', !formData.aiChannels?.voice)} size="sm" />
                                    </div>
                                    {/* Voice settings UI (retained) */}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 mb-6">
                <div className="flex items-center gap-2 mb-3"><HistoryIcon size={16} className="text-slate-500" /><h3 className="text-sm font-semibold text-slate-900">AI History</h3></div>
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-4">
                    {formData.aiHistory?.length ? (
                        formData.aiHistory.map((item) => (
                            <div key={item.id} className="relative pl-4 border-l-2 border-slate-200 last:border-0 pb-4 last:pb-0">
                                <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${item.status === 'success' ? 'bg-green-500' : item.status === 'failure' ? 'bg-red-500' : item.status === 'pending' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                <div className="text-[10px] font-medium text-slate-400 mb-0.5">{new Date(item.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                <div className="text-xs font-bold text-slate-800">{item.action}</div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.details}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-slate-400"><Bot size={24} className="mx-auto mb-2 opacity-50" /><p className="text-xs">No AI interactions recorded yet.</p></div>
                    )}
                </div>
            </div>

            <div className="px-4 space-y-1 mb-6">
                <div className="relative" ref={listRef}>
                    <button onClick={() => setIsListOpen(!isListOpen)} className="w-full flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-slate-100 transition-colors text-left border border-transparent hover:border-slate-200">
                        <div className="flex items-center justify-center rounded-lg bg-blue-100 text-primary shrink-0 w-9 h-9"><Folder size={20} /></div>
                        <div className="flex-1 min-w-0"><p className="text-xs font-medium text-slate-500 mb-0.5">List</p><p className="text-sm font-medium text-slate-900 truncate">{formData.list || 'General'}</p></div>
                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isListOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isListOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-y-auto custom-scrollbar flex flex-col">
                           {!isCreatingList ? (
                                <>
                                    <div className="overflow-y-auto custom-scrollbar flex-1">
                                        {displayLists.map(list => (
                                            <button key={list} onClick={() => { updateField('list', list); setIsListOpen(false); }} className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-between ${formData.list === list ? 'text-primary bg-blue-50/50' : 'text-slate-700'}`}>
                                                {list} {formData.list === list && <Check size={16} />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-2 border-t border-slate-100 bg-slate-50">
                                        <button onClick={() => setIsCreatingList(true)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white border border-dashed border-slate-300 text-slate-500 hover:text-primary hover:border-primary hover:bg-blue-50 transition-all text-xs font-bold uppercase tracking-wide"><Plus size={14} /> Create New List</button>
                                    </div>
                                </>
                           ) : (
                                <div className="p-3 bg-white">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">New List Name</label>
                                    <input autoFocus type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createNewList(); if (e.key === 'Escape') setIsCreatingList(false); }} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm mb-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="e.g. Project X" />
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsCreatingList(false)} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50">Cancel</button>
                                        <button onClick={createNewList} className="flex-1 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-blue-700 shadow-sm">Add List</button>
                                    </div>
                                </div>
                           )}
                        </div>
                    )}
                </div>

                <div className="w-full flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-slate-100 transition-colors text-left border border-transparent hover:border-slate-200">
                    <div className="flex items-center justify-center rounded-lg bg-purple-100 text-purple-500 shrink-0 w-9 h-9"><Hash size={20} /></div>
                    <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar flex-wrap">
                        {formData.tags?.map((tag, i) => (
                             <div key={i} className="group relative inline-flex items-center">
                                <span className="inline-flex items-center px-2 py-1 rounded bg-purple-100 text-purple-600 text-xs font-medium">{tag}</span>
                                <button onClick={() => removeTag(tag)} className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={8} /></button>
                             </div>
                        ))}
                        {isTagInputVisible ? (
                            <input autoFocus type="text" value={tagInputValue} onChange={(e) => setTagInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTag(); else if (e.key === 'Escape') setIsTagInputVisible(false); }} onBlur={addTag} className="w-24 px-2 py-1 rounded text-xs border border-primary outline-none bg-white" placeholder="#tag" />
                        ) : (
                            <button onClick={() => setIsTagInputVisible(true)} className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-slate-400 text-slate-400 hover:text-primary hover:border-primary transition-colors"><Plus size={14} /></button>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 mb-6">
                <label className="block text-sm font-medium text-slate-500 mb-2 pl-1">Description</label>
                <div className="relative">
                    <textarea value={formData.description} onChange={(e) => updateField('description', e.target.value)} onBlur={autoGenerateTags} className="w-full min-h-[120px] rounded-xl bg-slate-50 border-0 text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-primary p-4 text-base leading-relaxed resize-none" placeholder="Add notes or context..." />
                    <button className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-1.5 pr-2.5"><Sparkles size={16} /><span className="text-xs font-bold">Auto-Complete</span></button>
                </div>
            </div>

             <div className="px-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Link size={16} className="text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-900">Dependencies</h3>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
                    {formData.dependencies && formData.dependencies.length > 0 ? (
                        formData.dependencies.map(depId => {
                            const depTask = availableTasks.find(t => t.id === depId);
                            return (
                                <div key={depId} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`w-2 h-2 rounded-full ${depTask?.status === 'Done' ? 'bg-green-500' : 'bg-slate-300'}`} />
                                        <span className="text-xs font-medium truncate text-slate-700">{depTask?.title || 'Unknown Task'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                         <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${depTask?.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{depTask?.status || 'Unknown'}</span>
                                         <button onClick={() => removeDependency(depId)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={14}/></button>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <p className="text-xs text-slate-400 italic text-center py-2">No prerequisites linked. This task can start anytime.</p>
                    )}
                    
                    <div className="relative" ref={depRef}>
                         <button onClick={() => setIsDependencyPickerOpen(!isDependencyPickerOpen)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white border border-dashed border-slate-300 text-slate-500 hover:text-primary hover:border-primary hover:bg-blue-50 transition-all text-xs font-bold uppercase tracking-wide">
                            <Plus size={14} /> Add Dependency
                         </button>
                         {isDependencyPickerOpen && (
                             <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto custom-scrollbar">
                                 {dependencyCandidates.length > 0 ? (
                                     dependencyCandidates.map(t => (
                                         <button key={t.id} onClick={() => addDependency(t.id)} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between group">
                                             <span className="truncate font-medium text-slate-700">{t.title}</span>
                                             <span className="text-[10px] text-slate-400 group-hover:text-primary">{t.status}</span>
                                         </button>
                                     ))
                                 ) : (
                                     <div className="px-4 py-3 text-xs text-slate-400 text-center">No other tasks available to link.</div>
                                 )}
                             </div>
                         )}
                    </div>
                </div>
            </div>

            <div className="px-4 mb-8">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-base font-semibold text-slate-900">Subtasks</h3>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{formData.subtasks?.filter(s => s.completed).length || 0}/{formData.subtasks?.length || 0}</span>
                </div>
                <div className="space-y-3">
                    {formData.subtasks?.map((subtask) => (
                        <div key={subtask.id} className={`group flex items-center gap-3 p-3 rounded-lg border border-transparent focus-within:border-primary/50 transition-all duration-300 ${subtask.completed ? 'bg-slate-50/50' : 'bg-slate-50'}`}>
                            <input type="checkbox" checked={subtask.completed} onChange={() => toggleSubtask(subtask.id)} className="h-5 w-5 rounded border-slate-400 bg-transparent text-primary focus:ring-offset-0 focus:ring-0 cursor-pointer transition-transform duration-200 ease-out active:scale-90" />
                            <input type="text" value={subtask.text} onChange={(e) => handleSubtaskChange(subtask.id, e.target.value)} className={`flex-1 bg-transparent border-none p-0 focus:ring-0 text-sm transition-all duration-300 ${subtask.completed ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900'}`} />
                            <button onClick={() => removeSubtask(subtask.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"><X size={20} /></button>
                        </div>
                    ))}
                    <button onClick={addSubtask} className="flex items-center gap-3 w-full p-2 pl-3 text-slate-500 hover:text-primary transition-colors group"><Plus size={20} className="group-hover:scale-110 transition-transform" /><span className="text-sm font-medium">Add subtask</span></button>
                </div>
            </div>
            
        </main>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex items-center justify-between z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button className="flex items-center gap-2 text-indigo-600 font-bold text-xs bg-indigo-50 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"><Sparkles size={16} /><span>AI Breakdown</span></button>
            <div className="flex items-center gap-3">
                <button onClick={onClose} className="px-4 py-2 text-slate-500 font-medium text-sm hover:text-slate-800 transition-colors">Cancel</button>
                <button onClick={() => onSave(formData)} className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"><Save size={18} /><span>Save Changes</span></button>
            </div>
        </div>
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  list: string;
  count: number;
  tasks: Task[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, list: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onEditTask: (task: Task) => void;
  onNewTask: () => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ list, count, tasks, onDragOver, onDrop, onDragStart, onEditTask, onNewTask }) => {
  const columnTasks = tasks.filter(t => (t.list || 'General') === list);
  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'Urgent': return 'border-l-red-500'; case 'High': return 'border-l-orange-500'; case 'Medium': return 'border-l-blue-500'; default: return 'border-l-slate-200';
      }
  };
  return (
    <div className="flex-shrink-0 w-80 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col max-h-full" onDragOver={onDragOver} onDrop={(e) => onDrop(e, list)}>
      <div className="p-4 flex items-center justify-between border-b border-slate-100">
         <div className="flex items-center space-x-2"><h4 className="font-bold text-sm text-slate-700">{list}</h4><span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span></div>
         <button onClick={onNewTask} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"><Plus size={16} /></button>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
         {columnTasks.map(task => (
           <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task.id)} onClick={() => onEditTask(task)} className={`bg-white p-4 rounded-xl border border-slate-200 border-l-4 ${getPriorityColor(task.priority)} shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group relative animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className="flex flex-wrap gap-2 mb-2">
                 {task.priority === 'Urgent' && <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-[10px] font-bold uppercase">Urgent</span>}
                 {task.priority === 'High' && <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-[10px] font-bold uppercase">Important</span>}
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1 line-clamp-2">{task.title}</h4>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-700">{task.assignee === 'Me' ? 'ME' : task.assignee.charAt(0)}</div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${task.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{task.status}</span>
                  </div>
                  {(task.dueDate) && (
                    <div className="text-right"><div className="text-xs text-slate-400 font-medium">{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>{task.dueTime && (<div className="text-[10px] text-slate-400">{task.dueTime}</div>)}</div>
                  )}
              </div>
              {task.dependencies && task.dependencies.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-1 text-[10px] text-slate-400">
                      <Link size={12} />
                      <span>{task.dependencies.length} Prerequisite{task.dependencies.length > 1 ? 's' : ''}</span>
                  </div>
              )}
           </div>
         ))}
      </div>
    </div>
  );
};

// Reused CalendarBoard (implied implementation same as before but accepting props correctly)
const CalendarBoard = ({ tasks, onEditTask, onNewTaskWithDate }: { tasks: Task[], onEditTask: (task: Task) => void, onNewTaskWithDate: (date: string) => void }) => {
  return (
      <div className="flex-1 flex items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-100 m-4">
          <div className="text-center">
              <CalendarIcon size={48} className="mx-auto mb-2 opacity-50" />
              <p>Calendar View is available in full mode.</p>
          </div>
      </div>
  );
};

// --- Updated Tasks View to support state lifting and Project Context ---

interface TasksViewProps {
    tasks: Task[];
    onUpdateTask: (task: Task) => void;
    onAddTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    projectId?: string;
}

const TasksView = ({ tasks, onUpdateTask, onAddTask, onDeleteTask, projectId }: TasksViewProps) => {
  // Filter tasks if project context exists
  const displayTasks = useMemo(() => projectId ? tasks.filter(t => t.projectId === projectId) : tasks, [tasks, projectId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'board' | 'calendar'>('table');
  const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<string | undefined>(undefined);
  const [quickFilter, setQuickFilter] = useState<'All' | 'Pending' | 'Overdue' | 'Completed' | 'Assigned' | 'High'>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortKey, setSortKey] = useState<keyof Task | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [toastMessage, setToastMessage] = useState<string|null>(null);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };
  
  const checkDependencies = (task: Task, newStatus?: string): boolean => {
      if (!task.dependencies || task.dependencies.length === 0) return true;
      const targetStatus = newStatus || task.status;
      // Only block if moving to 'In Progress' or 'Done' (or 'Review') - basically starting or finishing
      // If it's already 'Todo', we don't block.
      if (targetStatus === 'Todo' || targetStatus === 'Draft') return true;

      const blockingTasks = task.dependencies
          .map(id => tasks.find(t => t.id === id))
          .filter(t => t && t.status !== 'Done');
      
      if (blockingTasks.length > 0) {
          const names = blockingTasks.map(t => t?.title).join(', ');
          showToast(`Cannot start: Prerequisite tasks incomplete (${blockingTasks.length})`);
          return false;
      }
      return true;
  };

  const handleSaveTaskWrapper = (savedTask: Task) => { 
      // Check dependencies if status is active
      if (!checkDependencies(savedTask, savedTask.status)) {
          // If dependencies not met, we don't save status changes that violate rules if they were just made.
          // But allow saving other fields? For simplicity, we block save if status is invalid.
          // Or better: Revert status? 
          // Let's assume the user wants to save edits but we might need to revert status if invalid.
          // For this implementation, we just return and show toast from checkDependencies.
          return; 
      }

      if (editingTask) onUpdateTask(savedTask); 
      else onAddTask(savedTask); 
      setIsModalOpen(false); 
      setEditingTask(null); 
      setSelectedDateForNewTask(undefined); 
  };
  
  const handleInlineUpdate = (id: string, field: keyof Task | string, value: any) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    // Dependency Check for Inline Status Updates
    if (field === 'status') {
         if (!checkDependencies(task, value)) return;
    }
    
    let updatedTask = { ...task };

    if ((field as string).startsWith('budget.')) {
        const budgetField = (field as string).split('.')[1];
        const newBudget = { ...task.budget, [budgetField]: value };
        // Recalculate status
        if (['agreed', 'advance', 'paymentDueDate'].includes(budgetField)) {
            const agreed = parseFloat(newBudget.agreed?.toString() || '0');
            const advance = parseFloat(newBudget.advance?.toString() || '0');
            const pDate = newBudget.paymentDueDate;
            if (agreed > 0) {
                const remaining = agreed - advance;
                const now = new Date();
                const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                if (remaining <= 0.001) newBudget.status = 'Paid in Full';
                else { if (pDate && pDate < today) newBudget.status = 'Overdue'; else if (advance > 0) newBudget.status = 'Advance Paid'; else newBudget.status = 'Balance Due'; }
            } else newBudget.status = 'None';
        }
        updatedTask.budget = newBudget;
    } else if (field === 'aiChannels') {
        updatedTask = { ...task, aiChannels: { ...task.aiChannels, ...value } as any };
    } else {
        updatedTask = { ...task, [field]: value };
    }
    onUpdateTask(updatedTask);
  };

  const openNewTaskModal = (dateStr?: string) => { setEditingTask(null); setSelectedDateForNewTask(dateStr); setIsModalOpen(true); };
  const openEditTaskModal = (task: Task) => { setEditingTask(task); setIsModalOpen(true); };
  
  const handleTaskAction = (action: 'share'|'clone'|'archive'|'delete', task: Task) => {
      if (action === 'delete') { onDeleteTask(task.id); showToast('Task deleted successfully'); } 
      else if (action === 'archive') { handleInlineUpdate(task.id, 'status', 'Archived'); showToast('Task archived'); } 
      else if (action === 'clone') { const newTask: Task = { ...task, id: Date.now().toString(), title: `Copy of ${task.title}`, status: 'Todo' }; onAddTask(newTask); showToast('Task duplicated successfully'); }
      setActiveMenuId(null);
  };

  const handleSort = (key: keyof Task) => { if (sortKey === key) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDirection('asc'); } };
  const handleDragStart = (e: React.DragEvent, taskId: string) => { e.dataTransfer.setData('taskId', taskId); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent, listName: string) => { e.preventDefault(); const taskId = e.dataTransfer.getData('taskId'); if (taskId) handleInlineUpdate(taskId, 'list', listName); };

  const processedTasks = useMemo(() => {
    let result = [...displayTasks];
    const now = new Date();
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    switch (quickFilter) {
      case 'All': result = result.filter(t => t.status !== 'Archived'); break;
      case 'Pending': result = result.filter(t => t.status !== 'Done' && t.status !== 'Archived'); break;
      case 'Overdue': result = result.filter(t => t.status !== 'Done' && t.status !== 'Archived' && t.dueDate && t.dueDate < today); break; 
      case 'Completed': result = result.filter(t => t.status === 'Done'); break;
      case 'Assigned': result = result.filter(t => t.assignee === 'Me' && t.status !== 'Archived'); break;
      case 'High': result = result.filter(t => (t.priority === 'High' || t.priority === 'Urgent') && t.status !== 'Archived'); break;
    }
    if (filterPriority !== 'All') result = result.filter(t => t.priority === filterPriority);
    if (filterAssignee !== 'All') result = result.filter(t => t.assignee === filterAssignee);
    if (filterStatus !== 'All') result = result.filter(t => t.status === filterStatus);
    if (sortKey) {
      result.sort((a, b) => { let valA: any = a[sortKey]; let valB: any = b[sortKey]; if (valA < valB) return sortDirection === 'asc' ? -1 : 1; if (valA > valB) return sortDirection === 'asc' ? 1 : -1; return 0; });
    }
    return result;
  }, [displayTasks, filterPriority, filterAssignee, filterStatus, sortKey, sortDirection, quickFilter]);
  
  const boardLists = useMemo(() => Array.from(new Set([...AVAILABLE_LISTS, ...processedTasks.map(t => t.list || 'General')])), [processedTasks]);
  const SortIcon = ({ column }: { column: keyof Task }) => sortKey !== column ? <ArrowUpDown size={12} className="ml-1 opacity-20" /> : sortDirection === 'asc' ? <ArrowUp size={12} className="ml-1 text-primary" /> : <ArrowDown size={12} className="ml-1 text-primary" />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative flex flex-col h-full">
      {toastMessage && (<div className="absolute top-4 right-1/2 translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg z-[60] animate-in fade-in slide-in-from-top-2 text-sm font-medium flex items-center"><CheckCircle2 size={16} className="mr-2 text-green-400" />{toastMessage}</div>)}
      <TaskDetailPanel isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTaskWrapper} task={editingTask} onAction={handleTaskAction} initialDate={selectedDateForNewTask} projectId={projectId} availableTasks={tasks} />
      
      {/* Conditionally render header based on context */}
      {!projectId ? (
          <SectionHeader title="My Tasks" subtitle="Priority items and AI-delegated actions" action={
              <div className="flex space-x-3 items-center">
                <button onClick={() => showToast('All changes saved successfully')} className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 hover:text-primary transition-colors"><Save size={16} className="mr-2" /> Save</button>
                <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center mr-2">
                <button onClick={() => setViewMode('board')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'board' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><KanbanIcon size={14} className="mr-2" /> Board</button>
                <button onClick={() => setViewMode('table')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><TableIcon size={14} className="mr-2" /> Table</button>
                <button onClick={() => setViewMode('calendar')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><CalendarIcon size={14} className="mr-2" /> Calendar</button>
                </div>
                <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${isFilterOpen ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Filter size={16} className="mr-2" /> Filter</button>
                <button onClick={() => openNewTaskModal()} className="flex items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"><Plus size={16} className="mr-2" /> Add Task</button>
              </div>
            }
          />
      ) : (
        <div className="flex justify-between items-center mb-2">
             <div className="bg-white p-1 rounded-lg border border-slate-200 flex items-center">
                <button onClick={() => setViewMode('board')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'board' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><KanbanIcon size={14} className="mr-2" /> Board</button>
                <button onClick={() => setViewMode('table')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><TableIcon size={14} className="mr-2" /> Table</button>
                <button onClick={() => setViewMode('calendar')} className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><CalendarIcon size={14} className="mr-2" /> Calendar</button>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isFilterOpen ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}><Filter size={16} className="mr-2" /> Filter</button>
                <button onClick={() => openNewTaskModal()} className="flex items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-primary/20"><Plus size={16} className="mr-2" /> Add Task</button>
            </div>
        </div>
      )}
      
      {/* Render filters only if filter open or explicit dashboard view - for Project view we might want simpler filters later */}
      {(isFilterOpen || !projectId) && (
          <div className={`flex items-center gap-2 overflow-x-auto pb-2 -mt-2 mb-4 no-scrollbar ${projectId ? 'hidden' : ''}`}>
              {[{ id: 'All', label: 'All Tasks' }, { id: 'Pending', label: 'Pending' }, { id: 'Overdue', label: 'Overdue' }, { id: 'Completed', label: 'Completed' }, { id: 'Assigned', label: 'Assigned to Me' }, { id: 'High', label: 'High Priority' }].map((tab) => (
                  <button key={tab.id} onClick={() => setQuickFilter(tab.id as any)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${quickFilter === tab.id ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700'}`}>{tab.label}</button>
              ))}
          </div>
      )}
      
      {/* Advanced Filters */}
      {isFilterOpen && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 animate-in slide-in-from-top-2 mb-4">
           <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-700">Advanced Filters</h3><button onClick={() => { setFilterPriority('All'); setFilterAssignee('All'); setFilterStatus('All'); }} className="text-xs text-primary font-bold hover:underline">Clear All</button></div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Status</label><select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All Statuses</option><option value="Todo">Todo</option><option value="In Progress">In Progress</option><option value="Review">Review</option><option value="Done">Done</option><option value="Archived">Archived</option></select></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Priority</label><select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All Priorities</option><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option></select></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Assignee</label><select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"><option value="All">All Assignees</option><option value="Me">Me</option><option value="AI Agent">AI Agent</option><option value="Team">Team</option></select></div>
           </div>
        </div>
      )}

      {viewMode === 'calendar' ? (<CalendarBoard tasks={processedTasks} onEditTask={openEditTaskModal} onNewTaskWithDate={openNewTaskModal} />) : viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0 animate-in fade-in zoom-in-95 duration-300">
            <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[1300px]">
                    <div className="flex items-center p-4 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <div className="w-12 pl-2 text-left">AI</div>
                        <div className="flex-1 min-w-[200px] cursor-pointer hover:text-primary flex items-center text-left" onClick={() => handleSort('title')}>Task Name <SortIcon column="title"/></div>
                        <div className="w-32 cursor-pointer hover:text-primary flex items-center text-left" onClick={() => handleSort('assignee')}>Assignee <SortIcon column="assignee"/></div>
                        <div className="w-28 cursor-pointer hover:text-primary flex items-center text-left" onClick={() => handleSort('status')}>Status <SortIcon column="status"/></div>
                        <div className="w-24 cursor-pointer hover:text-primary flex items-center text-left" onClick={() => handleSort('priority')}>Priority <SortIcon column="priority"/></div>
                        <div className="w-32 cursor-pointer hover:text-primary flex items-center text-left" onClick={() => handleSort('dueDate')}>Due Date <SortIcon column="dueDate"/></div>
                        <div className="w-24 text-left text-primary/80">Planned</div><div className="w-24 text-left text-primary/80">Agreed</div><div className="w-24 text-left text-primary/80">Paid</div><div className="w-24 text-left text-slate-700">Balance</div><div className="w-32 text-left text-slate-700">Balance Due</div><div className="w-14"></div>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(100vh-300px)] custom-scrollbar">
                        {processedTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400"><div className="p-4 bg-slate-50 rounded-full mb-3"><Search size={24} /></div><p>No tasks found matching your filters.</p><button onClick={() => { setQuickFilter('All'); setFilterPriority('All'); }} className="mt-2 text-primary font-bold text-sm hover:underline">Clear Filters</button></div>
                        ) : (
                            processedTasks.map(task => (
                                <div key={task.id} onClick={() => openEditTaskModal(task)} className="group flex items-center p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer text-sm">
                                    <div className="w-12 flex items-center pl-2" onClick={e => e.stopPropagation()}><Toggle enabled={task.aiCoordination} onToggle={() => handleInlineUpdate(task.id, 'aiCoordination', !task.aiCoordination)} size="sm" /></div>
                                    <div className="flex-1 min-w-[200px] pr-4"><input className="w-full bg-transparent border-none p-0 font-bold text-slate-800 focus:ring-0 focus:outline-none placeholder-slate-400 text-left" value={task.title} onChange={e => handleInlineUpdate(task.id, 'title', e.target.value)} onClick={e => e.stopPropagation()} /><div className="text-xs text-slate-400 mt-0.5 line-clamp-1 text-left">{task.description || 'No description'}</div></div>
                                    <div className="w-32 flex items-center pr-2" onClick={e => e.stopPropagation()}><div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold border border-white shrink-0 mr-2">{task.assignee === 'Me' ? 'ME' : task.assignee.charAt(0)}</div><select value={task.assignee} onChange={e => handleInlineUpdate(task.id, 'assignee', e.target.value)} className="bg-transparent text-xs text-slate-600 border-none focus:ring-0 w-full cursor-pointer p-0 text-left"><option value="Me">Me</option><option value="AI Agent">AI Agent</option><option value="Team">Team</option></select></div>
                                    <div className="w-28 pr-2" onClick={e => e.stopPropagation()}><select value={task.status} onChange={e => handleInlineUpdate(task.id, 'status', e.target.value)} className={`w-full bg-transparent text-[10px] font-bold uppercase border-none focus:ring-0 cursor-pointer text-left p-0 ${task.status === 'Done' ? 'text-green-700' : task.status === 'In Progress' ? 'text-blue-700' : task.status === 'Review' ? 'text-purple-700' : 'text-slate-600'}`}><option value="Todo">Todo</option><option value="In Progress">In Progress</option><option value="Review">Review</option><option value="Done">Done</option><option value="Archived">Archived</option></select></div>
                                    <div className="w-24 pr-2" onClick={e => e.stopPropagation()}><select value={task.priority} onChange={e => handleInlineUpdate(task.id, 'priority', e.target.value)} className={`w-full bg-transparent text-[10px] font-bold uppercase border-none focus:ring-0 cursor-pointer text-left p-0 ${task.priority === 'Urgent' ? 'text-red-600' : task.priority === 'High' ? 'text-orange-600' : task.priority === 'Medium' ? 'text-blue-600' : 'text-slate-500'}`}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option></select></div>
                                    <div className="w-32 pr-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <CustomDatePicker value={task.dueDate} onChange={val => handleInlineUpdate(task.id, 'dueDate', val)} compact className="flex-1" />
                                        <CustomTimePicker value={task.dueTime || ''} onChange={val => handleInlineUpdate(task.id, 'dueTime', val)} compact className="w-12" />
                                    </div>
                                    <div className="w-24 pr-2" onClick={e => e.stopPropagation()}><div className="relative"><span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span><input type="number" value={task.budget.planned || ''} onChange={e => handleInlineUpdate(task.id, 'budget.planned', isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value))} placeholder="0" className="w-full bg-transparent text-left text-xs border-none focus:ring-0 p-0 pl-3" /></div></div>
                                    <div className="w-24 pr-2" onClick={e => e.stopPropagation()}><div className="relative"><span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span><input type="number" value={task.budget.agreed || ''} onChange={e => handleInlineUpdate(task.id, 'budget.agreed', isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value))} placeholder="0" className="w-full bg-transparent text-left text-xs font-medium border-none focus:ring-0 p-0 pl-3" /></div></div>
                                    <div className="w-24 pr-2" onClick={e => e.stopPropagation()}><div className="relative"><span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span><input type="number" value={task.budget.advance || ''} onChange={e => handleInlineUpdate(task.id, 'budget.advance', isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value))} placeholder="0" className="w-full bg-transparent text-left text-xs border-none focus:ring-0 p-0 pl-3" /></div></div>
                                    <div className="w-24 text-left pr-2 font-medium text-slate-700">{(task.budget.advance || 0) >= (task.budget.agreed || 0) ? '' : `$${((task.budget.agreed || 0) - (task.budget.advance || 0)).toFixed(2)}`}</div>
                                    <div className="w-32 pr-2" onClick={e => e.stopPropagation()}><CustomDatePicker value={task.budget.paymentDueDate || ''} onChange={val => handleInlineUpdate(task.id, 'budget.paymentDueDate', val)} compact /></div>
                                    <div className="w-14 flex justify-end relative gap-1"><div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center"><button className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-full" onClick={() => openEditTaskModal(task)}><Maximize2 size={16} /></button><button className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-full" onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === task.id ? null : task.id); }}><MoreHorizontal size={18} /></button><ActionMenu isOpen={activeMenuId === task.id} onClose={() => setActiveMenuId(null)} onShare={() => handleTaskAction('share', task)} onClone={() => handleTaskAction('clone', task)} onArchive={() => handleTaskAction('archive', task)} onDelete={() => handleTaskAction('delete', task)} /></div></div>
                                    
                                    {/* Inline Dependency Indicator */}
                                    {task.dependencies && task.dependencies.length > 0 && (
                                        <div className="absolute right-20 top-1/2 -translate-y-1/2" title="Has dependencies">
                                            <Link size={14} className="text-slate-400" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto min-h-0 pb-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex space-x-6 h-full min-w-max pb-2">
            {boardLists.map(listName => (<KanbanColumn key={listName} list={listName} count={processedTasks.filter(t => (t.list || 'General') === listName).length} tasks={processedTasks} onDragOver={handleDragOver} onDrop={handleDrop} onDragStart={handleDragStart} onEditTask={openEditTaskModal} onNewTask={() => openNewTaskModal()} />))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- New Project Module Views ---

const ProjectsView = ({ 
    projects,
    onSelectProject,
    onCreateProject
}: { 
    projects: Project[],
    onSelectProject: (id: string) => void,
    onCreateProject: (data: NewProjectPayload) => void
}) => {
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <NewProjectModal 
          isOpen={isNewProjectModalOpen} 
          onClose={() => setIsNewProjectModalOpen(false)} 
          onSubmit={(data) => {
              onCreateProject(data);
              setIsNewProjectModalOpen(false);
          }} 
      />
      <SectionHeader title="My Projects" subtitle="Active initiatives and plans" action={
          <button onClick={() => setIsNewProjectModalOpen(true)} className="flex items-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-primary/20"><Plus size={16} className="mr-2" /> New Project</button>
        } 
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
          <div key={project.id} onClick={() => onSelectProject(project.id)} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${project.status === 'Execution' ? 'bg-green-100 text-green-700' : project.status === 'Planning' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{project.status}</span>
              <button className="text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={20} /></button>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{project.title}</h3>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{project.description}</p>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-500 mb-1"><span>Progress</span><span>{project.progress}%</span></div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${project.progress}%` }}></div></div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Wallet size={14} className="text-slate-400" /> ${project.budget.spent.toLocaleString()} / ${project.budget.total.toLocaleString()}</div>
                <div className={`flex items-center gap-1 text-xs font-bold ${project.riskLevel === 'High' ? 'text-red-600' : project.riskLevel === 'Medium' ? 'text-orange-600' : 'text-green-600'}`}><AlertTriangle size={12} /> {project.riskLevel} Risk</div>
              </div>
            </div>
          </div>
        ))}
        {/* New Project Placeholder */}
        <button onClick={() => setIsNewProjectModalOpen(true)} className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-50 transition-all text-slate-400 hover:text-primary h-full min-h-[220px]">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors"><Plus size={24} /></div>
          <span className="font-bold text-sm">Create New Project</span>
          <span className="text-xs mt-1 text-center max-w-[200px]">Launch AI Planning Coach to build a plan from scratch</span>
        </button>
      </div>
    </div>
  );
};

const ProjectDetailView = ({ 
    projectId, 
    onBack, 
    tasks,
    onUpdateTask,
    onAddTask,
    onDeleteTask,
    projects,
    onUpdateProject
}: { 
    projectId: string, 
    onBack: () => void,
    tasks: Task[],
    onUpdateTask: (task: Task) => void,
    onAddTask: (task: Task) => void,
    onDeleteTask: (taskId: string) => void,
    projects: Project[],
    onUpdateProject: (project: Project) => void
}) => {
  const project = projects.find(p => p.id === projectId);
  const [activeTab, setActiveTab] = useState<'plan' | 'budget' | 'activity'>('plan');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const projectTasks = useMemo(() => tasks.filter(t => t.projectId === projectId), [tasks, projectId]);

  if (!project) return <div>Project not found</div>;

  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="h-full flex flex-col animate-in slide-in-from-right duration-300 relative">
      {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg z-[60] animate-in fade-in slide-in-from-top-2 text-sm font-medium flex items-center">
              <CheckCircle2 size={16} className="mr-2 text-green-400" />
              {toastMessage}
          </div>
      )}

      <EditProjectModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        project={project} 
        onSave={(p) => { onUpdateProject(p); showToast('Project details updated'); }} 
      />
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="mt-1 p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><ChevronLeft size={20} /></button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-slate-900">{project.title}</h2>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wide">{project.status}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><CalendarClock size={14} /> {project.startDate} - {project.endDate || 'TBD'}</span>
              <span className="flex items-center gap-1.5"><Folder size={14} /> {project.category}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right mr-4 hidden sm:block">
              <div className="text-xs font-medium text-slate-500">Budget Utilized</div>
              <div className="text-lg font-bold text-slate-800">${project.budget.spent.toLocaleString()} <span className="text-xs text-slate-400 font-normal">of ${project.budget.total.toLocaleString()}</span></div>
           </div>
           
           <button onClick={() => showToast('All changes saved successfully')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 hover:text-primary transition-colors shadow-sm">
                <Save size={16} /> Save
           </button>

           <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors"><Sparkles size={16} /> AI Coach</button>
           
           <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 hover:text-primary transition-colors shadow-sm">
                <Pencil size={16} /> Edit Project
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
        {['plan', 'budget', 'activity'].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab as any)}
            className={`pb-3 text-sm font-bold capitalize transition-all relative ${activeTab === tab ? 'text-primary' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'plan' ? 'Tasks & Plan' : tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'plan' && <TasksView projectId={projectId} tasks={tasks} onUpdateTask={onUpdateTask} onAddTask={onAddTask} onDeleteTask={onDeleteTask} />}
        {activeTab === 'budget' && <BudgetView project={project} tasks={projectTasks} />}
        {activeTab === 'activity' && (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl m-4"><HistoryIcon size={48} className="mb-4 text-slate-200" /><h2 className="text-xl font-bold text-slate-600">Activity Log</h2><p className="text-sm">Timeline of project events coming soon.</p></div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Global State
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);

  const handleUpdateTask = (updatedTask: Task) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };
  const handleAddTask = (newTask: Task) => {
      setTasks(prev => [newTask, ...prev]);
  };
  const handleDeleteTask = (taskId: string) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleUpdateProject = (updatedProject: Project) => {
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleCreateProject = (data: NewProjectPayload) => {
      const newId = `PROJ-${Date.now()}`;
      const newProject: Project = {
          id: newId,
          title: data.title,
          category: data.category,
          status: 'Planning', // Created in Planning state as per workflow
          startDate: data.startDate,
          endDate: data.endDate,
          budget: { total: data.budget, committed: 0, spent: 0 },
          riskLevel: 'Low',
          description: data.description,
          progress: 0
      };
      
      // Generate some mock AI tasks based on category
      const mockTasks: Task[] = [
          {
              id: `TASK-${Date.now()}-1`,
              projectId: newId,
              title: `Initial Planning for ${data.title}`,
              status: 'In Progress',
              priority: 'High',
              assignee: 'Me',
              assignmentType: 'Self',
              dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
              description: 'AI generated initial task: Review project scope and timeline.',
              tags: ['#planning', '#ai-generated'],
              subtasks: [],
              dependencies: [],
              recurrence: { enabled: false, frequency: 'Weekly', interval: 1 },
              aiCoordination: false,
              aiChannels: { whatsapp: false, email: false, voice: false },
              aiHistory: [],
              budget: { planned: 0, agreed: 0, advance: 0, status: 'None', paymentDueDate: '' },
              list: 'General'
          },
          {
              id: `TASK-${Date.now()}-2`,
              projectId: newId,
              title: `Budget Review`,
              status: 'Todo',
              priority: 'Medium',
              assignee: 'Me',
              assignmentType: 'Self',
              dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
              description: 'AI generated task: Confirm budget allocation for key categories.',
              tags: ['#budget', '#finance'],
              subtasks: [],
              dependencies: [],
              recurrence: { enabled: false, frequency: 'Weekly', interval: 1 },
              aiCoordination: false,
              aiChannels: { whatsapp: false, email: false, voice: false },
              aiHistory: [],
              budget: { planned: 0, agreed: 0, advance: 0, status: 'None', paymentDueDate: '' },
              list: 'Finance'
          }
      ];

      setProjects(prev => [...prev, newProject]);
      setTasks(prev => [...mockTasks, ...prev]);
      
      // Auto-navigate to the new project
      setSelectedProjectId(newId);
      setActiveView('projects');
  };

  // Helper to switch to project view
  const navigateToProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveView('projects');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-50">
          <div className={`flex items-center gap-2 ${!isSidebarOpen && 'justify-center w-full'}`}><div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0"><Zap size={18} fill="currentColor" /></div>{isSidebarOpen && <span className="font-bold text-lg tracking-tight">Seyal AI</span>}</div>
          {isSidebarOpen && (<button onClick={() => setIsSidebarOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"><ChevronLeft size={18} /></button>)}
        </div>
        {!isSidebarOpen && (<button onClick={() => setIsSidebarOpen(true)} className="mx-auto mt-4 p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"><ChevronRight size={18} /></button>)}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
            <SidebarItem icon={LayoutDashboard} label={isSidebarOpen ? "Dashboard" : ""} active={activeView === 'dashboard'} onClick={() => { setActiveView('dashboard'); setSelectedProjectId(null); }} />
            <SidebarItem icon={Briefcase} label={isSidebarOpen ? "Projects" : ""} active={activeView === 'projects'} onClick={() => { setActiveView('projects'); setSelectedProjectId(null); }} />
            <SidebarItem icon={CheckSquare} label={isSidebarOpen ? "My Tasks" : ""} active={activeView === 'tasks'} onClick={() => { setActiveView('tasks'); setSelectedProjectId(null); }} />
            <SidebarItem icon={Users} label={isSidebarOpen ? "Contacts" : ""} active={activeView === 'contacts'} onClick={() => setActiveView('contacts')} />
            <SidebarItem icon={Bot} label={isSidebarOpen ? "Automation" : ""} active={activeView === 'automation'} onClick={() => setActiveView('automation')} />
        </nav>
        <div className="p-3 border-t border-slate-50 space-y-1">
            <SidebarItem icon={Settings} label={isSidebarOpen ? "Settings" : ""} active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
            {isSidebarOpen && (<div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"><div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">JD</div><div className="flex-1 min-w-0"><div className="text-xs font-bold text-slate-900 truncate">John Doe</div><div className="text-[10px] text-slate-500 truncate">john@example.com</div></div></div>)}
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/50 p-6">
        {activeView === 'dashboard' && (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl m-4 animate-in fade-in zoom-in-95 duration-500"><LayoutDashboard size={48} className="mb-4 text-slate-200" /><h2 className="text-xl font-bold text-slate-600">Dashboard</h2><p className="text-sm">Widgets coming soon.</p></div>
        )}
        {activeView === 'projects' && (
          selectedProjectId 
            ? <ProjectDetailView 
                  projectId={selectedProjectId} 
                  onBack={() => setSelectedProjectId(null)} 
                  tasks={tasks}
                  onUpdateTask={handleUpdateTask}
                  onAddTask={handleAddTask}
                  onDeleteTask={handleDeleteTask}
                  projects={projects}
                  onUpdateProject={handleUpdateProject}
              />
            : <ProjectsView 
                  projects={projects}
                  onSelectProject={navigateToProject} 
                  onCreateProject={handleCreateProject}
              />
        )}
        {activeView === 'tasks' && (
            <TasksView 
                tasks={tasks}
                onUpdateTask={handleUpdateTask}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
            />
        )}
        {(activeView === 'contacts' || activeView === 'automation' || activeView === 'settings' || activeView === 'leads') && (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl m-4 animate-in fade-in zoom-in-95 duration-500"><Bot size={48} className="mb-4 text-slate-200" /><h2 className="text-xl font-bold text-slate-600">Coming Soon</h2><p className="text-sm">The {activeView} module is under construction.</p></div>
        )}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) { const root = createRoot(container); root.render(<App />); }
