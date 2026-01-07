import { FlowDecisionNode } from './FlowDecisionNode';
import { FlowStepNode } from './FlowStepNode';
import { FlowTextNode } from './FlowTextNode';
import { FlowChecklistNode } from './FlowChecklistNode';
import { FlowComputedNode } from './FlowComputedNode';
import { FlowReviewNode } from './FlowReviewNode';

export {
  FlowDecisionNode,
  FlowStepNode,
  FlowTextNode,
  FlowChecklistNode,
  FlowComputedNode,
  FlowReviewNode,
};

export const nodeTypes = {
  decision: FlowDecisionNode,
  step: FlowStepNode,
  text: FlowTextNode,
  checklist: FlowChecklistNode,
  computed: FlowComputedNode,
  review: FlowReviewNode,
};
