import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

export function ComingSoon({ module }: { module: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Calendar className="h-8 w-8 text-slate-400" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            The {module} module will be available in the next phase of development.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            We&apos;re working hard to bring you this feature. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
