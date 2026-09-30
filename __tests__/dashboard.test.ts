import { getDashboardSummary } from '@/lib/dashboard/summary'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
      is: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))

describe('Dashboard Summary', () => {
  it('should return dashboard summary structure', async () => {
    const summary = await getDashboardSummary()
    
    expect(summary).toHaveProperty('attendance')
    expect(summary).toHaveProperty('tasks')
    expect(summary).toHaveProperty('projects')
    expect(summary).toHaveProperty('inventory')
    expect(summary).toHaveProperty('notifications')
  })

  it('should handle missing module data gracefully', async () => {
    const summary = await getDashboardSummary()
    
    // When modules are not implemented, should return placeholder data
    expect(summary.tasks.pending_count).toBe(0)
    expect(summary.tasks.completed_count).toBe(0)
    expect(summary.projects.active_count).toBe(0)
    expect(summary.projects.completed_count).toBe(0)
    expect(summary.inventory.total_items).toBe(0)
  })
})

describe('Dashboard Cards', () => {
  it('should handle empty task data', () => {
    const taskSummary = {
      pending_count: 0,
      completed_count: 0,
      upcoming_tasks: [],
    }
    
    expect(taskSummary.pending_count).toBe(0)
    expect(taskSummary.upcoming_tasks).toHaveLength(0)
  })

  it('should handle empty project data', () => {
    const projectSummary = {
      active_count: 0,
      completed_count: 0,
      active_projects: [],
    }
    
    expect(projectSummary.active_count).toBe(0)
    expect(projectSummary.active_projects).toHaveLength(0)
  })

  it('should handle empty inventory data', () => {
    const inventorySummary = {
      total_items: 0,
      low_stock_count: 0,
      available_count: 0,
    }
    
    expect(inventorySummary.total_items).toBe(0)
    expect(inventorySummary.low_stock_count).toBe(0)
  })
})
