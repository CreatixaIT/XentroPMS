import { createClient } from '@/lib/supabase/server'
import { 
  CreateProjectInput, 
  UpdateProjectInput, 
  ProjectListInput,
  AddProjectMemberInput,
  CreateProjectComponentInput,
  UpdateProjectComponentInput,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListInput,
  CreateDailyUpdateInput
} from '@/lib/validations/projects'

export async function getProjects(params: ProjectListInput) {
  const supabase = await createClient()
  
  let query = supabase
    .from('projects')
    .select('id, name, description, project_code, client_name, location, start_date, target_end_date, actual_end_date, status, created_by, created_at, updated_at')
  
  // Search filter
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%,project_code.ilike.%${params.search}%,client_name.ilike.%${params.search}%`)
  }
  
  // Status filter
  if (params.status) {
    query = query.eq('status', params.status)
  }
  
  // Sorting
  if (params.sort_by) {
    const column = params.sort_by
    const order = params.sort_order || 'asc'
    query = query.order(column, { ascending: order === 'asc' })
  } else {
    query = query.order('created_at', { ascending: false })
  }
  
  // Pagination
  if (params.limit) {
    query = query.limit(params.limit)
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }
  
  return {
    projects: data || [],
    total: count || 0,
    limit: params.limit || 10,
    offset: params.offset || 0
  }
}

export async function getProjectById(id: string) {
  const supabase = await createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    throw new Error(`Failed to fetch project: ${error.message}`)
  }
  
  return project
}

export async function createProject(data: CreateProjectInput, userId: string) {
  const supabase = await createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      name: data.name,
      description: data.description,
      project_code: data.project_code,
      client_name: data.client_name,
      location: data.location,
      start_date: data.start_date || null,
      target_end_date: data.target_end_date || null,
      status: 'PLANNING',
      created_by: userId
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create project: ${error.message}`)
  }
  
  // Add project members if provided
  if (data.member_ids && data.member_ids.length > 0) {
    const members = data.member_ids.map(user_id => ({
      project_id: project.id,
      user_id,
      role: 'MEMBER' as const
    }))
    
    const { error: membersError } = await supabase
      .from('project_members')
      .insert(members)
    
    if (membersError) {
      console.error('Failed to add project members:', membersError)
      // Don't fail the entire project creation if member addition fails
    }
  }
  
  // Add project activity
  await supabase.rpc('add_project_activity', {
    p_project_id: project.id,
    p_user_id: userId,
    p_activity_type: 'PROJECT_CREATED',
    p_description: `Project "${project.name}" was created`,
    p_metadata: { project_name: project.name }
  })
  
  return project
}

export async function updateProject(id: string, data: UpdateProjectInput) {
  const supabase = await createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .update({
      name: data.name,
      description: data.description,
      project_code: data.project_code,
      client_name: data.client_name,
      location: data.location,
      start_date: data.start_date || null,
      target_end_date: data.target_end_date || null
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update project: ${error.message}`)
  }
  
  return project
}

export async function updateProjectStatus(id: string, status: string, userId: string) {
  const supabase = await createClient()
  
  const { data: project, error } = await supabase
    .from('projects')
    .update({
      status,
      actual_end_date: status === 'COMPLETED' ? new Date().toISOString().split('T')[0] : null
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update project status: ${error.message}`)
  }
  
  // Add project activity
  await supabase.rpc('add_project_activity', {
    p_project_id: id,
    p_user_id: userId,
    p_activity_type: 'PROJECT_STATUS_CHANGED',
    p_description: `Project status changed to ${status}`,
    p_metadata: { new_status: status }
  })
  
  return project
}

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      id,
      role,
      joined_at,
      user_id,
      profiles (
        id,
        email,
        full_name,
        designation
      )
    `)
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch project members: ${error.message}`)
  }
  
  return data || []
}

export async function addProjectMember(projectId: string, data: AddProjectMemberInput, userId: string) {
  const supabase = await createClient()
  
  // Check if user exists and is active
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, status')
    .eq('id', data.user_id)
    .single()
  
  if (!profile) {
    throw new Error('User not found')
  }
  
  if (profile.status !== 'ACTIVE') {
    throw new Error('User is not active')
  }
  
  const { data: member, error } = await supabase
    .from('project_members')
    .insert({
      project_id: projectId,
      user_id: data.user_id,
      role: data.role
    })
    .select(`
      id,
      role,
      joined_at,
      user_id,
      profiles (
        id,
        email,
        full_name
      )
    `)
    .single()
  
  if (error) {
    if (error.code === '23505') {
      throw new Error('User is already a member of this project')
    }
    throw new Error(`Failed to add project member: ${error.message}`)
  }
  
  // Add project activity
  await supabase.rpc('add_project_activity', {
    p_project_id: projectId,
    p_user_id: userId,
    p_activity_type: 'MEMBER_ADDED',
    p_description: `Member added to project`,
    p_metadata: { 
      member_id: data.user_id,
      member_role: data.role 
    }
  })
  
  return member
}

export async function removeProjectMember(projectId: string, memberId: string, userId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId)
    .eq('project_id', projectId)
  
  if (error) {
    throw new Error(`Failed to remove project member: ${error.message}`)
  }
  
  // Add project activity
  await supabase.rpc('add_project_activity', {
    p_project_id: projectId,
    p_user_id: userId,
    p_activity_type: 'MEMBER_REMOVED',
    p_description: `Member removed from project`,
    p_metadata: { member_id: memberId }
  })
  
  return { success: true }
}

export async function getProjectComponents(projectId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('project_components')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch project components: ${error.message}`)
  }
  
  return data || []
}

export async function createProjectComponent(projectId: string, data: CreateProjectComponentInput, userId: string) {
  const supabase = await createClient()
  
  const { data: component, error } = await supabase
    .from('project_components')
    .insert({
      project_id: projectId,
      name: data.name,
      description: data.description,
      quantity: data.quantity,
      unit: data.unit
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create project component: ${error.message}`)
  }
  
  // Add project activity
  await supabase.rpc('add_project_activity', {
    p_project_id: projectId,
    p_user_id: userId,
    p_activity_type: 'COMPONENT_ADDED',
    p_description: `Component "${data.name}" added to project`,
    p_metadata: { component_name: data.name }
  })
  
  return component
}

export async function updateProjectComponent(componentId: string, data: UpdateProjectComponentInput, projectId: string, userId: string) {
  const supabase = await createClient()
  
  const { data: component, error } = await supabase
    .from('project_components')
    .update({
      name: data.name,
      description: data.description,
      quantity: data.quantity,
      unit: data.unit
    })
    .eq('id', componentId)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update project component: ${error.message}`)
  }
  
  // Add project activity
  await supabase.rpc('add_project_activity', {
    p_project_id: projectId,
    p_user_id: userId,
    p_activity_type: 'COMPONENT_UPDATED',
    p_description: `Component updated`,
    p_metadata: { component_id: componentId }
  })
  
  return component
}

export async function deleteProjectComponent(componentId: string, projectId: string, userId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('project_components')
    .delete()
    .eq('id', componentId)
  
  if (error) {
    throw new Error(`Failed to delete project component: ${error.message}`)
  }
  
  // Add project activity
  await supabase.rpc('add_project_activity', {
    p_project_id: projectId,
    p_user_id: userId,
    p_activity_type: 'COMPONENT_REMOVED',
    p_description: `Component removed from project`,
    p_metadata: { component_id: componentId }
  })
  
  return { success: true }
}

export async function getProjectTasks(projectId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('project_tasks')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      created_at,
      updated_at,
      assigned_to,
      created_by,
      profiles!project_tasks_assigned_to_fkey (
        id,
        full_name,
        email
      ),
      creator:profiles!project_tasks_created_by_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to fetch project tasks: ${error.message}`)
  }
  
  return data || []
}

export async function getTasks(params: TaskListInput) {
  const supabase = await createClient()
  
  let query = supabase
    .from('project_tasks')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      created_at,
      updated_at,
      project_id,
      assigned_to,
      created_by,
      projects (
        id,
        name,
        status
      ),
      profiles!project_tasks_assigned_to_fkey (
        id,
        full_name,
        email
      )
    `)
  
  // Search filter
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
  }
  
  // Status filter
  if (params.status) {
    query = query.eq('status', params.status)
  }
  
  // Priority filter
  if (params.priority) {
    query = query.eq('priority', params.priority)
  }
  
  // Project filter
  if (params.project_id) {
    query = query.eq('project_id', params.project_id)
  }
  
  // Assigned to filter
  if (params.assigned_to) {
    query = query.eq('assigned_to', params.assigned_to)
  }
  
  // Sorting
  if (params.sort_by) {
    const column = params.sort_by
    const order = params.sort_order || 'asc'
    query = query.order(column, { ascending: order === 'asc' })
  } else {
    query = query.order('created_at', { ascending: false })
  }
  
  // Pagination
  if (params.limit) {
    query = query.limit(params.limit)
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 10) - 1)
  }
  
  const { data, error, count } = await query
  
  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`)
  }
  
  return {
    tasks: data || [],
    total: count || 0,
    limit: params.limit || 10,
    offset: params.offset || 0
  }
}

export async function getTaskById(id: string) {
  const supabase = await createClient()
  
  const { data: task, error } = await supabase
    .from('project_tasks')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      created_at,
      updated_at,
      project_id,
      assigned_to,
      created_by,
      projects (
        id,
        name,
        status,
        created_by
      ),
      profiles!project_tasks_assigned_to_fkey (
        id,
        full_name,
        email
      ),
      creator:profiles!project_tasks_created_by_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('id', id)
    .single()
  
  if (error) {
    throw new Error(`Failed to fetch task: ${error.message}`)
  }
  
  return task
}

export async function createTask(projectId: string, data: CreateTaskInput, userId: string) {
  const supabase = await createClient()
  
  // If assigned_to is provided and it's a project task (not personal), verify user is a project member
  if (data.assigned_to && projectId !== 'personal') {
    const { data: member } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', data.assigned_to)
      .single()
    
    if (!member) {
      throw new Error('Assigned user is not a member of this project')
    }
  }
  
  const { data: task, error } = await supabase
    .from('project_tasks')
    .insert({
      project_id: projectId === 'personal' ? null : projectId,
      title: data.title,
      description: data.description,
      assigned_to: data.assigned_to || null,
      created_by: userId,
      status: 'TODO',
      priority: data.priority,
      due_date: data.due_date || null
    })
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      created_at,
      assigned_to,
      profiles!project_tasks_assigned_to_fkey (
        id,
        full_name,
        email
      )
    `)
    .single()
  
  if (error) {
    throw new Error(`Failed to create task: ${error.message}`)
  }
  
  // Add project activity
  await supabase.rpc('add_project_activity', {
    p_project_id: projectId,
    p_user_id: userId,
    p_activity_type: 'TASK_CREATED',
    p_description: `Task "${data.title}" created`,
    p_metadata: { task_id: task.id, task_title: data.title }
  })
  
  // If assigned, add notification
  if (data.assigned_to) {
    await supabase.from('notifications').insert({
      user_id: data.assigned_to,
      type: 'TASK_ASSIGNED',
      title: 'New Task Assigned',
      message: `You have been assigned to task: ${data.title}`,
      metadata: { task_id: task.id, project_id: projectId }
    })
    
    await supabase.rpc('add_project_activity', {
      p_project_id: projectId,
      p_user_id: userId,
      p_activity_type: 'TASK_ASSIGNED',
      p_description: `Task assigned to user`,
      p_metadata: { task_id: task.id, assigned_to: data.assigned_to }
    })
  }
  
  return task
}

export async function updateTask(id: string, data: UpdateTaskInput, userId: string) {
  const supabase = await createClient()
  
  // Get current task
  const { data: currentTask } = await supabase
    .from('project_tasks')
    .select('project_id, assigned_to')
    .eq('id', id)
    .single()
  
  if (!currentTask) {
    throw new Error('Task not found')
  }
  
  // If reassigning, verify new assignee is a project member
  if (data.assigned_to && data.assigned_to !== currentTask.assigned_to) {
    const { data: member } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', currentTask.project_id)
      .eq('user_id', data.assigned_to)
      .single()
    
    if (!member) {
      throw new Error('Assigned user is not a member of this project')
    }
  }
  
  const updateData: {
    title?: string
    description?: string | null
    priority?: string
    due_date?: string | null
    status?: string
    completed_at?: string
    assigned_to?: string | null
  } = {
    title: data.title,
    description: data.description,
    priority: data.priority,
    due_date: data.due_date || null
  }
  
  if (data.status) {
    updateData.status = data.status
    if (data.status === 'COMPLETED') {
      updateData.completed_at = new Date().toISOString()
    }
  }
  
  if (data.assigned_to !== undefined) {
    updateData.assigned_to = data.assigned_to
  }
  
  const { data: task, error } = await supabase
    .from('project_tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update task: ${error.message}`)
  }
  
  // Add project activity
  await supabase.rpc('add_project_activity', {
    p_project_id: currentTask.project_id,
    p_user_id: userId,
    p_activity_type: 'TASK_UPDATED',
    p_description: `Task updated`,
    p_metadata: { task_id: id }
  })
  
  // If status changed to COMPLETED, add notification and activity
  if (data.status === 'COMPLETED') {
    await supabase.rpc('add_project_activity', {
      p_project_id: currentTask.project_id,
      p_user_id: userId,
      p_activity_type: 'TASK_COMPLETED',
      p_description: `Task completed`,
      p_metadata: { task_id: id }
    })
    
    // Notify project creator
    const { data: project } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', currentTask.project_id)
      .single()
    
    if (project && project.created_by !== userId) {
      await supabase.from('notifications').insert({
        user_id: project.created_by,
        type: 'TASK_COMPLETED',
        title: 'Task Completed',
        message: `A task in your project has been completed`,
        metadata: { task_id: id, project_id: currentTask.project_id }
      })
    }
  }
  
  return task
}

export async function getTaskDailyUpdates(taskId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('task_daily_updates')
    .select(`
      id,
      update_date,
      progress_percentage,
      description,
      created_at,
      updated_at,
      user_id,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('task_id', taskId)
    .order('update_date', { ascending: false })
  
  if (error) {
    throw new Error(`Failed to fetch task daily updates: ${error.message}`)
  }
  
  return data || []
}

export async function createDailyUpdate(taskId: string, data: CreateDailyUpdateInput, userId: string) {
  const supabase = await createClient()
  
  // Get task info
  const { data: task } = await supabase
    .from('project_tasks')
    .select('project_id, assigned_to')
    .eq('id', taskId)
    .single()
  
  if (!task) {
    throw new Error('Task not found')
  }
  
  // Use server date (Asia/Dhaka timezone)
  const today = new Date().toISOString().split('T')[0]
  
  const { data: update, error } = await supabase
    .from('task_daily_updates')
    .insert({
      task_id: taskId,
      user_id: userId,
      update_date: today,
      progress_percentage: data.progress_percentage,
      description: data.description
    })
    .select(`
      id,
      update_date,
      progress_percentage,
      description,
      created_at,
      user_id,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .single()
  
  if (error) {
    if (error.code === '23505') {
      throw new Error('You have already submitted an update for this task today')
    }
    throw new Error(`Failed to create daily update: ${error.message}`)
  }
  
  // Add project activity
  await supabase.rpc('add_project_activity', {
    p_project_id: task.project_id,
    p_user_id: userId,
    p_activity_type: 'DAILY_UPDATE_ADDED',
    p_description: `Daily update added for task`,
    p_metadata: { task_id: taskId, progress: data.progress_percentage }
  })
  
  return update
}

export async function getProjectActivity(projectId: string, limit = 20) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('project_activity')
    .select(`
      id,
      activity_type,
      description,
      metadata,
      created_at,
      user_id,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    throw new Error(`Failed to fetch project activity: ${error.message}`)
  }
  
  return data || []
}

export async function getProjectProgress(projectId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .rpc('calculate_project_progress', { p_project_id: projectId })
  
  if (error) {
    throw new Error(`Failed to calculate project progress: ${error.message}`)
  }
  
  return data
}
