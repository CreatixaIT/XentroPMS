import { Calendar, Clock } from 'lucide-react'

export function DashboardHero() {
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getBangladeshTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-8 mb-8">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
      
      <div className="relative z-10">
        <h1 className="text-3xl font-bold mb-2">
          {getGreeting()}
        </h1>
        <p className="text-blue-100 mb-6">
          Welcome to your Xentro PMS dashboard
        </p>
        
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
            <Calendar className="h-4 w-4" />
            <span>{formatDate()}</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
            <Clock className="h-4 w-4" />
            <span>{getBangladeshTime()} (Bangladesh Time)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
