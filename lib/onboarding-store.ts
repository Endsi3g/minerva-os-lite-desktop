'use client';

// Safe localStorage wrapper to avoid SSR errors
const getStorageItem = (key: string, defaultValue: string): string => {
  if (typeof window === 'undefined') return defaultValue;
  return localStorage.getItem(key) || defaultValue;
};

const setStorageItem = (key: string, value: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event('minerva_store_update'));
  }
};

export interface OnboardingTask {
  id: string;
  name: string;
  pts: number;
  category: 'chat' | 'workspace';
  href: string;
}

export const onboardingTasks: OnboardingTask[] = [
  { id: 'send_first_msg', name: 'Envoyer votre premier message IA', pts: 10, category: 'chat', href: '/chat' },
  { id: 'upload_doc', name: 'Téléverser un document dans la bibliothèque', pts: 15, category: 'chat', href: '/library' },
  { id: 'web_search', name: 'Effectuer une recherche web avec l\'IA', pts: 15, category: 'chat', href: '/chat' },
  { id: 'first_prospect', name: 'Prospecter 5 commerces locaux', pts: 20, category: 'chat', href: '/prospecting' },

  // Set-up workspace tasks
  { id: 'setup_profile', name: 'Configurer votre profil', pts: 10, category: 'workspace', href: '/settings' },
  { id: 'setup_integrations', name: 'Connecter une intégration', pts: 15, category: 'workspace', href: '/integrations' },
  { id: 'setup_keys', name: 'Configurer vos clés API', pts: 20, category: 'workspace', href: '/settings' },
  { id: 'invite_member', name: 'Inviter un membre d\'équipe', pts: 25, category: 'workspace', href: '/team/invite' },
];

export const getOnboardingState = (): string[] => {
  const completed = getStorageItem('minerva_completed_tasks', '[]');
  try {
    return JSON.parse(completed) as string[];
  } catch {
    return [];
  }
};

export const toggleOnboardingTask = (taskId: string) => {
  const completed = getOnboardingState();
  const index = completed.indexOf(taskId);
  if (index > -1) {
    completed.splice(index, 1);
  } else {
    completed.push(taskId);
  }
  setStorageItem('minerva_completed_tasks', JSON.stringify(completed));
};

export const getOnboardingProgress = () => {
  const completed = getOnboardingState();
  
  let score = 0;
  completed.forEach(id => {
    const task = onboardingTasks.find(t => t.id === id);
    if (task) score += task.pts;
  });
  
  const totalTasks = onboardingTasks.length;
  const percent = completed.length === 0 ? 0 : Math.round((completed.length / totalTasks) * 100);
  return { percent, score };
};

// Folders store
export const getFolders = (): string[] => {
  const folders = getStorageItem('minerva_folders', JSON.stringify(['ASMobbin-Onboarding-Research']));
  try {
    return JSON.parse(folders) as string[];
  } catch {
    return ['ASMobbin-Onboarding-Research'];
  }
};

export const addFolder = (name: string) => {
  const folders = getFolders();
  if (!folders.includes(name)) {
    folders.push(name);
    setStorageItem('minerva_folders', JSON.stringify(folders));
  }
};

// Projects store
export const getProjects = (): string[] => {
  const projects = getStorageItem('minerva_projects', JSON.stringify([]));
  try {
    return JSON.parse(projects) as string[];
  } catch {
    return [];
  }
};

export const addProject = (name: string) => {
  const projects = getProjects();
  if (!projects.includes(name)) {
    projects.push(name);
    setStorageItem('minerva_projects', JSON.stringify(projects));
  }
};

// Integrations store
export const getConnectedIntegrations = (): string[] => {
  const defaultIntegrations = ['google-calendar', 'demo-website-1', 'demo-website-2'];
  const connected = getStorageItem('minerva_connected_integrations', JSON.stringify(defaultIntegrations));
  try {
    return JSON.parse(connected) as string[];
  } catch {
    return defaultIntegrations;
  }
};

export const connectIntegration = (id: string) => {
  const connected = getConnectedIntegrations();
  if (!connected.includes(id)) {
    connected.push(id);
    setStorageItem('minerva_connected_integrations', JSON.stringify(connected));
  }
};

export const disconnectIntegration = (id: string) => {
  const connected = getConnectedIntegrations().filter((existingId) => existingId !== id);
  setStorageItem('minerva_connected_integrations', JSON.stringify(connected));
};

export interface ImportedIntegration {
  id: string;
  name: string;
  description: string;
  category: string;
  authMethod: 'none' | 'key' | 'oauth';
}

export const getImportedIntegrations = (): ImportedIntegration[] => {
  const stored = getStorageItem('minerva_imported_integrations', '[]');
  try {
    return JSON.parse(stored) as ImportedIntegration[];
  } catch {
    return [];
  }
};

export const addImportedIntegration = (integration: ImportedIntegration) => {
  const imported = getImportedIntegrations().filter((existing) => existing.id !== integration.id);
  imported.push(integration);
  setStorageItem('minerva_imported_integrations', JSON.stringify(imported));
  connectIntegration(integration.id);
};

// Agents store
export interface AgentInputField {
  id: string;
  name: string;
  type: 'text' | 'multiline' | 'number' | 'select' | 'file' | 'email' | 'checkbox' | 'date';
  description?: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  iconType: 'minerva' | 'gradient' | 'black';
  owner: string;
  chatsCount: string;
  lastUsed: string;
  instructions?: string;
  inputType?: 'prompt' | 'form';
  inputFields?: AgentInputField[];
  conversationStarters?: string[];
  knowledgeFiles?: { name: string; size: number; type: string }[];
  actions?: { id: string; enabled: boolean }[];
  model?: string;
  creativity?: number;
  labels?: string[];
  avatarEmoji?: string;
  avatarBase64?: string;
}

export const getAgents = (): Agent[] => {
  const defaultAgents: Agent[] = [
    {
      id: 'tableau-insight',
      name: 'Tableau Insight Explorer',
      description: 'Your Tableau companion for data visualization and business intelligence.',
      iconType: 'minerva',
      owner: 'Moi',
      chatsCount: '<10',
      lastUsed: 'Today, 9:18 PM'
    },
    {
      id: 'health-assistant',
      name: 'Health Assistant',
      description: 'Turns ASMobbin onboarding research into structured outputs such as summaries,...',
      iconType: 'gradient',
      owner: 'Moi',
      chatsCount: '<10',
      lastUsed: 'Today, 9:03 PM'
    },
    {
      id: 'asmobbin-agent',
      name: 'ASMobbin Agent',
      description: 'Analyzes ASMobbin Health App onboarding research, summarizes interview findings,...',
      iconType: 'black',
      owner: 'Moi',
      chatsCount: '<10',
      lastUsed: 'Today, 8:37 PM'
    }
  ];
  
  const agents = getStorageItem('minerva_agents', JSON.stringify(defaultAgents));
  try {
    return JSON.parse(agents) as Agent[];
  } catch {
    return defaultAgents;
  }
};

export const addAgent = (agent: Omit<Agent, 'id' | 'owner' | 'chatsCount' | 'lastUsed'>, ownerName?: string) => {
  const agents = getAgents();
  const newAgent: Agent = {
    ...agent,
    id: 'agent-' + Date.now(),
    owner: ownerName || 'Moi',
    chatsCount: '<10',
    lastUsed: 'Just now'
  };
  agents.push(newAgent);
  setStorageItem('minerva_agents', JSON.stringify(agents));
};

export const deleteAgent = (id: string) => {
  const agents = getAgents();
  const filtered = agents.filter(a => a.id !== id);
  setStorageItem('minerva_agents', JSON.stringify(filtered));
};

export const updateAgent = (id: string, updates: Partial<Agent>) => {
  const agents = getAgents();
  const idx = agents.findIndex(a => a.id === id);
  if (idx !== -1) {
    agents[idx] = { ...agents[idx], ...updates };
    setStorageItem('minerva_agents', JSON.stringify(agents));
  }
};
