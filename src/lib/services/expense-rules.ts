import { ExpenseType } from "@prisma/client";

type ExpenseSummaryInput = {
  expenseType: ExpenseType;
  amount: number;
  isSettled: boolean;
  archivedAt: Date | null;
};

export function affectsBudget(type: ExpenseType) {
  return type === "FOOD" || type === "OTHER";
}

export function deriveBudgetWarning(monthlyBudget: number, spent: number) {
  if (spent <= monthlyBudget) return undefined;
  return `Current spend ${spent.toFixed(2)} exceeds monthly budget ${monthlyBudget.toFixed(2)}.`;
}

export function summarizeExpenses(expenses: ExpenseSummaryInput[], includeArchived = false) {
  const archivedCount = expenses.filter((expense) => Boolean(expense.archivedAt)).length;

  return expenses
    .filter((expense) => includeArchived || !expense.archivedAt)
    .reduce(
      (acc, expense) => {
        acc.count += 1;
        acc.total += expense.amount;
        if (expense.isSettled) {
          acc.settled += expense.amount;
        } else {
          acc.unsettled += expense.amount;
        }
        if (affectsBudget(expense.expenseType)) {
          acc.budgetTotal += expense.amount;
        }
        if (expense.expenseType === "TRIP") {
          acc.tripTotal += expense.amount;
        }
        return acc;
      },
      { count: 0, total: 0, settled: 0, unsettled: 0, budgetTotal: 0, tripTotal: 0, archivedCount }
    );
}
