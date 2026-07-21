import type { Project } from '../db/types'

export function budgetUsagePercent(project: Project): number {
  return project.budget === 0 ? 0 : (project.budgetConsumed / project.budget) * 100
}

export function hoursUsagePercent(project: Project): number {
  return project.hoursBudget === 0 ? 0 : (project.hoursConsumed / project.hoursBudget) * 100
}

export function isOverBudget(project: Project): boolean {
  return project.budgetConsumed > project.budget
}
