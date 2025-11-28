'use client'
import { useState, useEffect } from 'react'
import { User, Mail, Building2, Save, Users as UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import { toast } from 'react-hot-toast'
import { getUserByEmail, createUser, getAllCampusGroups, joinCampusGroup } from '@/utils/db/actions'

type UserSettings = {
  name: string
  email: string
  campusGroupId: number | null
  notifications: boolean
}

type CampusGroup = {
  id: number
  name: string
  type: string
  memberCount: number
}

export default function SettingsPage() {
  const { user: clerkUser, isLoaded } = useUser()
  const [user, setUser] = useState<{ id: number; email: string; name: string; campusGroupId?: number | null } | null>(null)
  const [campusGroups, setCampusGroups] = useState<CampusGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    email: '',
    campusGroupId: null,
    notifications: true,
  })

  useEffect(() => {
    const initSettings = async () => {
      if (!isLoaded) return
      
      if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
        const userEmail = clerkUser.emailAddresses[0].emailAddress
        const name = clerkUser.fullName || clerkUser.firstName || 'Anonymous User'
        
        let fetchedUser = await getUserByEmail(userEmail)
        if (!fetchedUser) {
          fetchedUser = await createUser(userEmail, name)
        }
        setUser(fetchedUser)
        
        setSettings({
          name: fetchedUser?.name || name,
          email: userEmail,
          campusGroupId: (fetchedUser as any)?.campusGroupId || null,
          notifications: true,
        })
        setSelectedGroupId((fetchedUser as any)?.campusGroupId || null)

        // Fetch campus groups
        const groups = await getAllCampusGroups()
        setCampusGroups(groups as CampusGroup[])
      }
    }

    initSettings()
  }, [clerkUser, isLoaded])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = parseInt(e.target.value)
    setSelectedGroupId(groupId || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('Please sign in to update settings')
      return
    }

    try {
      // Update campus group if changed
      if (selectedGroupId && selectedGroupId !== settings.campusGroupId) {
        const success = await joinCampusGroup(user.id, selectedGroupId)
        if (success) {
          toast.success('Campus group updated successfully!')
          setSettings(prev => ({ ...prev, campusGroupId: selectedGroupId }))
        } else {
          toast.error('Failed to update campus group')
        }
      } else {
        toast.success('Settings saved!')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('Failed to save settings')
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6 text-gray-800 dark:text-gray-200">⚙️ Settings</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Profile Information</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={settings.name}
                  disabled
                  className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={settings.email}
                  disabled
                  className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
            <Building2 className="mr-2 h-6 w-6 text-blue-500" />
            Campus Group
          </h2>
          
          <div>
            <label htmlFor="campusGroup" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Join a Dorm or Department
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Join your campus group to compete on leaderboards and track collective impact
            </p>
            <select
              id="campusGroup"
              value={selectedGroupId || ''}
              onChange={handleGroupChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">No Group</option>
              {campusGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.type}) - {group.memberCount} members
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Preferences</h2>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="notifications"
              name="notifications"
              checked={settings.notifications}
              onChange={handleInputChange}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
            />
            <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Receive email notifications about carbon tracking tips and updates
            </label>
          </div>
        </div>

        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-3">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </form>
    </div>
  )
}