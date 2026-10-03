'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type FinancialSummary = {
  total_planned_budget: number
  total_actual_spending: number
  total_remaining_budget: number
  currency: string
  expenses_by_category: {
    category_name: string
    total_amount: number
  }[]
  recent_expenses: {
    id: string
    description: string
    amount: number
    currency: string
    status: string
    expense_date: string
    project_name: string
    category_name: string
  }[]
  project_summaries: {
    project_id: string
    project_name: string
    planned_budget: number
    actual_spending: number
    remaining_budget: number
    currency: string
  }[]
}

export default function FinancialOverviewPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/finance/overview')
      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      } else {
        const err = await response.json()
        setError(err.error || 'Failed to load financial summary')
      }
    } catch {
      setError('Failed to load financial summary')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSummary()
  }, [loadSummary])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading financial overview...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No financial data available
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financial Overview</h1>
        <p className="text-muted-foreground">Organization-wide financial summary across all projects</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Planned Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.currency === 'BDT' ? '৳' : ''}{summary.total_planned_budget.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actual Spending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summary.currency === 'BDT' ? '৳' : ''}{summary.total_actual_spending.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Remaining Budget</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.total_remaining_budget < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {summary.currency === 'BDT' ? '৳' : ''}{summary.total_remaining_budget.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.project_summaries.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Spending by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.expenses_by_category.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No expense data yet
            </div>
          ) : (
            <div className="space-y-3">
              {summary.expenses_by_category.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                  <span className="font-medium">{cat.category_name}</span>
                  <span className="font-bold">
                    {summary.currency === 'BDT' ? '৳' : ''}{cat.total_amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Summaries */}
      <Card>
        <CardHeader>
          <CardTitle>Project Financial Summaries</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.project_summaries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No projects with budgets found
            </div>
          ) : (
            <div className="space-y-4">
              {summary.project_summaries.map((project) => (
                <div key={project.project_id} className="border rounded-lg p-4">
                  <div className="font-medium text-lg mb-3">{project.project_name}</div>
                  <div className="grid gap-2 md:grid-cols-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Planned</div>
                      <div className="font-medium">
                        {project.currency === 'BDT' ? '৳' : ''}{project.planned_budget.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Spent</div>
                      <div className="font-medium text-orange-600">
                        {project.currency === 'BDT' ? '৳' : ''}{project.actual_spending.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Remaining</div>
                      <div className={`font-medium ${project.remaining_budget < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {project.currency === 'BDT' ? '৳' : ''}{project.remaining_budget.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.recent_expenses.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No expenses recorded yet
            </div>
          ) : (
            <div className="space-y-3">
              {summary.recent_expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 border-b">
                  <div className="flex-1">
                    <div className="font-medium">{expense.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {expense.project_name} • {expense.category_name} • {expense.expense_date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {expense.currency === 'BDT' ? '৳' : ''}{expense.amount.toLocaleString()}
                    </div>
                    <Badge className={
                      expense.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      expense.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {expense.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
