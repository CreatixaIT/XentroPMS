import { getDashboardSummary } from '@/lib/dashboard/summary'
import { DashboardCards } from '@/components/dashboard/dashboard-cards'
import { DashboardHero } from '@/components/dashboard/dashboard-hero'

export default async function DashboardPage() {
  const summary = await getDashboardSummary()

  return (
    <div className="p-6">
      <DashboardHero />
      <div className="mt-8">
        <DashboardCards summary={summary} />
      </div>
    </div>
  )
}
