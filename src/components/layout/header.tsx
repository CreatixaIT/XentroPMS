'use client'

import { useState, useEffect } from 'react'
import { Bell, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/actions/auth'
import { NotificationDropdown } from '@/components/layout/notification-dropdown'
import type { AuthUser } from '@/lib/auth/authorization'

interface HeaderProps {
  user: AuthUser
}

export function Header({ user }: HeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const response = await fetch('/api/notifications/unread-count')
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.count || 0)
        }
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }

    fetchUnreadCount()
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

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
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {getGreeting()}, {user.full_name.split(' ')[0]}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatDate()} • {getBangladeshTime()} (Bangladesh Time)
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            <NotificationDropdown
              isOpen={showNotifications}
              userId={user.id}
            />
          </div>

          {/* Logout */}
          <form action={logout}>
            <Button variant="ghost" size="icon" title="Logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
