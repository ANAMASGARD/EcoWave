'use client'
import { useState, useEffect } from 'react'
import { getAllRewards, getUserByEmail, createUser, getCampusGroupLeaderboard, getAllCampusGroups } from '@/utils/db/actions'
import { Loader, Award, User, Trophy, Crown, Users, Building2, Home } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

type Reward = {
  id: number
  userId: number
  points: number
  level: number
  createdAt: Date
  userName: string | null
}

type CampusGroup = {
  id: number
  name: string
  type: string
  memberCount: number
  totalCarbonTracked: number
}

export default function LeaderboardPage() {
  const { user: clerkUser, isLoaded } = useUser()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [campusGroups, setCampusGroups] = useState<CampusGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [viewMode, setViewMode] = useState<'individual' | 'groups'>('individual')

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      if (!isLoaded) return
      
      setLoading(true)
      try {
        // Fetch individual leaderboard
        const fetchedRewards = await getAllRewards()
        setRewards(fetchedRewards)

        // Fetch campus groups leaderboard
        const fetchedGroups = await getCampusGroupLeaderboard()
        setCampusGroups(fetchedGroups as CampusGroup[])

        // Get current user
        if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
          const userEmail = clerkUser.emailAddresses[0].emailAddress
          const name = clerkUser.fullName || clerkUser.firstName || 'Anonymous User'
          
          let fetchedUser = await getUserByEmail(userEmail)
          if (!fetchedUser) {
            fetchedUser = await createUser(userEmail, name)
          }
          
          if (fetchedUser) {
            setUser(fetchedUser)
          }
        }
      } catch (error) {
        console.error('Error fetching leaderboard data:', error)
        toast.error('Failed to load leaderboard. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboardData()
  }, [clerkUser, isLoaded])

  const formatCarbon = (grams: number) => {
    if (grams < 1000) return `${grams}g CO₂`
    return `${(grams / 1000).toFixed(1)}kg CO₂`
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2 text-gray-800 dark:text-gray-200">🏆 Leaderboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          See how you and your campus group rank in carbon tracking
        </p>
      </div>

      {/* View Toggle */}
      <div className="flex gap-4 mb-6">
        <Button
          variant={viewMode === 'individual' ? 'default' : 'outline'}
          onClick={() => setViewMode('individual')}
          className={viewMode === 'individual' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <User className="mr-2 h-4 w-4" />
          Individual
        </Button>
        <Button
          variant={viewMode === 'groups' ? 'default' : 'outline'}
          onClick={() => setViewMode('groups')}
          className={viewMode === 'groups' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <Users className="mr-2 h-4 w-4" />
          Campus Groups
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="animate-spin h-8 w-8 text-gray-600 dark:text-gray-400" />
        </div>
      ) : (
        <>
          {/* Individual Leaderboard */}
          {viewMode === 'individual' && (
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 p-6">
                <div className="flex justify-between items-center text-white">
                  <Trophy className="h-10 w-10" />
                  <span className="text-2xl font-bold">Top Trackers</span>
                  <Award className="h-10 w-10" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Points</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map((reward, index) => (
                      <tr 
                        key={reward.id} 
                        className={`${user && user.id === reward.userId ? 'bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500' : ''} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ease-in-out`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index < 3 ? (
                              <Crown className={`h-6 w-6 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : 'text-yellow-600'}`} />
                            ) : (
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{index + 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <User className="h-full w-full rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 p-2" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {reward.userName}
                                {user && user.id === reward.userId && (
                                  <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">You</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Award className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" />
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{reward.points.toLocaleString()}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200">
                            Level {reward.level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Campus Groups Leaderboard */}
          {viewMode === 'groups' && (
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6">
                <div className="flex justify-between items-center text-white">
                  <Building2 className="h-10 w-10" />
                  <span className="text-2xl font-bold">Campus Group Rankings</span>
                  <Users className="h-10 w-10" />
                </div>
              </div>
              <div className="overflow-x-auto">
                {campusGroups.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Group</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Members</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Carbon Tracked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campusGroups.map((group, index) => (
                        <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {index < 3 ? (
                                <Crown className={`h-6 w-6 ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-400' : 'text-yellow-600'}`} />
                              ) : (
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{index + 1}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {group.type === 'dorm' ? (
                                <Home className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                              ) : (
                                <Building2 className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
                              )}
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{group.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                              group.type === 'dorm' 
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
                                : 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200'
                            }`}>
                              {group.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Users className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900 dark:text-gray-100">{group.memberCount}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                              {formatCarbon(group.totalCarbonTracked)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center">
                    <Building2 className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No Campus Groups Yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Be the first to create or join a campus group!
                    </p>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      Create Group
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}