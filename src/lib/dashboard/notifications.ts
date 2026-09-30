import { createClient } from '@/lib/supabase/server'

export type NotificationType = 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | 'PROJECT_ASSIGNED' | 'PROJECT_UPDATED' | 'PROJECT_COMPLETED' | 'INVENTORY_ALERT' | 'SYSTEM' | 'ADMIN'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  read_at: string | null
  related_type: string | null
  related_id: string | null
  created_at: string
}

export async function getUserNotifications(userId: string, limit = 20, offset = 0) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching notifications:', error)
    return { notifications: [], error: error.message }
  }

  return { notifications: data || [], error: null }
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }

  return count || 0
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error marking notification as read:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function markAllNotificationsAsRead(userId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedType: string | null = null,
  relatedId: string | null = null
) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      related_type: relatedType,
      related_id: relatedId,
    })

  if (error) {
    console.error('Error creating notification:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}
