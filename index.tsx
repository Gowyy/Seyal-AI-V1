import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Bot, LayoutDashboard, Briefcase, CheckSquare, Users, Zap, RotateCcw, 
  Sparkles, X, Lightbulb, Loader2, Wand2, MessageCircle, Mail, Phone, 
  List as ListIcon, ChevronLeft, Save, GripVertical, Clock, Trash2, Plus, 
  Upload, Folder, FileText, Wallet, DollarSign, TrendingUp, Target, 
  Pencil, Brain, ChevronDown, Calendar, Kanban as KanbanIcon, LayoutTemplate,
  CheckCircle2, ArrowRight, ArrowUp, ArrowDown, Copy, Search
} from 'lucide-react';

// --- Polyfill for process.env ---
if (typeof process === 'undefined') {
  (window as any).process = { env: { API_KEY: '' } };
}

// --- Interfaces ---
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
  playbookId?: string; // New field for assigned playbook
  customFields?: { key: string; value: string }[];
}

interface PlaybookStep {
  id: string;
  order: number;
  channel: string;
  trigger: {
    type: string;
    value: number;
    unit: string;
  };
  content: string;
  condition?: string;
}

interface Playbook {
  id: string;
  name: string;
  description?: string;
  leadType: string;
  isActive: boolean;
  steps: PlaybookStep[];
  activeLeadsCount: number;
}

interface MeetingSummary {
    id: string;
    title: string;
    date: string;
    transcript?: string;
    summary: string;
    actionItems: string[];
}

interface Project {
    id: string;
    title: string;
    category: string;
    status: string;
    startDate: string;
    endDate: string;
    budget: { total: number; committed: number; spent: number };
    riskLevel: string;
    description: string;
    progress: number;
    clientType: string;
    companyName?: string;
    clientName?: string;
    clientEmail?: string;
    clientStdCode?: string;
    clientPhone?: string;
    meetings: MeetingSummary[];
    tasks?: Partial<Task>[]; // Optional tasks for templates
}

interface Task {
    id: string;
    projectId: string;
    title: string;
    status: string;
    priority: string;
    assignee: string;
    assignmentType: string;
    dueDate: string;
    dueTime?: string;
    description: string;
    tags: string[];
    subtasks: { id: string; text: string; completed: boolean }[];
    dependencies: string[];
    recurrence: { enabled: boolean; frequency: string; interval: number };
    aiCoordination: boolean;
    aiChannels: { whatsapp: boolean; email: boolean; voice: boolean; whatsappSettings?: { triggers: string[] } };
    aiHistory: { id: string; action: string; timestamp: string; details: string; status: string }[];
    budget: { planned: number; agreed: number; advance: number; paymentDueDate: string; status: string };
    list: string;
    meetings?: MeetingSummary[];
}

interface TaskTemplate {
    id: string;
    name: string;
    structure: {
        title: string;
        description: string;
        priority: string;
        subtasks: { id: string; text: string; completed: boolean }[];
        recurrence: { enabled: boolean; frequency: string; interval: number };
    };
}

// --- Mock Data ---

const MOCK_PROJECT_TEMPLATES = [
    {
        id: 'PTPL-001',
        title: 'Website Redesign',
        category: 'Marketing',
        description: 'Complete overhaul of corporate website including new branding, content strategy, and SEO optimization.',
        budget: 15000,
        riskLevel: 'Medium',
        tasks: [
            { title: 'Kickoff Meeting', priority: 'High', status: 'Todo', description: 'Initial alignment' },
            { title: 'Design Mockups', priority: 'High', status: 'Todo', description: 'Create figma designs' },
            { title: 'Frontend Development', priority: 'Medium', status: 'Todo', description: 'React implementation' },
            { title: 'Content Migration', priority: 'Medium', status: 'Todo', description: 'Move blog posts' }
        ]
    },
    {
        id: 'PTPL-002',
        title: 'Mobile App Launch',
        category: 'Engineering',
        description: 'Launch of the new mobile application on iOS and Android stores.',
        budget: 25000,
        riskLevel: 'High',
        tasks: [
            { title: 'App Store Submission', priority: 'Urgent', status: 'Todo', description: 'Prepare screenshots and text' },
            { title: 'Marketing Assets', priority: 'High', status: 'Todo', description: 'Social media banners' },
            { title: 'Beta Testing', priority: 'Medium', status: 'Todo', description: 'Test flight release' }
        ]
    },
    {
        id: 'PTPL-003',
        title: 'Client Onboarding',
        category: 'Sales',
        description: 'Standard procedure for onboarding a new high-value client.',
        budget: 5000,
        riskLevel: 'Low',
        tasks: [
            { title: 'Contract Signing', priority: 'Urgent', status: 'Todo', description: 'Send via DocuSign' },
            { title: 'Welcome Email', priority: 'Medium', status: 'Todo', description: 'Intro to team' },
            { title: 'Access Setup', priority: 'High', status: 'Todo', description: 'Jira and Slack access' }
        ]
    }
];

const MOCK_LEADS: Lead[] = [
  {
    id: 'LEAD-001',
    name: 'Alice Johnson',
    clientType: 'Company',
    company: 'TechFlow Inc.',
    email: 'alice@techflow.com',
    phone: '123-4567',
    stdCode: '+1',
    location: 'New York, NY',
    country: 'USA',
    status: 'Proposal Sent',
    source: 'Website',
    serviceType: 'Web Development',
    budgetRange: '$5k - $10k',
    requirement: 'Need a complete overhaul of the corporate website with AI chatbot integration.',
    value: 15000,
    lastContact: '2023-11-10',
    probability: 75,
    playbookId: 'PB-001',
    customFields: [{ key: 'Industry', value: 'Technology' }]
  },
  {
    id: 'LEAD-002',
    name: 'Bob Smith',
    clientType: 'Individual',
    company: '',
    email: 'bsmith@gmail.com',
    phone: '9876543210',
    stdCode: '+91',
    location: 'Bangalore',
    country: 'India',
    status: 'New',
    source: 'Referral',
    serviceType: 'AI Automation',
    budgetRange: '$1k - $5k',
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

const MOCK_MEETINGS: MeetingSummary[] = [
    {
        id: 'MEET-001',
        title: 'Project Kickoff',
        date: '2023-10-01',
        transcript: "Alice: Let's start the Q4 campaign. Bob: I need the assets by Friday. Alice: Agreed. We will target social media first.",
        summary: "Kickoff meeting for Q4 campaign. Team agreed to prioritize social media channels. Assets are required by Friday.",
        actionItems: ["Bob to deliver assets by Friday", "Alice to setup social media ads"]
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
    riskLevel: 'Medium',
    description: 'End of year marketing campaign across all channels.',
    progress: 45,
    clientType: 'Company',
    companyName: 'TechFlow Inc.',
    clientName: 'Alice Johnson',
    clientEmail: 'contact@techflow.com',
    clientStdCode: '+1',
    clientPhone: '(555) 123-4567',
    meetings: [MOCK_MEETINGS[0]]
  },
  {
    id: 'PROJ-002',
    title: 'New Office Renovation',
    category: 'Operations',
    status: 'Planning',
    startDate: '2024-01-15',
    endDate: '2024-03-01',
    budget: { total: 150000, committed: 20000, spent: 5000 },
    riskLevel: 'Low',
    description: 'Renovating the new downtown office space.',
    progress: 15,
    clientType: 'Individual',
    clientName: 'Internal Ops',
    clientEmail: 'ops@ourcompany.com',
    clientStdCode: '+1',
    clientPhone: '555-000-0000',
    meetings: []
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
    list: 'Sales',
    meetings: []
  }
];

const MOCK_TEMPLATES: TaskTemplate[] = [
    {
        id: 'TPL-001',
        name: 'Weekly Status Report',
        structure: {
            title: 'Weekly Status Report',
            description: 'Compile updates from all departments and prepare slide deck.',
            priority: 'Medium',
            subtasks: [
                { id: 'st1', text: 'Collect metrics', completed: false },
                { id: 'st2', text: 'Update slides', completed: false },
                { id: 'st3', text: 'Send for review', completed: false }
            ],
            recurrence: { enabled: true, frequency: 'Weekly', interval: 1 }
        }
    },
    {
        id: 'TPL-002',
        name: 'Client Onboarding',
        structure: {
            title: 'New Client Onboarding',
            description: 'Set up accounts, schedule kickoff, and send welcome packet.',
            priority: 'High',
            subtasks: [
                { id: 'st1', text: 'Create CRM entry', completed: false },
                { id: 'st2', text: 'Send welcome email', completed: false },
                { id: 'st3', text: 'Schedule kickoff call', completed: false }
            ],
            recurrence: { enabled: false, frequency: 'Weekly', interval: 1 }
        }
    }
];

// Constants
const AVAILABLE_SOURCES = ['Website', 'Referral', 'LinkedIn', 'Cold Call', 'Partner'];
const AVAILABLE_SERVICES = ['Web Development', 'Mobile App', 'AI Automation', 'Consulting', 'Design'];
const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

// --- Helper Functions ---

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Components

const SectionHeader = ({ title, subtitle, action }: any) => (
  <div className="flex justify-between items-center mb-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Sidebar = ({ activeView, onNavigate }: any) => (
  <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col flex-shrink-0 z-20">
    <div className="p-6">
      <div className="text-2xl font-bold text-primary flex items-center gap-2">
        <Bot size={28} /> Seyal AI
      </div>
    </div>
    <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
      {[
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'projects', icon: Briefcase, label: 'Projects' },
        { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
        { id: 'leads', icon: Users, label: 'Leads & CRM' },
        { id: 'playbooks', icon: Zap, label: 'Playbooks' },
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
            activeView === item.id ? 'bg-blue-50 text-primary' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <item.icon size={18} /> {item.label}
        </button>
      ))}
    </nav>
  </div>
);

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isDangerous }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 text-white font-bold text-sm rounded-lg ${isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-blue-700'}`}>Confirm</button>
        </div>
      </div>
    </div>
  );
};

const UndoToast = ({ isVisible, message, timeLeft, onUndo }: any) => {
  if (!isVisible) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[200] bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10">
      <span>{message}</span>
      <button onClick={onUndo} className="text-blue-400 font-bold hover:underline flex items-center gap-1">
        <RotateCcw size={16} /> Undo ({timeLeft}s)
      </button>
    </div>
  );
};

// --- Playbook Generator Modal ---
const PlaybookGeneratorModal = ({ isOpen, onClose, onGenerate }: any) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        try {
            const apiKey = (window as any).process?.env?.API_KEY;
            if (!apiKey) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const mockSteps = [
                    { id: `step-${Date.now()}-1`, order: 1, channel: 'email', trigger: { type: 'delay', value: 0, unit: 'minutes' }, content: "Welcome email..." },
                    { id: `step-${Date.now()}-2`, order: 2, channel: 'whatsapp', trigger: { type: 'delay', value: 2, unit: 'days' }, content: "Follow up message..." },
                ];
                onGenerate({ name: "AI Generated: " + prompt.substring(0, 15), steps: mockSteps });
            } else {
                const ai = new GoogleGenAI({ apiKey });
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [{
                        parts: [{ 
                            text: `Generate a sales playbook JSON for: ${prompt}. Return a JSON object with 'name', 'description', and 'steps' array. Each step has 'channel' (email/whatsapp/voice/sms), 'trigger' object (type: delay, value: number, unit: hours/days), and 'content'.` 
                        }]
                    }],
                    config: { responseMimeType: "application/json" }
                });
                if (response.text) {
                    const data = JSON.parse(response.text);
                    if (data.steps) {
                        data.steps = data.steps.map((s: any, i: number) => ({
                            ...s,
                            id: s.id || `ai-step-${Date.now()}-${i}`
                        }));
                    }
                    onGenerate(data);
                }
            }
            onClose();
        } catch (e) {
            console.error(e);
            alert("Generation failed");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-primary font-bold text-lg">
                        <Sparkles size={20} /> AI Playbook Generator
                    </div>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl text-indigo-800 text-sm mb-4 flex items-start gap-3">
                    <Lightbulb size={18} className="shrink-0 mt-0.5" />
                    <p>Describe your ideal customer journey (e.g., "A 7-day nurturing sequence for real estate leads with WhatsApp and Email").</p>
                </div>
                <textarea 
                    className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-primary resize-none h-32 mb-4"
                    placeholder="Enter your workflow prompt..."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || !prompt}
                        className="bg-primary text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        Generate
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Playbook Editor ---
const PlaybookEditor = ({ playbook, onSave, onBack }: any) => {
    const [localPlaybook, setLocalPlaybook] = useState(playbook || { name: 'New Playbook', leadType: 'General', steps: [], isActive: true });
    const [refiningStepIndex, setRefiningStepIndex] = useState<number | null>(null);
    
    // Refs for drag and drop
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const variables = ['{{lead_name}}', '{{company}}', '{{email}}', '{{phone}}', '{{location}}', '{{calendar_link}}', '{{portfolio_link}}'];

    const handleVariableClick = (stepIndex: number, variable: string) => {
        const newSteps = [...localPlaybook.steps];
        newSteps[stepIndex].content += (newSteps[stepIndex].content ? ' ' : '') + variable;
        setLocalPlaybook({...localPlaybook, steps: newSteps});
    };

    const getChannelIcon = (channel: string) => {
        switch(channel) {
            case 'whatsapp': return <MessageCircle size={16} className="text-white"/>;
            case 'email': return <Mail size={16} className="text-white"/>;
            case 'voice': return <Phone size={16} className="text-white"/>;
            default: return <ListIcon size={16} className="text-white"/>;
        }
    };

    const getChannelColor = (channel: string) => {
        switch(channel) {
            case 'whatsapp': return 'bg-green-500';
            case 'email': return 'bg-blue-500';
            case 'voice': return 'bg-purple-500';
            default: return 'bg-slate-400';
        }
    };

    const handleAiRefine = async (stepIndex: number) => {
        setRefiningStepIndex(stepIndex);
        const currentContent = localPlaybook.steps[stepIndex].content;
        
        try {
             const apiKey = (window as any).process?.env?.API_KEY;
             if (!apiKey) {
                 await new Promise(resolve => setTimeout(resolve, 1500));
                 const newSteps = [...localPlaybook.steps];
                 newSteps[stepIndex].content = "Refined: " + currentContent; 
                 setLocalPlaybook({...localPlaybook, steps: newSteps});
             } else {
                 const ai = new GoogleGenAI({ apiKey });
                 const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [{
                        parts: [{ text: `Refine this message for a sales playbook. Keep variables like {{lead_name}} intact. Make it professional yet engaging.\n\nMessage: "${currentContent}"` }]
                    }]
                 });
                 if (response.text) {
                     const newSteps = [...localPlaybook.steps];
                     newSteps[stepIndex].content = response.text;
                     setLocalPlaybook({...localPlaybook, steps: newSteps});
                 }
             }
        } catch (e) {
            console.error(e);
        } finally {
            setRefiningStepIndex(null);
        }
    };

    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            dragItem.current = null;
            dragOverItem.current = null;
            return;
        }
        const _steps = [...localPlaybook.steps];
        const draggedItemContent = _steps.splice(dragItem.current, 1)[0];
        _steps.splice(dragOverItem.current, 0, draggedItemContent);
        const reorderedSteps = _steps.map((step, idx) => ({ ...step, order: idx + 1 }));
        setLocalPlaybook({ ...localPlaybook, steps: reorderedSteps });
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={20} className="text-slate-500"/></button>
                    <div>
                        <input 
                            value={localPlaybook.name} 
                            onChange={e => setLocalPlaybook({...localPlaybook, name: e.target.value})}
                            className="text-2xl font-bold bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400 block"
                            placeholder="Playbook Name"
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">TARGET:</span>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{localPlaybook.leadType || 'General'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 uppercase">Status</span>
                        <button 
                            onClick={() => setLocalPlaybook({...localPlaybook, isActive: !localPlaybook.isActive})}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${localPlaybook.isActive ? 'bg-primary' : 'bg-slate-300'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${localPlaybook.isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                    <button onClick={() => onSave(localPlaybook)} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                        <Save size={16} /> Save Changes
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto">
                    <div className="relative pl-12 space-y-12 before:absolute before:left-[22px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
                        {localPlaybook.steps.map((step: any, index: number) => (
                            <div 
                                key={step.id || index}
                                className="relative group transition-transform duration-200"
                                draggable
                                onDragStart={(e) => {
                                    dragItem.current = index;
                                    e.dataTransfer.effectAllowed = "move";
                                    e.currentTarget.style.opacity = '0.4';
                                }}
                                onDragEnter={(e) => {
                                    e.preventDefault();
                                    dragOverItem.current = index;
                                }}
                                onDragOver={(e) => e.preventDefault()}
                                onDragEnd={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                    handleDragSort();
                                }}
                            >
                                <div className={`absolute -left-[46px] top-8 w-10 h-10 rounded-full ${getChannelColor(step.channel)} flex items-center justify-center z-10 shadow-sm border-4 border-slate-50`}>
                                    {getChannelIcon(step.channel)}
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 cursor-move">
                                        <div className="flex items-center gap-4">
                                            <GripVertical size={16} className="text-slate-300" />
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">STEP {index + 1}</span>
                                            <div className="h-4 w-px bg-slate-200"></div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-400"/>
                                                <span className="text-xs font-bold text-slate-500">Wait</span>
                                                <input 
                                                    type="number" 
                                                    className="w-12 text-center bg-white border border-slate-200 rounded px-1 py-0.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary"
                                                    value={step.trigger.value}
                                                    onChange={e => {
                                                        const newSteps = [...localPlaybook.steps];
                                                        newSteps[index].trigger.value = parseInt(e.target.value) || 0;
                                                        setLocalPlaybook({...localPlaybook, steps: newSteps});
                                                    }}
                                                />
                                                <select 
                                                    className="bg-white border border-slate-200 rounded px-1 py-0.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary"
                                                    value={step.trigger.unit}
                                                    onChange={e => {
                                                        const newSteps = [...localPlaybook.steps];
                                                        newSteps[index].trigger.unit = e.target.value;
                                                        setLocalPlaybook({...localPlaybook, steps: newSteps});
                                                    }}
                                                >
                                                    <option value="hours">Hours</option>
                                                    <option value="days">Days</option>
                                                    <option value="minutes">Minutes</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button className="text-slate-300 hover:text-red-500"><Trash2 size={16} onClick={() => {
                                            const newSteps = localPlaybook.steps.filter((_, i) => i !== index);
                                            setLocalPlaybook({...localPlaybook, steps: newSteps});
                                        }}/></button>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <select 
                                                className="text-lg font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer hover:bg-slate-50 rounded px-2 -ml-2 transition-colors"
                                                value={step.channel}
                                                onChange={e => {
                                                    const newSteps = [...localPlaybook.steps];
                                                    newSteps[index].channel = e.target.value;
                                                    setLocalPlaybook({...localPlaybook, steps: newSteps});
                                                }}
                                            >
                                                <option value="whatsapp">Send WhatsApp</option>
                                                <option value="email">Send Email</option>
                                                <option value="voice">AI Voice Call</option>
                                                <option value="internal_task">Internal Task</option>
                                            </select>
                                            <button 
                                                onClick={() => handleAiRefine(index)}
                                                className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                                disabled={refiningStepIndex === index}
                                            >
                                                {refiningStepIndex === index ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                                                AI Refine
                                            </button>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-amber-600 uppercase">CONDITION</span>
                                            <input 
                                                className="bg-transparent border-none focus:outline-none text-xs text-amber-800 w-full placeholder-amber-400"
                                                placeholder="Optional (e.g. 'If email not opened')"
                                                value={step.condition || ''}
                                                onChange={e => {
                                                    const newSteps = [...localPlaybook.steps];
                                                    newSteps[index].condition = e.target.value;
                                                    setLocalPlaybook({...localPlaybook, steps: newSteps});
                                                }}
                                            />
                                        </div>
                                        <textarea 
                                            className="w-full border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 min-h-[120px] resize-y"
                                            value={step.content}
                                            onChange={e => {
                                                const newSteps = [...localPlaybook.steps];
                                                newSteps[index].content = e.target.value;
                                                setLocalPlaybook({...localPlaybook, steps: newSteps});
                                            }}
                                            placeholder="Message content..."
                                        />
                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
                                            {variables.map(v => (
                                                <button 
                                                    key={v}
                                                    onClick={() => handleVariableClick(index, v)}
                                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded text-[10px] font-bold font-mono transition-colors"
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button 
                            onClick={() => setLocalPlaybook({...localPlaybook, steps: [...localPlaybook.steps, { id: `step-${Date.now()}`, order: localPlaybook.steps.length + 1, channel: 'whatsapp', trigger: { type: 'delay', value: 1, unit: 'days' }, content: '' }]})}
                            className="flex items-center gap-2 text-sm font-bold text-slate-400 bg-white border-2 border-dashed border-slate-200 px-6 py-4 rounded-2xl hover:bg-slate-50 hover:border-slate-300 hover:text-slate-600 transition-all w-full justify-center"
                        >
                            <Plus size={18} /> Add Step
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Project Files View ---
const ProjectFilesView = ({ files = [], onUpload }: any) => {
    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-slate-800">Files & Assets</h3>
                <button onClick={onUpload} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                    <Upload size={16} /> Upload File
                </button>
            </div>
            
            {files.length === 0 ? (
                <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                    <Folder size={48} className="mb-4 opacity-50"/>
                    <p className="font-bold">No files uploaded yet</p>
                    <p className="text-sm mt-1">Upload documents, images, or assets here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-4">
                    {files.map((file: any, i: number) => (
                        <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-all cursor-pointer">
                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-3">
                                <FileText size={24} />
                            </div>
                            <span className="text-sm font-bold text-slate-700 truncate w-full">{file.name}</span>
                            <span className="text-xs text-slate-400 mt-1">{file.size} • {file.date}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- BudgetView ---
const getColorForCategory = (cat: string) => {
    const colors: Record<string, string> = {
        'Marketing': '#3b82f6',
        'Sales': '#10b981',
        'Engineering': '#8b5cf6',
        'Design': '#f59e0b',
        'Operations': '#ef4444',
        'HR': '#ec4899',
        'Finance': '#6366f1',
        'General': '#64748b'
    };
    return colors[cat] || '#94a3b8';
};

const BudgetCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
        <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</span>
            <div className={`p-2 rounded-lg bg-slate-50 ${color}`}>
                <Icon size={18} />
            </div>
        </div>
        <div className="text-2xl font-bold text-slate-800">${value.toLocaleString()}</div>
    </div>
);

const BudgetView = ({ project, tasks }: any) => {
    const totalBudget = project.budget?.total || 0;
    const spent = project.budget?.spent || 0;
    const committed = project.budget?.committed || 0;
    const remaining = totalBudget - spent;
    const categoryData = useMemo(() => {
        const data: Record<string, number> = {};
        tasks.forEach((t: any) => {
            const cat = t.list || 'General';
            const amount = t.budget?.agreed || t.budget?.planned || 0;
            data[cat] = (data[cat] || 0) + amount;
        });
        return Object.entries(data)
            .map(([name, value]) => ({ name, value, color: getColorForCategory(name) }))
            .sort((a, b) => b.value - a.value);
    }, [tasks]);
    const totalAllocated = categoryData.reduce((acc, c) => acc + c.value, 0);
    const unallocated = Math.max(0, totalBudget - totalAllocated);
    let currentDeg = 0;
    const pieSegments = categoryData.map(c => {
        const percentage = totalBudget > 0 ? (c.value / totalBudget) * 100 : 0;
        const deg = (percentage / 100) * 360;
        const segment = `${c.color} ${currentDeg}deg ${currentDeg + deg}deg`;
        currentDeg += deg;
        return segment;
    });
    if (unallocated > 0 && totalBudget > 0) {
        pieSegments.push(`#f1f5f9 ${currentDeg}deg 360deg`); 
    }
    const pieStyle = { background: pieSegments.length > 0 ? `conic-gradient(${pieSegments.join(', ')})` : '#f1f5f9' };

    return (
        <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                <Wallet size={20} className="text-slate-400"/> Financial Overview
            </h3>
            <div className="grid grid-cols-4 gap-6 mb-8">
                <BudgetCard title="Total Budget" value={totalBudget} icon={Wallet} color="text-slate-700" />
                <BudgetCard title="Committed" value={committed} icon={FileText} color="text-blue-600" />
                <BudgetCard title="Spent" value={spent} icon={DollarSign} color="text-orange-600" />
                <BudgetCard title="Remaining" value={remaining} icon={TrendingUp} color="text-green-600" />
            </div>
            <div className="grid grid-cols-3 gap-8 flex-1 min-h-0">
                <div className="col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8 w-full text-center">Budget Allocation</h4>
                    <div className="relative w-56 h-56 rounded-full shadow-inner mb-8" style={pieStyle}>
                        <div className="absolute inset-8 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Allocated</span>
                            <span className="text-2xl font-bold text-slate-800">${totalAllocated.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 font-bold mt-1">of ${totalBudget.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="w-full space-y-3 px-4">
                        {categoryData.slice(0, 5).map(c => (
                            <div key={c.name} className="flex justify-between items-center text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: c.color}}></div>
                                    <span className="text-slate-600 font-bold">{c.name}</span>
                                </div>
                                <span className="font-bold text-slate-700">${c.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category Breakdown</h4>
                    </div>
                    <div className="space-y-8">
                        {categoryData.map(c => {
                            const percent = totalBudget > 0 ? (c.value / totalBudget) * 100 : 0;
                            return (
                                <div key={c.name} className="group">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-opacity-10 text-opacity-100`} style={{backgroundColor: `${c.color}20`, color: c.color}}>
                                                <Target size={16} /> 
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{c.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{c.value > 1000 ? `${(c.value/1000).toFixed(1)}k` : c.value} Allocated</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-slate-800">${c.value.toLocaleString()}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{percent.toFixed(1)}% of Total</div>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percent}%`, backgroundColor: c.color }}/>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- AiTaskCreatorModal ---
const AiTaskCreatorModal = ({ isOpen, onClose, onCreate }: any) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = () => {
        if(!prompt) return;
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            onCreate({
                title: "AI Generated Task: " + prompt.substring(0, 20) + "...",
                description: "This task was automatically generated based on the prompt: " + prompt,
                status: 'Todo',
                priority: 'Medium'
            });
            onClose();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-primary font-bold text-lg">
                        <Sparkles size={20} /> AI Task Creator
                    </div>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">What needs to be done?</label>
                    <textarea 
                        className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-primary resize-none h-32"
                        placeholder="E.g., Create a social media plan for next week..."
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                    />
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating || !prompt}
                        className="bg-primary text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        Generate Task
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Helper Components for TasksView ---
const TaskRow = ({ task, onUpdateTask, onAction }: any) => {
    return (
        <tr className="hover:bg-slate-50 border-b border-slate-100 last:border-0 group">
            <td className="px-4 py-3"><div className={`w-8 h-5 rounded-full ${task.aiCoordination ? 'bg-primary' : 'bg-slate-200'} relative cursor-pointer`}><div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${task.aiCoordination ? 'left-4' : 'left-1'}`}></div></div></td>
            <td className="px-4 py-3 font-bold text-slate-700 text-sm">{task.title}</td>
            <td className="px-4 py-3 text-sm text-slate-600">{task.assignee}</td>
            <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-1 rounded ${task.status === 'Done' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{task.status}</span></td>
            <td className="px-4 py-3"><span className={`text-xs font-bold ${task.priority === 'Urgent' ? 'text-red-600' : 'text-slate-500'}`}>{task.priority}</span></td>
            <td className="px-4 py-3 text-sm text-slate-600">{formatDateDisplay(task.dueDate)}</td>
            <td className="px-4 py-3 text-sm text-slate-500">${task.budget?.planned || 0}</td>
            <td className="px-4 py-3 text-sm text-slate-700 font-bold">${task.budget?.agreed || 0}</td>
            <td className="px-4 py-3 text-sm text-green-600">${task.budget?.advance || 0}</td>
            <td className="px-4 py-3 text-sm text-red-500 font-bold">${(task.budget?.agreed || 0) - (task.budget?.advance || 0)}</td>
            <td className="px-4 py-3 text-sm text-slate-600">{formatDateDisplay(task.budget?.paymentDueDate)}</td>
            <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onAction('edit', task)} className="text-slate-400 hover:text-primary"><Pencil size={16}/></button>
                    <button onClick={() => onAction('delete', task)} className="text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                </div>
            </td>
        </tr>
    );
};

const KanbanBoard = ({ tasks }: any) => (
    <div className="flex gap-6 h-full overflow-x-auto pb-4">
        {['Todo', 'In Progress', 'Done'].map(status => (
            <div key={status} className="min-w-[280px] bg-slate-50 rounded-xl p-4 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-700">{status}</h4>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{tasks.filter((t:any) => t.status === status).length}</span>
                </div>
                <div className="space-y-3 overflow-y-auto flex-1">
                    {tasks.filter((t:any) => t.status === status).map((t:any) => (
                        <div key={t.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all">
                            <div className="text-sm font-bold text-slate-800 mb-1">{t.title}</div>
                            <div className="flex justify-between items-center">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${t.priority === 'Urgent' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{t.priority}</span>
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">JD</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const MeetingIntelligenceModal = ({ isOpen, onClose, onSave, contextType }: any) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setTranscript('');
            setResult(null);
            setIsProcessing(false);
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        if (!transcript) return;
        setIsProcessing(true);
        try {
            const apiKey = (window as any).process?.env?.API_KEY;
            if (!apiKey) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                setResult({
                    summary: "This is a simulated summary because no API key was found.",
                    actionItems: ["Review the project plan", "Schedule follow-up meeting"]
                });
                setIsProcessing(false);
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ parts: [{ text: `Analyze transcript. Provide summary and action items.\n\nTranscript:\n${transcript}` }] }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            });
            if (response.text) setResult(JSON.parse(response.text));
        } catch (error) {
            console.error("AI Error:", error);
            alert("Failed to generate summary.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = () => {
        if (!result) return;
        onSave({
            id: `MEET-${Date.now()}`,
            title: title || 'Untitled Meeting',
            date,
            transcript,
            summary: result.summary,
            actionItems: result.actionItems
        });
        onClose();
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Brain size={24} /></div>
                        <div><h2 className="text-xl font-bold text-slate-800">New Meeting Analysis</h2><p className="text-xs text-slate-500 font-medium">Attach to {contextType}</p></div>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="grid grid-cols-3 gap-6 h-full">
                        <div className="col-span-1 space-y-4 flex flex-col">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Meeting Details</label>
                                <input className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:border-indigo-500" placeholder="Meeting Title" value={title} onChange={e => setTitle(e.target.value)} />
                                <input type="date" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Transcript / Notes</label>
                                <textarea className="flex-1 w-full border border-slate-200 rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-indigo-500 resize-none font-mono text-slate-600" placeholder="Paste transcript..." value={transcript} onChange={e => setTranscript(e.target.value)}></textarea>
                            </div>
                            <button onClick={handleGenerate} disabled={isProcessing || !transcript} className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${isProcessing || !transcript ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>
                                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16} />} {isProcessing ? 'Analyzing...' : 'Generate with AI'}
                            </button>
                        </div>
                        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-y-auto">
                            {result ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                    <div><h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><FileText size={16} className="text-indigo-500"/> Executive Summary</h3><div className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{result.summary}</div></div>
                                    <div><h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3"><CheckSquare size={16} className="text-green-500"/> Action Items</h3><ul className="space-y-2">{result.actionItems.map((item: string, i: number) => (<li key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"><div className="mt-0.5 w-4 h-4 rounded border-2 border-slate-300"></div><span className="text-sm text-slate-700 font-medium">{item}</span></li>))}</ul></div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300"><Brain size={48} className="mb-4 opacity-50" /><p className="font-bold text-sm">Ready to analyze</p></div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                    <button onClick={handleSave} disabled={!result} className={`px-6 py-2 rounded-lg font-bold text-sm text-white shadow-lg transition-all ${!result ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>Save Notes</button>
                </div>
            </div>
        </div>
    );
};

// --- Task Detail Panel ---
const TaskDetailPanel = ({ isOpen, onClose, task, onSave, onAddMeeting }: any) => {
    if (!isOpen || !task) return null;
    const [localTask, setLocalTask] = useState(task);
    useEffect(() => setLocalTask(task), [task]);

    // Handlers for subtasks
    const toggleSubtask = (id: string) => {
        const newSubtasks = localTask.subtasks.map((st: any) => 
            st.id === id ? { ...st, completed: !st.completed } : st
        );
        setLocalTask({ ...localTask, subtasks: newSubtasks });
    };

    const addSubtask = () => {
        const newSub = { id: Date.now().toString(), text: 'New subtask', completed: false };
        setLocalTask({ ...localTask, subtasks: [...(localTask.subtasks || []), newSub] });
    };

    return (
        <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-2xl border-l border-slate-200 z-[100] transform transition-transform duration-300 ease-in-out flex flex-col animate-in slide-in-from-right">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                    <h2 className="text-xl font-bold text-slate-800">Task Details</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onSave(localTask)} className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-xs shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">Save</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Header Inputs */}
                <div>
                    <input className="w-full text-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:outline-none mb-4" value={localTask.title} onChange={e => setLocalTask({...localTask, title: e.target.value})} />
                    <div className="flex flex-wrap gap-4">
                        <select className="bg-slate-100 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide cursor-pointer" value={localTask.status} onChange={e => setLocalTask({...localTask, status: e.target.value})}>{['Todo', 'In Progress', 'Done'].map(s => <option key={s} value={s}>{s}</option>)}</select>
                        <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide cursor-pointer" value={localTask.priority} onChange={e => setLocalTask({...localTask, priority: e.target.value})}>{['Low', 'Medium', 'High', 'Urgent'].map(s => <option key={s} value={s}>{s}</option>)}</select>
                        <input type="date" className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide cursor-pointer" value={localTask.dueDate} onChange={e => setLocalTask({...localTask, dueDate: e.target.value})} />
                    </div>
                </div>

                {/* Subtasks */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-800">Subtasks</h3>
                        <button onClick={addSubtask} className="text-xs text-primary font-bold hover:underline">+ Add</button>
                    </div>
                    <div className="space-y-2">
                        {(localTask.subtasks || []).map((st: any) => (
                            <div key={st.id} className="flex items-center gap-3 group">
                                <button onClick={() => toggleSubtask(st.id)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${st.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-slate-400'}`}>
                                    {st.completed && <CheckSquare size={12} />}
                                </button>
                                <input 
                                    className={`flex-1 text-sm bg-transparent border-none focus:outline-none ${st.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                                    value={st.text}
                                    onChange={(e) => {
                                        const newSubtasks = localTask.subtasks.map((s:any) => s.id === st.id ? {...s, text: e.target.value} : s);
                                        setLocalTask({...localTask, subtasks: newSubtasks});
                                    }}
                                />
                                <button onClick={() => setLocalTask({...localTask, subtasks: localTask.subtasks.filter((s:any) => s.id !== st.id)})} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500"><X size={14}/></button>
                            </div>
                        ))}
                        {(!localTask.subtasks || localTask.subtasks.length === 0) && <div className="text-xs text-slate-400 italic">No subtasks</div>}
                    </div>
                </div>

                {/* AI Coordination Section */}
                <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Bot size={18} className="text-indigo-600" />
                            <h3 className="text-sm font-bold text-indigo-900">AI Coordination</h3>
                        </div>
                        <button 
                            onClick={() => setLocalTask({...localTask, aiCoordination: !localTask.aiCoordination})}
                            className={`w-10 h-5 rounded-full p-1 transition-colors ${localTask.aiCoordination ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform ${localTask.aiCoordination ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                    {localTask.aiCoordination && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-indigo-100 cursor-pointer">
                                    <input type="checkbox" checked={localTask.aiChannels?.whatsapp} onChange={e => setLocalTask({...localTask, aiChannels: {...localTask.aiChannels, whatsapp: e.target.checked}})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                    <span className="text-xs font-bold text-slate-700">WhatsApp</span>
                                </label>
                                <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-indigo-100 cursor-pointer">
                                    <input type="checkbox" checked={localTask.aiChannels?.email} onChange={e => setLocalTask({...localTask, aiChannels: {...localTask.aiChannels, email: e.target.checked}})} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                    <span className="text-xs font-bold text-slate-700">Email</span>
                                </label>
                            </div>
                            <div className="bg-white rounded-lg border border-indigo-100 p-3">
                                <div className="text-[10px] font-bold text-indigo-400 uppercase mb-2">Recent AI Actions</div>
                                <div className="space-y-2">
                                    {(localTask.aiHistory || []).map((h: any) => (
                                        <div key={h.id} className="flex gap-3 text-xs">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0"></div>
                                            <div>
                                                <span className="font-bold text-slate-700">{h.action}</span>
                                                <span className="text-slate-400 mx-1">•</span>
                                                <span className="text-slate-500">{new Date(h.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                <p className="text-slate-500 mt-0.5">{h.details}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!localTask.aiHistory || localTask.aiHistory.length === 0) && <div className="text-slate-400 italic">No activity yet</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div><label className="block text-xs font-bold text-slate-400 uppercase mb-2">Description</label><textarea className="w-full min-h-[120px] text-sm text-slate-600 leading-relaxed border border-slate-200 rounded-xl p-4 focus:outline-none focus:border-indigo-500 resize-none" value={localTask.description} onChange={e => setLocalTask({...localTask, description: e.target.value})} placeholder="Add details..." /></div>
                
                {/* Meetings */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Sparkles size={12} className="text-indigo-500" /> Meeting Insights</label>
                        <button onClick={() => onAddMeeting(localTask.id)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"><Plus size={10} /> Add Notes</button>
                    </div>
                    {localTask.meetings && localTask.meetings.length > 0 ? (
                        <div className="space-y-3">{localTask.meetings.map((m: MeetingSummary) => (<div key={m.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4"><div className="flex justify-between items-start mb-2"><h4 className="font-bold text-sm text-slate-800">{m.title}</h4><span className="text-[10px] text-slate-400 font-bold">{formatDateDisplay(m.date)}</span></div><p className="text-xs text-slate-600 mb-3 line-clamp-2">{m.summary}</p></div>))}</div>
                    ) : (
                        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl"><p className="text-xs text-slate-400 font-medium">No meeting insights attached</p></div>
                    )}
                </div>
            </div>
        </div>
    );
}

const NewLeadModal = ({ isOpen, onClose, onSave, lead, playbooks = [] }: any) => {
    const defaultLead = {
        name: '',
        clientType: 'Individual',
        email: '',
        stdCode: '+1',
        phone: '',
        location: '', 
        country: '',
        source: 'Website',
        serviceType: 'Web Development',
        status: 'New',
        budgetRange: '',
        value: 0,
        requirement: '',
        playbookId: '',
        customFields: []
    };

    const [formData, setFormData] = useState(defaultLead);
    const [isRecommending, setIsRecommending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(lead ? { ...defaultLead, ...lead } : defaultLead);
        }
    }, [isOpen, lead]);

    if(!isOpen) return null;

    const handleSubmit = () => {
        if (!formData.name) {
            alert('Lead Name is required');
            return;
        }
        onSave(formData);
    };

    const handleAiRecommend = async () => {
        if (!formData.requirement && !formData.serviceType) {
            alert("Please enter requirements or service type first to get a recommendation.");
            return;
        }
        setIsRecommending(true);
        try {
            const apiKey = (window as any).process?.env?.API_KEY;
            // Filter only active playbooks
            const activePlaybooks = playbooks.filter((p: any) => p.isActive);
            
            if (activePlaybooks.length === 0) {
                 alert("No active playbooks available.");
                 return;
            }

            if (!apiKey) {
                // Mock behavior
                await new Promise(resolve => setTimeout(resolve, 1500));
                // Simple heuristic mock
                const match = activePlaybooks.find((p: any) => 
                    (formData.serviceType && p.name.toLowerCase().includes(formData.serviceType.toLowerCase())) ||
                    (formData.requirement && p.description?.toLowerCase().includes("lead"))
                ) || activePlaybooks[0];
                
                if (match) {
                    setFormData(prev => ({ ...prev, playbookId: match.id }));
                }
            } else {
                const ai = new GoogleGenAI({ apiKey });
                const promptText = `
                    Select the best playbook for this lead.
                    Lead Info: Service=${formData.serviceType}, Req=${formData.requirement}, Budget=${formData.budgetRange}.
                    Available Playbooks: ${JSON.stringify(activePlaybooks.map((p:any) => ({id: p.id, name: p.name, desc: p.description, type: p.leadType})))}.
                    Return JSON with 'playbookId'.
                `;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: [{ parts: [{ text: promptText }] }],
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                playbookId: { type: Type.STRING }
                            }
                        }
                    }
                });
                
                if (response.text) {
                    const result = JSON.parse(response.text);
                    if (result.playbookId) {
                         setFormData(prev => ({ ...prev, playbookId: result.playbookId }));
                    }
                }
            }
        } catch (e) {
            console.error(e);
            alert("Failed to get recommendation");
        } finally {
            setIsRecommending(false);
        }
    };

    const addCustomField = () => {
        setFormData({
            ...formData,
            customFields: [...(formData.customFields || []), { key: '', value: '' }]
        });
    };

    const removeCustomField = (index: number) => {
        const newFields = [...(formData.customFields || [])];
        newFields.splice(index, 1);
        setFormData({ ...formData, customFields: newFields });
    };

    const updateCustomField = (index: number, field: 'key' | 'value', text: string) => {
        const newFields = [...(formData.customFields || [])];
        newFields[index][field] = text;
        setFormData({ ...formData, customFields: newFields });
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase">Lead Details</label>
                            <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-bold">
                                <button onClick={() => setFormData({...formData, clientType: 'Individual'})} className={`px-3 py-1 rounded-md transition-all ${formData.clientType === 'Individual' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>Individual</button>
                                <button onClick={() => setFormData({...formData, clientType: 'Company'})} className={`px-3 py-1 rounded-md transition-all ${formData.clientType === 'Company' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>Company</button>
                             </div>
                        </div>
                        <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="Lead Name" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label><input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary" placeholder="Email Address" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mobile Number</label><div className="flex gap-2"><input value={formData.stdCode} onChange={e => setFormData({...formData, stdCode: e.target.value})} className="w-16 border border-slate-200 rounded-xl px-2 py-2.5 text-sm text-center font-medium focus:outline-none focus:border-primary" placeholder="+1" /><input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary" placeholder="Mobile" /></div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">City</label><input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary" placeholder="City" /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Country</label><input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary" placeholder="Country" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Source</label><select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white">{AVAILABLE_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Service Type</label><select value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white">{AVAILABLE_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white">{LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Approximate Budget Range</label><input value={formData.budgetRange} onChange={e => setFormData({...formData, budgetRange: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary" placeholder="e.g. $5k - $10k" /></div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estimated Value (Numeric)</label><input type="number" value={formData.value} onChange={e => setFormData({...formData, value: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary" placeholder="0" /></div>
                    
                    {/* Playbook Assignment Section */}
                    <div className="pt-4 border-t border-slate-100 mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Zap size={14} className="text-amber-500"/> Assigned Playbook
                            </label>
                            <button 
                                type="button"
                                onClick={handleAiRecommend}
                                disabled={isRecommending}
                                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                            >
                                {isRecommending ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                                {isRecommending ? 'Analyzing...' : 'Auto-Select'}
                            </button>
                        </div>
                        <div className="relative">
                             <select 
                                value={formData.playbookId} 
                                onChange={e => setFormData({...formData, playbookId: e.target.value})}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white appearance-none"
                            >
                                <option value="">-- No Playbook Assigned --</option>
                                {playbooks.map((pb: any) => (
                                    <option key={pb.id} value={pb.id}>
                                        {pb.name} {pb.leadType ? `(${pb.leadType})` : ''} {pb.isActive ? '' : '[Draft]'}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            Assigning a playbook will automatically trigger the defined workflow steps for this lead.
                        </p>
                    </div>

                    {/* Custom Fields Section */}
                    <div className="pt-4 border-t border-slate-100 mt-4">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <ListIcon size={14} className="text-slate-400"/> Custom Fields
                            </label>
                            <button 
                                type="button"
                                onClick={addCustomField}
                                className="text-xs font-bold text-primary bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
                            >
                                <Plus size={12}/> Add Field
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {(formData.customFields || []).map((field: any, index: number) => (
                                <div key={index} className="flex gap-3 items-center">
                                    <input 
                                        placeholder="Field Name" 
                                        value={field.key}
                                        onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                                        className="w-1/3 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                    />
                                    <input 
                                        placeholder="Value" 
                                        value={field.value}
                                        onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                                    />
                                    <button 
                                        onClick={() => removeCustomField(index)}
                                        className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            ))}
                            {(!formData.customFields || formData.customFields.length === 0) && (
                                <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <span className="text-xs text-slate-400">No custom fields added</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Requirement Description</label><textarea value={formData.requirement} onChange={e => setFormData({...formData, requirement: e.target.value})} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary min-h-[100px] resize-none" placeholder="Describe client requirements..." /></div>
                </div>
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleSubmit} className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all">{lead ? 'Save Changes' : 'Add Lead'}</button>
                </div>
             </div>
        </div>
    )
}

const ProjectsView = ({ projects, onSelectProject, onNewProject, tasks, onAction, templates = [], onCreateTemplate, onSaveAsTemplate }: any) => {
    const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
    return (
        <div className="p-8 h-full overflow-y-auto">
            <SectionHeader title="Projects" subtitle="Manage your ongoing initiatives" action={
                <div className="flex gap-2">
                    <button onClick={onCreateTemplate} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                        <Sparkles size={16} /> Create AI Template
                    </button>
                    <div className="relative">
                        <button onClick={() => setIsTemplateMenuOpen(!isTemplateMenuOpen)} className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">
                            <LayoutTemplate size={16} />
                        </button>
                        {isTemplateMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                                <div className="text-[10px] font-bold text-slate-400 px-3 py-2 uppercase bg-slate-50 border-b border-slate-100">Project Templates</div>
                                {templates.map((tpl: any) => (
                                    <button key={tpl.id} onClick={() => { onNewProject(tpl); setIsTemplateMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-blue-50 border-b border-slate-50 last:border-0">
                                        {tpl.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={() => onNewProject()} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                        <Plus size={16}/> New Project
                    </button>
                </div>
            } />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((p: any) => (
                    <div key={p.id} onClick={() => onSelectProject(p.id)} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full relative">
                             <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); onSaveAsTemplate(p); }} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Save as Template">
                                    <Copy size={16} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onAction('delete', p); }} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Project">
                                    <Trash2 size={16} />
                                </button>
                             </div>
                             <h3 className="font-bold text-lg text-slate-800 mb-2">{p.title}</h3><p className="text-sm text-slate-500 mb-6 flex-1 line-clamp-2">{p.description}</p>
                             <div className="mb-6"><div className="flex justify-between text-xs mb-1"><span className="text-slate-400 font-medium">Progress</span><span className="font-bold text-slate-700">{p.progress}%</span></div><div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full rounded-full" style={{width: `${p.progress}%`}} /></div></div>
                    </div>
                ))}
                <button onClick={() => onNewProject()} className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 font-bold hover:border-blue-300 hover:text-blue-600 transition-all min-h-[320px]"><Plus size={28} className="mb-2"/>Create New Project</button>
            </div>
        </div>
    );
};

const NewProjectModal = ({ isOpen, onClose, onCreate, initialData, mode = 'create' }: any) => {
    const defaultData = { 
        title: '', 
        category: 'General', 
        budget: 0, 
        status: 'Planning', 
        riskLevel: 'Low', 
        startDate: new Date().toISOString().split('T')[0], 
        endDate: '', 
        clientType: 'Individual', 
        clientName: '', 
        companyName: '', 
        clientEmail: '', 
        clientStdCode: '+1', 
        clientPhone: '', 
        description: '', 
        tasks: [] 
    };
    const [formData, setFormData] = useState(defaultData);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => { 
        if (isOpen) {
            setFormData(initialData ? { ...defaultData, ...initialData } : defaultData); 
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleAction = async () => {
        if (mode === 'template') {
            setIsGenerating(true);
            await onCreate(formData);
            setIsGenerating(false);
        } else {
            onCreate(formData);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {mode === 'template' && <Sparkles size={20} className="text-indigo-500" />}
                        {mode === 'template' ? 'New Project Template' : (initialData ? 'Create from Template' : 'New Project')}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500"/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {mode === 'template' && (
                        <div className="bg-indigo-50 p-4 rounded-xl text-indigo-800 text-sm flex items-start gap-3">
                            <Lightbulb size={18} className="shrink-0 mt-0.5" />
                            <p>Describe the typical project structure. AI will generate tasks, budget estimates, and risk assessments automatically.</p>
                        </div>
                    )}
                    {/* Project Title */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Project Title</label>
                        <input 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})} 
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" 
                            placeholder={mode === 'template' ? "Template Name (e.g. Mobile App Launch)" : "Project Name"} 
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
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white appearance-none"
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

                    {/* Status & Risk Level */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Status</label>
                            <select 
                                value={formData.status} 
                                onChange={e => setFormData({...formData, status: e.target.value})} 
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white appearance-none"
                            >
                                <option>Planning</option>
                                <option>Execution</option>
                                <option>On Hold</option>
                                <option>Completed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Risk Level</label>
                            <select 
                                value={formData.riskLevel} 
                                onChange={e => setFormData({...formData, riskLevel: e.target.value})} 
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white appearance-none"
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                    </div>

                    {/* Start & End Date */}
                    {mode !== 'template' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Start Date</label>
                                <input 
                                    type="date"
                                    value={formData.startDate} 
                                    onChange={e => setFormData({...formData, startDate: e.target.value})} 
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">End Date</label>
                                <input 
                                    type="date"
                                    value={formData.endDate} 
                                    onChange={e => setFormData({...formData, endDate: e.target.value})} 
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary" 
                                />
                            </div>
                        </div>
                    )}

                    {/* Client Details Section */}
                    {mode !== 'template' && (
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
                            
                            <div className="space-y-4">
                                <input 
                                    value={formData.clientName} 
                                    onChange={e => setFormData({...formData, clientName: e.target.value})} 
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary" 
                                    placeholder={formData.clientType === 'Company' ? "Company Name" : "Client Name"} 
                                />
                                
                                <div className="flex gap-4">
                                    <input 
                                        value={formData.clientEmail} 
                                        onChange={e => setFormData({...formData, clientEmail: e.target.value})} 
                                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary" 
                                        placeholder="Email Address" 
                                    />
                                    <div className="flex gap-2 w-1/2">
                                        <input 
                                            value={formData.clientStdCode} 
                                            onChange={e => setFormData({...formData, clientStdCode: e.target.value})} 
                                            className="w-16 border border-slate-200 rounded-xl px-2 py-2.5 text-sm text-center font-medium focus:outline-none focus:border-primary" 
                                            placeholder="+1" 
                                        />
                                        <input 
                                            value={formData.clientPhone} 
                                            onChange={e => setFormData({...formData, clientPhone: e.target.value})} 
                                            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary" 
                                            placeholder="Mobile Number" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary min-h-[100px] resize-none" 
                            placeholder={mode === 'template' ? "Describe the standard tasks and goals for this template..." : "Describe the project goal..."} 
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                    <button onClick={onClose} disabled={isGenerating} className="px-5 py-2.5 text-slate-500 font-bold text-sm hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                    <button 
                        onClick={handleAction} 
                        disabled={isGenerating}
                        className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                        {isGenerating && <Loader2 size={16} className="animate-spin" />}
                        {mode === 'template' ? (isGenerating ? 'Generating...' : 'Generate Template') : (initialData ? 'Create Project' : 'Create Project')}
                    </button>
                </div>
            </div>
        </div>
    );
}

const TasksView = ({ tasks, onUpdateTask, onAction, onAiCreate, hideHeader = false }: any) => {
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [filter, setFilter] = useState('All');

    const filteredTasks = tasks.filter((t: any) => {
        if (filter === 'All') return true;
        return t.status === filter;
    });

    return (
        <div className={`h-full flex flex-col ${!hideHeader ? 'p-8' : ''}`}>
            {!hideHeader && (
                <SectionHeader title="Tasks" subtitle="Manage your daily activities" action={
                    <div className="flex gap-2">
                         <button onClick={onAiCreate} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                            <Sparkles size={16} /> AI Create
                        </button>
                        <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400'}`}><ListIcon size={16}/></button>
                            <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-800' : 'text-slate-400'}`}><KanbanIcon size={16}/></button>
                        </div>
                        <button onClick={() => onAction('create', {})} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                            <Plus size={16}/> New Task
                        </button>
                    </div>
                } />
            )}
            
            {viewMode === 'list' ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex gap-4">
                        {['All', 'Todo', 'In Progress', 'Done'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`text-sm font-bold px-3 py-1 rounded-lg transition-colors ${filter === f ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase w-12">AI</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Title</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Assignee</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Status</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Priority</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Due Date</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Planned</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Agreed</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Advance</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Pending</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase">Pay Due</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map((task: any) => (
                                    <TaskRow key={task.id} task={task} onUpdateTask={onUpdateTask} onAction={onAction} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <KanbanBoard tasks={filteredTasks} />
            )}
        </div>
    );
};

const ProjectDetailView = ({ project, tasks, onBack, onUpdateTask, onAction, onAddMeeting }: any) => {
    const [activeTab, setActiveTab] = useState('overview');
    const projectTasks = tasks.filter((t: any) => t.projectId === project.id);

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="border-b border-slate-200 px-8 py-6 flex justify-between items-center bg-white">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={20} className="text-slate-500"/></button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            {project.title} 
                            <span className={`text-sm px-3 py-1 rounded-full border ${project.status === 'Execution' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{project.status}</span>
                        </h1>
                    </div>
                </div>
                <div className="flex gap-2">
                     <button onClick={() => onAddMeeting(project.id)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100">
                        <Brain size={16}/> Meeting Notes
                    </button>
                    <button onClick={() => onAction('create', { projectId: project.id })} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20">
                        <Plus size={16}/> Add Task
                    </button>
                </div>
            </div>
            <div className="px-8 border-b border-slate-200 flex gap-8 overflow-x-auto">
                {['Overview', 'Tasks', 'Budget', 'Files', 'Invoices', 'Meetings'].map((tab) => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.toLowerCase() ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-3 gap-8">
                        <div className="col-span-2 space-y-8">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-lg text-slate-800 mb-4">Description</h3>
                                <p className="text-slate-600 leading-relaxed">{project.description}</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-lg text-slate-800 mb-4">Recent Activity</h3>
                                <div className="space-y-4">
                                    {project.meetings?.map((m: any) => (
                                        <div key={m.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Brain size={16}/></div>
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-800">{m.title}</h4>
                                                <p className="text-xs text-slate-500 mb-2">{m.date}</p>
                                                <p className="text-sm text-slate-600">{m.summary}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {projectTasks.slice(0, 3).map((t: any) => (
                                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100">
                                             <div className={`w-2 h-2 rounded-full ${t.status === 'Done' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                             <span className="text-sm font-medium text-slate-700">{t.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-xs text-slate-400 uppercase mb-4">Client Details</h3>
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-lg">
                                        {(project.clientName || project.companyName || 'C')[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{project.clientName || project.companyName}</div>
                                        <div className="text-xs text-slate-500">{project.clientEmail}</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm"><span className="text-slate-500">Phone</span><span className="font-medium text-slate-700">{project.clientPhone}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-slate-500">Type</span><span className="font-medium text-slate-700">{project.clientType}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'tasks' && <TasksView tasks={projectTasks} onUpdateTask={onUpdateTask} onAction={onAction} hideHeader={true} />}
                {activeTab === 'budget' && <BudgetView project={project} tasks={projectTasks} />}
                {activeTab === 'files' && <ProjectFilesView files={[]} onUpload={() => {}} />}
                {activeTab === 'invoices' && (
                    <div className="text-center py-20 text-slate-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-50"/>
                        <p className="font-bold">No Invoices</p>
                        <p className="text-sm">Create an invoice to start tracking payments.</p>
                    </div>
                )}
                {activeTab === 'meetings' && (
                    <div className="space-y-4">
                        {project.meetings && project.meetings.length > 0 ? project.meetings.map((m: any) => (
                             <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-slate-800">{m.title}</h3>
                                    <span className="text-xs font-bold text-slate-500">{formatDateDisplay(m.date)}</span>
                                </div>
                                <p className="text-slate-600 mb-4">{m.summary}</p>
                                <div className="bg-slate-50 p-4 rounded-xl">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Action Items</h4>
                                    <ul className="list-disc list-inside text-sm text-slate-700">
                                        {m.actionItems.map((item: string, i: number) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                             </div>
                        )) : (
                            <div className="text-center py-20 text-slate-400">
                                <Brain size={48} className="mx-auto mb-4 opacity-50"/>
                                <p className="font-bold">No Meeting Notes</p>
                                <p className="text-sm">Record or transcribe meetings to see insights here.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const DashboardView = ({ projects, tasks, leads }: any) => {
    return (
        <div className="p-8 h-full overflow-y-auto">
            <SectionHeader title="Dashboard" subtitle="Overview of your business performance" />
            <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Briefcase size={24}/></div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+12%</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">{projects.length}</div>
                    <div className="text-sm font-medium text-slate-500">Active Projects</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><CheckSquare size={24}/></div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+5%</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">{tasks.filter((t:any) => t.status !== 'Done').length}</div>
                    <div className="text-sm font-medium text-slate-500">Pending Tasks</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Users size={24}/></div>
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">-2%</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">{leads.length}</div>
                    <div className="text-sm font-medium text-slate-500">New Leads</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl"><DollarSign size={24}/></div>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+8%</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">$45k</div>
                    <div className="text-sm font-medium text-slate-500">Revenue (MoM)</div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800">Recent Projects</h3>
                        <button className="text-sm font-bold text-primary hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                        {projects.slice(0, 4).map((p: any) => (
                            <div key={p.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                    {p.title[0]}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800">{p.title}</div>
                                    <div className="text-xs text-slate-500">{p.clientName || 'Internal'}</div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${p.status === 'Execution' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800">Urgent Tasks</h3>
                        <button className="text-sm font-bold text-primary hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                        {tasks.filter((t:any) => t.priority === 'Urgent' && t.status !== 'Done').slice(0, 4).map((t: any) => (
                            <div key={t.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <div className="mt-1 w-4 h-4 rounded border-2 border-red-300 bg-white"></div>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{t.title}</div>
                                    <div className="text-xs text-red-600 font-medium mt-1">Due {formatDateDisplay(t.dueDate)}</div>
                                </div>
                            </div>
                        ))}
                        {tasks.filter((t:any) => t.priority === 'Urgent' && t.status !== 'Done').length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm">No urgent tasks</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const LeadsView = ({ leads, playbooks, onAddLead, onAction, onBulkUpdate, onSave }: any) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [serviceFilter, setServiceFilter] = useState('All');

    const filteredLeads = leads.filter((lead: any) => {
        const matchesSearch = (lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                               lead.email?.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
        const matchesService = serviceFilter === 'All' || lead.serviceType === serviceFilter;
        return matchesSearch && matchesStatus && matchesService;
    });

    return (
        <div className="p-8 h-full overflow-y-auto">
             <SectionHeader title="Leads & CRM" subtitle="Track potential clients and deals" action={
                <button onClick={onAddLead} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                    <Plus size={16}/> Add Lead
                </button>
            } />
            
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search leads..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <select 
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-primary cursor-pointer hover:border-slate-300 transition-colors"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select 
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-primary cursor-pointer hover:border-slate-300 transition-colors"
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                    >
                        <option value="All">All Services</option>
                        {AVAILABLE_SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Contact</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Service</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Value</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">Playbook</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeads.map((lead: any) => {
                             const playbook = playbooks.find((p: any) => p.id === lead.playbookId);
                             return (
                                <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{lead.name}</div>
                                        <div className="text-xs text-slate-500">{lead.company}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        <div>{lead.email}</div>
                                        <div className="text-xs text-slate-400">{lead.stdCode} {lead.phone}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${lead.status === 'Won' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{lead.serviceType}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-700">${lead.value?.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        {playbook ? (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                <Zap size={12}/> {playbook.name}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">None</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onAction('edit', lead)} className="p-2 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100"><Pencil size={16}/></button>
                                            <button onClick={() => onAction('delete', lead)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                             );
                        })}
                        {filteredLeads.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                                    No leads found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PlaybooksView = ({ playbooks, onEditPlaybook, onAiGenerate }: any) => {
    return (
        <div className="p-8 h-full overflow-y-auto">
            <SectionHeader title="Playbooks" subtitle="Automated workflows and sequences" action={
                <div className="flex gap-2">
                    <button onClick={onAiGenerate} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                        <Sparkles size={16} /> AI Generator
                    </button>
                    <button onClick={() => onEditPlaybook({})} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                        <Plus size={16}/> New Playbook
                    </button>
                </div>
            } />
            <div className="grid grid-cols-3 gap-6">
                {playbooks.map((pb: any) => (
                    <div key={pb.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group" onClick={() => onEditPlaybook(pb)}>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100">
                             <Pencil size={16} className="text-slate-400 hover:text-primary" />
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <div className={`p-2 rounded-lg ${pb.isActive ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Zap size={20} />
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${pb.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{pb.isActive ? 'Active' : 'Draft'}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 mb-1">{pb.name}</h3>
                        <p className="text-xs text-slate-500 mb-4 line-clamp-2">{pb.description}</p>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase pt-4 border-t border-slate-50">
                            <span>{pb.steps.length} Steps</span>
                            <span>{pb.activeLeadsCount} Active Leads</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
type ViewState = 'dashboard' | 'projects' | 'leads' | 'contacts' | 'automation' | 'settings' | 'tasks' | 'playbooks';

const App = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [playbooks, setPlaybooks] = useState<Playbook[]>(MOCK_PLAYBOOKS);
  const [projectTemplates, setProjectTemplates] = useState<any[]>(MOCK_PROJECT_TEMPLATES);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectInitialData, setNewProjectInitialData] = useState<any>(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isAiTaskCreatorOpen, setIsAiTaskCreatorOpen] = useState(false);
  const [meetingModal, setMeetingModal] = useState<{ isOpen: boolean, contextType: 'project' | 'task', contextId: string } | null>(null);
  const [isPlaybookGeneratorOpen, setIsPlaybookGeneratorOpen] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  const [undoState, setUndoState] = useState<{ type: 'task' | 'project' | 'lead', item: any, timeLeft: number } | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'template'>('create');
  const undoTimerRef = useRef<number | null>(null);

  const executeDelete = (type: 'task' | 'project' | 'lead', item: any) => {
      if (undoTimerRef.current) { clearInterval(undoTimerRef.current); setUndoState(null); }
      if (type === 'task') { setTasks(prev => prev.filter(t => t.id !== item.id)); if (editingTask?.id === item.id) setEditingTask(null); }
      else if (type === 'project') { setProjects(prev => prev.filter(p => p.id !== item.id)); if (selectedProjectId === item.id) setSelectedProjectId(null); }
      else if (type === 'lead') { setLeads(prev => prev.filter(l => l.id !== item.id)); if (editingLead?.id === item.id) setEditingLead(null); }
      setUndoState({ type, item, timeLeft: 10 });
      undoTimerRef.current = setInterval(() => { setUndoState(prev => { if (!prev || prev.timeLeft <= 1) { clearInterval(undoTimerRef.current!); return null; } return { ...prev, timeLeft: prev.timeLeft - 1 }; }); }, 1000);
  };

  const handleUndo = () => {
      if (!undoState) return;
      if (undoState.type === 'task') setTasks(prev => [...prev, undoState.item]);
      else if (undoState.type === 'project') setProjects(prev => [...prev, undoState.item]);
      else if (undoState.type === 'lead') setLeads(prev => [...prev, undoState.item]);
      if (undoTimerRef.current) clearInterval(undoTimerRef.current);
      setUndoState(null);
  };

  const handleUpdateTask = (updatedTask: Task) => { setTasks(prev => { const exists = prev.find(t => t.id === updatedTask.id); return exists ? prev.map(t => t.id === updatedTask.id ? updatedTask : t) : [...prev, updatedTask]; }); if (editingTask && editingTask.id === updatedTask.id) setEditingTask(updatedTask); };
  
  const handleCreateProject = (data: any) => { 
    const newProjectId = `PROJ-${Date.now()}`;
    const newProject = { ...data, id: newProjectId, progress: 0, budget: { total: data.budget, committed: 0, spent: 0 }, meetings: [] };
    
    // If the template has tasks, instantiate them
    if (data.tasks && data.tasks.length > 0) {
        const newTasks = data.tasks.map((t: any, idx: number) => ({
            ...t,
            id: `TASK-${Date.now()}-${idx}`,
            projectId: newProjectId,
            status: t.status || 'Todo',
            priority: t.priority || 'Medium',
            assignee: 'Unassigned',
            dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], // Default 1 week out
            budget: { planned: 0, agreed: 0, advance: 0, status: 'None' },
            subtasks: t.subtasks || []
        }));
        setTasks(prev => [...prev, ...newTasks]);
    }
    
    setProjects(prev => [newProject, ...prev]); 
    setIsNewProjectModalOpen(false); 
    setNewProjectInitialData(null); 
  };

  const handleCreateTemplateWithAI = async (formData: any) => {
    const apiKey = (window as any).process?.env?.API_KEY;
    if (!apiKey) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Fallback Mock Logic
        const newTemplate = {
            id: `PTPL-${Date.now()}`,
            ...formData,
            tasks: [
                { title: `Initial Setup for ${formData.title}`, priority: 'High', status: 'Todo', description: 'Setup environment' },
                { title: 'Project Planning', priority: 'High', status: 'Todo', description: 'Define scope and milestones' }
            ]
        };
        setProjectTemplates(prev => [...prev, newTemplate]);
        setIsNewProjectModalOpen(false);
        setModalMode('create');
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Create a project template for a "${formData.title}" in the "${formData.category}" category. 
        Description: "${formData.description}".
        Return a JSON object with:
        - tasks: array of objects { title, priority (Low/Medium/High/Urgent), status (Todo), description }
        - budget: number (estimated total budget based on complexity, assume average B2B project rates)
        - riskLevel: 'Low' | 'Medium' | 'High'
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
        });

        if (response.text) {
            const aiData = JSON.parse(response.text);
            const newTemplate = {
                id: `PTPL-${Date.now()}`,
                ...formData,
                tasks: aiData.tasks || [],
                budget: aiData.budget || formData.budget,
                riskLevel: aiData.riskLevel || formData.riskLevel
            };
            setProjectTemplates(prev => [...prev, newTemplate]);
        }
    } catch (e) {
        console.error("AI Template Error", e);
        alert("Failed to generate template via AI.");
    } finally {
        setIsNewProjectModalOpen(false);
        setModalMode('create');
    }
  };

  const handleSaveAsTemplate = (project: Project) => {
    // Clone project structure as template
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const newTemplate = {
        id: `PTPL-${Date.now()}`,
        title: `${project.title} (Template)`,
        category: project.category,
        description: project.description,
        budget: project.budget.total,
        riskLevel: project.riskLevel,
        tasks: projectTasks.map(t => ({
            title: t.title,
            priority: t.priority,
            status: 'Todo', // Reset status
            description: t.description,
            subtasks: t.subtasks
        }))
    };
    setProjectTemplates(prev => [...prev, newTemplate]);
  };

  const handleCreateLead = (leadData: any) => { if (editingLead) { setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...editingLead, ...leadData } : l)); setEditingLead(null); } else { setLeads(prev => [{ ...leadData, id: `LEAD-${Date.now()}`, lastContact: new Date().toISOString().split('T')[0], probability: 20 }, ...prev]); } setIsNewLeadModalOpen(false); };
  const handleTaskAction = (action: string, data: any) => { if (action === 'create') { handleUpdateTask({ ...data, id: data.id || `TASK-${Date.now()}`, projectId: data.projectId || 'GLOBAL' }); if(!data.id) setEditingTask({ ...data, id: `TASK-${Date.now()}`, projectId: data.projectId || 'GLOBAL' }); } else if (action === 'edit') setEditingTask(data); else if (action === 'delete') setConfirmModal({ isOpen: true, title: "Delete Task?", message: "Are you sure?", onConfirm: () => executeDelete('task', data) }); else if (action === 'ai-create') setIsAiTaskCreatorOpen(true); };
  const handleLeadAction = (action: string, data: any) => { if (action === 'delete') setConfirmModal({ isOpen: true, title: "Delete Lead?", message: "Are you sure?", onConfirm: () => executeDelete('lead', data) }); if (action === 'edit') { setEditingLead(data); setIsNewLeadModalOpen(true); } };
  
  const handleBulkLeadUpdate = (ids: string[], updates: any) => {
     setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, ...updates } : l));
  };

  const handleSaveData = async () => {
      // Mock global save function
      return new Promise(resolve => setTimeout(resolve, 800));
  };

  const renderContent = () => {
    if (selectedProjectId) { const project = projects.find(p => p.id === selectedProjectId); return project ? <ProjectDetailView project={project} tasks={tasks} onBack={() => setSelectedProjectId(null)} onUpdateTask={handleUpdateTask} onAction={handleTaskAction} onAddMeeting={(pid: string) => setMeetingModal({ isOpen: true, contextType: 'project', contextId: pid })} /> : <div>Project not found</div>; }
    if (editingPlaybook) return <PlaybookEditor playbook={editingPlaybook} onSave={(updated: any) => { if (updated.id) setPlaybooks(prev => prev.map(pb => pb.id === updated.id ? updated : pb)); else setPlaybooks(prev => [...prev, { ...updated, id: `PB-${Date.now()}` }]); setEditingPlaybook(null); }} onBack={() => setEditingPlaybook(null)} />;
    switch (currentView) {
      case 'dashboard': return <DashboardView projects={projects} tasks={tasks} leads={leads} />;
      case 'tasks': return <TasksView tasks={tasks} onUpdateTask={handleUpdateTask} onAction={handleTaskAction} onAiCreate={() => setIsAiTaskCreatorOpen(true)} />;
      case 'projects': return <ProjectsView projects={projects} onSelectProject={setSelectedProjectId} onNewProject={(t: any) => { setModalMode('create'); setNewProjectInitialData(t || null); setIsNewProjectModalOpen(true); }} onCreateTemplate={() => { setModalMode('template'); setNewProjectInitialData(null); setIsNewProjectModalOpen(true); }} onSaveAsTemplate={handleSaveAsTemplate} tasks={tasks} onAction={(a:string, d:any) => { if(a==='delete') setConfirmModal({ isOpen: true, title: "Delete Project?", message: "Are you sure?", onConfirm: () => executeDelete('project', d) }) }} templates={projectTemplates} />;
      case 'leads': return <LeadsView leads={leads} playbooks={playbooks} onAddLead={() => setIsNewLeadModalOpen(true)} onAction={handleLeadAction} onBulkUpdate={handleBulkLeadUpdate} onSave={handleSaveData} />;
      case 'playbooks': return <PlaybooksView playbooks={playbooks} onEditPlaybook={setEditingPlaybook} onAiGenerate={() => setIsPlaybookGeneratorOpen(true)} />;
      default: return <div>Coming Soon</div>;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans">
      <Sidebar activeView={currentView} onNavigate={(view: ViewState) => { setCurrentView(view); setSelectedProjectId(null); }} />
      <main className="flex-1 overflow-hidden relative">
        {renderContent()}
        <NewProjectModal 
            isOpen={isNewProjectModalOpen} 
            onClose={() => { setIsNewProjectModalOpen(false); setNewProjectInitialData(null); setModalMode('create'); }} 
            onCreate={modalMode === 'template' ? handleCreateTemplateWithAI : handleCreateProject} 
            initialData={newProjectInitialData} 
            mode={modalMode}
        />
        <NewLeadModal isOpen={isNewLeadModalOpen} onClose={() => { setIsNewLeadModalOpen(false); setEditingLead(null); }} onSave={handleCreateLead} lead={editingLead} playbooks={playbooks} />
        <TaskDetailPanel isOpen={!!editingTask} onClose={() => setEditingTask(null)} task={editingTask} onSave={(u: Task) => { handleUpdateTask(u); setEditingTask(null); }} onAddMeeting={(tid: string) => setMeetingModal({ isOpen: true, contextType: 'task', contextId: tid })} />
        <MeetingIntelligenceModal isOpen={meetingModal?.isOpen} onClose={() => setMeetingModal(null)} onSave={(m:any) => { /* simplified save logic */ setMeetingModal(null); }} contextType={meetingModal?.contextType} />
        <AiTaskCreatorModal isOpen={isAiTaskCreatorOpen} onClose={() => setIsAiTaskCreatorOpen(false)} onCreate={(t:any) => handleTaskAction('create', { ...t, projectId: selectedProjectId || 'GLOBAL' })} />
        <PlaybookGeneratorModal isOpen={isPlaybookGeneratorOpen} onClose={() => setIsPlaybookGeneratorOpen(false)} onGenerate={(g: any) => setEditingPlaybook(g)} />
        <ConfirmationModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={confirmModal?.onConfirm || (() => {})} title={confirmModal?.title} message={confirmModal?.message} isDangerous={true} />
        <UndoToast isVisible={!!undoState} message={`${undoState?.type} deleted`} timeLeft={undoState?.timeLeft || 0} onUndo={handleUndo} />
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);