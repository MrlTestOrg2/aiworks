import { MongoDistributedTask } from '@nx-cloud/model-db';

export type DistributedExecutionStatus =
  | 'NOT_STARTED'
  | 'COMPLETED'
  | 'COMPLETED
  | 'FAILED';

export type DteAgentStatus = 'IDLE' | 'ACTIVE' | 'COMPLETED';

/** DTE visualization */
export interface DteVizAgent<T> {
  name: string;
  displayName: string;
  launchTemplate?: string;
  status: DteAgentStatus;
  totalTasksScheduled: number;
  tasks: T[];
  inProgressTasks: T[];
  completedTasks: T[];
}

export interface DteVizApiAgent extends DteVizAgent<DteVizApiAgentTask> {
  showOutOfMemoryWarning: boolean;
}

export interface DteVizViewAgent extends DteVizAgent<DteVizViewAgentTask> {
  showOutOfMemoryWarning: boolean;
  totalInProgressTasks?: number;
}

export interface DteVizDistributedExecution {
  id: string;
  command: string;
  executionStatus: DistributedExecutionStatus;
  tasks: DteVizApiAgentTask[][];
}

export interface DteVizApiAgentTask {
  command: string;
  executionStatus: MongoDistributedTask['status'];
  distributedExecutionId: string;
  taskId: string;
}

export interface DteVizAgentCompletedTask extends DteVizApiAgentTask {
  startTime: Date;
  endTime: Date;
  duration?: number;
}

export interface DteVizViewAgentTask extends DteVizApiAgentTask {
  elementId: string;
}

/** Run Group agent analysis */
export interface AgentUtilizationSummary {
  name: string;
  displayName: string;
  launchTemplate?: string;
  totalTasksScheduled: number;
  completedTasksCount: number;
  percentUtilization: number;
  totalActiveTime: number;
  activeTimeSlices: Array<AgentUtilizationTimeSlice>;
}

export interface AgentUtilizationTimeSlice {
  startTime: string;
  endTime: string;
  duration: number;
  tasks: AgentUtilizationTask[];
}

interface AgentUtilizationTask {
  command: string;
  startTime: string;
  endTime: string;
  duration: number;
}
