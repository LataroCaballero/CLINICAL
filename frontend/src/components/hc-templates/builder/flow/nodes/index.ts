import { FlowDecisionNode } from './FlowDecisionNode';
import { FlowStepNode } from './FlowStepNode';
import { FlowTextNode } from './FlowTextNode';
import { FlowChecklistNode } from './FlowChecklistNode';
import { FlowComputedNode } from './FlowComputedNode';
import { FlowReviewNode } from './FlowReviewNode';
import { FlowDrawingNode } from './FlowDrawingNode';
import { FlowDiagnosisNode } from './FlowDiagnosisNode';
import { FlowTreatmentNode } from './FlowTreatmentNode';
import { FlowProcedureNode } from './FlowProcedureNode';
import { FlowBudgetNode } from './FlowBudgetNode';

export {
  FlowDecisionNode,
  FlowStepNode,
  FlowTextNode,
  FlowChecklistNode,
  FlowComputedNode,
  FlowReviewNode,
  FlowDrawingNode,
  FlowDiagnosisNode,
  FlowTreatmentNode,
  FlowProcedureNode,
  FlowBudgetNode,
};

export const nodeTypes = {
  decision: FlowDecisionNode,
  step: FlowStepNode,
  text: FlowTextNode,
  checklist: FlowChecklistNode,
  computed: FlowComputedNode,
  review: FlowReviewNode,
  drawing: FlowDrawingNode,
  diagnosis: FlowDiagnosisNode,
  treatment: FlowTreatmentNode,
  procedure: FlowProcedureNode,
  budget: FlowBudgetNode,
};
