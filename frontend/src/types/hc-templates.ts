// ===== TEMPLATE SCHEMA TYPES =====

export type NodeType =
  | 'decision'
  | 'step'
  | 'text'
  | 'computed'
  | 'checklist'
  | 'review';

export interface TemplateNodeBase {
  id: string;
  type: NodeType;
  title: string;
  position?: { x: number; y: number };
}

export interface NodeOption {
  value: string;
  label: string;
}

export interface DecisionNode extends TemplateNodeBase {
  type: 'decision';
  key: string;
  options: NodeOption[];
  ui?: {
    control?: 'radio-cards' | 'select' | 'multi-select';
  };
  dynamicOptions?: {
    by: string;
    map: Record<string, string[]>;
  };
  extra?: {
    othersTextKey?: string;
  };
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'richtext';
  required?: boolean;
  placeholder?: string;
  options?: NodeOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface StepNode extends TemplateNodeBase {
  type: 'step';
  fields: FieldDefinition[];
}

export interface TextNode extends TemplateNodeBase {
  type: 'text';
  key: string;
  placeholder?: string;
}

export interface ChecklistItem {
  key?: string;
  value: string;
  label: string;
  defaultValue?: boolean;
}

export interface ChecklistNode extends TemplateNodeBase {
  type: 'checklist';
  key: string;
  items: ChecklistItem[];
}

export interface ComputedNode extends TemplateNodeBase {
  type: 'computed';
  key: string;
  compute: {
    type?: 'presupuesto';
    sourceKeys?: string[];
    itemsSource?: string;
    priceTable?: string;
    pricingConfigRef?: string;
  };
  ui?: {
    allowOverrides?: boolean;
    allowAdditionalItems?: boolean;
  };
}

export interface ReviewNode extends TemplateNodeBase {
  type: 'review';
  ui?: {
    showSummary?: boolean;
  };
}

export type TemplateNode =
  | DecisionNode
  | StepNode
  | TextNode
  | ChecklistNode
  | ComputedNode
  | ReviewNode;

export interface EdgeCondition {
  eq?: [string, string];
  neq?: [string, string];
  and?: EdgeCondition[];
  or?: EdgeCondition[];
}

export interface TemplateEdge {
  from: string;
  to: string;
  when?: EdgeCondition;
}

export interface TemplateSchema {
  id: string;
  name: string;
  startNodeId: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

// ===== API RESPONSE TYPES =====

export type TemplateEstado = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type EntradaStatus = 'DRAFT' | 'FINALIZED';

export interface HCTemplate {
  id: string;
  nombre: string;
  descripcion: string | null;
  profesionalId: string;
  estado: TemplateEstado;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HCTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  schema: TemplateSchema;
  publishedAt: string | null;
  createdAt: string;
}

export interface HCTemplateWithVersions extends HCTemplate {
  currentVersion: HCTemplateVersion | null;
  versions: HCTemplateVersion[];
  _count?: {
    versions: number;
  };
}

export interface HCTemplateWithCurrentVersion extends HCTemplate {
  currentVersion: {
    id: string;
    version: number;
    schema: TemplateSchema;
  } | null;
}

export interface HCEntryFromTemplate {
  id: string;
  historiaClinicaId: string;
  fecha: string;
  templateId: string;
  templateVersionId: string;
  status: EntradaStatus;
  answers: Record<string, unknown>;
  computed: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  template?: {
    nombre: string;
  };
  templateVersion?: {
    id: string;
    version: number;
    schema: TemplateSchema;
  };
}

// ===== WIZARD STATE =====

export interface WizardState {
  entryId: string | null;
  pacienteId: string | null;
  templateSchema: TemplateSchema | null;
  currentNodeId: string | null;
  nodeHistory: string[];
  answers: Record<string, unknown>;
  computed: Record<string, unknown>;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
}

// ===== DTOs =====

export interface CreateTemplateDto {
  nombre: string;
  descripcion?: string;
}

export interface UpdateTemplateDto {
  nombre?: string;
  descripcion?: string;
}

export interface CreateEntryDto {
  templateId: string;
  templateVersionId: string;
}

export interface UpdateEntryAnswersDto {
  answers?: Record<string, unknown>;
  computed?: Record<string, unknown>;
}
