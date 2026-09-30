import { requireActiveAccount } from '@/lib/auth/authorization'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/actions/auth'

export default async function DashboardPage() {
  const user = await requireActiveAccount()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              Welcome, {user.full_name}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Role: {user.role.replace('_', ' ')}
            </p>
          </div>
          <form action={logout}>
            <Button variant="outline">Logout</Button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>View and edit your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/profile">
                <Button>View Profile</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Change your password and security settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/profile/security">
                <Button>Security Settings</Button>
              </Link>
            </CardContent>
          </Card>

          {user.role === 'SUPER_ADMIN' && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Panel</CardTitle>
                <CardDescription>Manage users and system settings</CardDescription>
              </CardHeader>
              <CardContent>
                <Button disabled>Coming Soon</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Manage your projects and tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled>Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
              <CardDescription>View your attendance records</CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled>Coming Soon</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>Manage inventory and resources</CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled>Coming Soon</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
