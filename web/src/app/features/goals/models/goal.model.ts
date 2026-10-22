export enum GoalCategory {
  EmergencyFund = 1,
  DreamHome = 2,
  Vehicle = 3,
  Vacation = 4,
  Gadget = 5,
  Wedding = 6,
  Education = 7,
  Retirement = 8,
  Business = 9,
  Other = 10
}

export enum GoalStatus {
  InProgress = 1,
  Achieved = 2,
  Paused = 3,
  Abandoned = 4
}

export enum GoalPriority {
  Low = 1,
  Medium = 2,
  High = 3,
  Urgent = 4
}

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  categoryName: string;
  targetAmount: number;
  formattedTargetAmount: string;
  currentAmount: number;
  formattedCurrentAmount: string;
  remainingAmount: number;
  formattedRemainingAmount: string;
  percentageAchieved: number;
  targetDate: string | null;
  formattedTargetDate: string | null;
  daysRemaining: number | null;
  monthsRemaining: number | null;
  suggestedMonthlySavings: number | null;
  formattedSuggestedMonthlySavings: string | null;
  priority: GoalPriority;
  priorityName: string;
  status: GoalStatus;
  statusName: string;
  color: string | null;
  icon: string | null;
  createdAtUtc: string;
  contributionsCount: number;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  formattedAmount: string;
  contributionDate: string;
  source: string | null;
  notes: string | null;
  createdAtUtc: string;
}

export interface GoalDetail {
  goal: Goal;
  contributions: GoalContribution[];
}

export interface GoalsSummary {
  totalTargetAmount: number;
  formattedTotalTargetAmount: string;
  totalSavedAmount: number;
  formattedTotalSavedAmount: string;
  totalRemainingAmount: number;
  formattedTotalRemainingAmount: string;
  overallPercentageAchieved: number;
  totalGoalsCount: number;
  activeGoalsCount: number;
  achievedGoalsCount: number;
  pausedGoalsCount: number;
}

export interface GetGoalsResponse {
  goals: Goal[];
  summary: GoalsSummary;
}

export interface CreateGoalRequest {
  title: string;
  description?: string | null;
  category: GoalCategory;
  targetAmount: number;
  initialAmount?: number | null;
  targetDate?: string | null;
  priority: GoalPriority;
  color?: string | null;
  icon?: string | null;
}

export interface UpdateGoalRequest {
  title: string;
  description?: string | null;
  category: GoalCategory;
  targetAmount: number;
  targetDate?: string | null;
  priority: GoalPriority;
  status: GoalStatus;
  color?: string | null;
  icon?: string | null;
}

export interface AddGoalContributionRequest {
  amount: number;
  contributionDate?: string | null;
  source?: string | null;
  notes?: string | null;
}

