import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function AccountBlockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-lg bg-red-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">✕</span>
            </div>
            <CardTitle className="text-3xl font-bold">Account Blocked</CardTitle>
          </div>
          <CardDescription className="text-center">
            Your account has been blocked
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              Your account has been blocked due to a policy violation. Please contact your administrator for more information.
            </AlertDescription>
          </Alert>

          <div className="flex justify-center">
            <Link href="/login">
              <Button>Return to Login</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
