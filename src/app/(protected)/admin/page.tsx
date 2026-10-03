import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Clock, Settings, BarChart3, Package, DollarSign } from 'lucide-react'

export default function AdminPage() {
  const adminModules = [
    {
      title: 'Financial Management',
      description: 'Overview of budgets, expenses, and financial reporting',
      icon: DollarSign,
      href: '/admin/finance',
      color: 'text-emerald-600'
    },
    {
      title: 'Attendance Management',
      description: 'View and manage employee attendance records',
      icon: Clock,
      href: '/admin/attendance',
      color: 'text-blue-600'
    },
    {
      title: 'Attendance Settings',
      description: 'Configure workplace location and verification settings',
      icon: Settings,
      href: '/admin/settings/attendance',
      color: 'text-purple-600'
    },
    {
      title: 'Inventory Management',
      description: 'Manage inventory categories, items, and stock',
      icon: Package,
      href: '/admin/inventory',
      color: 'text-green-600'
    },
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      href: '/admin/users',
      color: 'text-orange-600'
    },
    {
      title: 'Reports',
      description: 'View system reports and analytics',
      icon: BarChart3,
      href: '/reports',
      color: 'text-pink-600'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Administration</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">System administration and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className={module.disabled ? 'pointer-events-none opacity-50' : ''}
          >
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <module.icon className={`h-8 w-8 ${module.color}`} />
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-500 dark:text-slate-400">{module.description}</p>
                {module.disabled && (
                  <p className="text-xs text-slate-400 mt-2">Coming in future phase</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

