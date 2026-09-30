import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-red-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">✕</span>
            </div>
            <CardTitle className="text-3xl font-bold">Access Denied</CardTitle>
          </div>
          <CardDescription className="text-center">
            You don&apos;t have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              You don&apos;t have the required permissions to access this page. Please contact your administrator if you believe this is an error.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            <Link href="/dashboard">
              <Button>Return to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
