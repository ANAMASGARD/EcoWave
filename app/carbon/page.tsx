'use client'
import { useState, useEffect } from 'react'
import { Plus, TrendingUp, Leaf, Calendar, Activity, Loader, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { useUser } from '@clerk/nextjs'
import { 
  getUserByEmail, 
  createUser, 
  getCarbonActivities, 
  seedCarbonActivities,
  logCarbonActivity,
  getDailyCarbonFootprint,
  getWeeklyCarbonTrends 
} from '@/utils/db/actions'
import { calculateCarbonEmission, formatCarbonEmission, getEmissionColor, generateTipsPrompt } from '@/lib/carbonCalculations'
import { GoogleGenerativeAI } from "@google/generative-ai"

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

type CarbonActivity = {
  id: number;
  category: string;
  activityName: string;
  emissionFactor: number;
  unit: string;
  description: string | null;
}

type DailyLog = {
  id: number;
  activityId: number;
  quantity: number;
  carbonEmitted: number;
  date: Date;
  notes: string | null;
  activityName: string | null;
  category: string | null;
  unit: string | null;
}

export default function CarbonTrackerPage() {
  const { user: clerkUser, isLoaded } = useUser()
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<CarbonActivity[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('transport')
  const [selectedActivity, setSelectedActivity] = useState<CarbonActivity | null>(null)
  const [quantity, setQuantity] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [todayLogs, setTodayLogs] = useState<DailyLog[]>([])
  const [todayTotal, setTodayTotal] = useState(0)
  const [weeklyStats, setWeeklyStats] = useState<{ avgDaily: number; daysLogged: number; categoryTotals: Record<string, number> } | null>(null)
  const [aiTips, setAiTips] = useState<string[]>([])
  const [loadingTips, setLoadingTips] = useState(false)

  useEffect(() => {
    const initializeData = async () => {
      if (!isLoaded) return
      
      setLoading(true)
      try {
        // Get or create user
        if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
          const userEmail = clerkUser.emailAddresses[0].emailAddress
          const name = clerkUser.fullName || clerkUser.firstName || 'Anonymous User'
          
          let fetchedUser = await getUserByEmail(userEmail)
          if (!fetchedUser) {
            fetchedUser = await createUser(userEmail, name)
          }
          setUser(fetchedUser)

          // Seed carbon activities if needed
          await seedCarbonActivities()
          
          // Fetch activities
          const fetchedActivities = await getCarbonActivities()
          setActivities(fetchedActivities as CarbonActivity[])

          if (fetchedActivities.length > 0) {
            const transportActivities = fetchedActivities.filter((a: CarbonActivity) => a.category === 'transport')
            if (transportActivities.length > 0) {
              setSelectedActivity(transportActivities[0] as CarbonActivity)
            }
          }

          // Fetch today's logs
          if (fetchedUser) {
            await refreshDailyData(fetchedUser.id)
            await refreshWeeklyData(fetchedUser.id)
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error)
        toast.error('Failed to load data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [clerkUser, isLoaded])

  const refreshDailyData = async (userId: number) => {
    const dailyData = await getDailyCarbonFootprint(userId)
    setTodayLogs(dailyData.logs as DailyLog[])
    setTodayTotal(dailyData.totalEmissions)
  }

  const refreshWeeklyData = async (userId: number) => {
    const weeklyData = await getWeeklyCarbonTrends(userId)
    setWeeklyStats(weeklyData)
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value
    setSelectedCategory(category)
    const categoryActivities = activities.filter(a => a.category === category)
    if (categoryActivities.length > 0) {
      setSelectedActivity(categoryActivities[0])
    }
  }

  const handleActivityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const activityId = parseInt(e.target.value)
    const activity = activities.find(a => a.id === activityId)
    setSelectedActivity(activity || null)
  }

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !selectedActivity) {
      toast.error('Please select an activity')
      return
    }

    const quantityNum = parseFloat(quantity)
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    const carbonEmitted = calculateCarbonEmission(selectedActivity.emissionFactor, quantityNum)
    
    const log = await logCarbonActivity(
      user.id,
      selectedActivity.id,
      quantityNum,
      carbonEmitted,
      notes
    )

    if (log) {
      toast.success(`Activity logged! ${formatCarbonEmission(carbonEmitted)} emitted`)
      setQuantity('')
      setNotes('')
      await refreshDailyData(user.id)
      await refreshWeeklyData(user.id)
    } else {
      toast.error('Failed to log activity. Please try again.')
    }
  }

  const handleGetAITips = async () => {
    if (!user || todayLogs.length === 0) {
      toast.error('Log some activities first to get personalized tips!')
      return
    }

    setLoadingTips(true)
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

      const prompt = generateTipsPrompt(todayLogs.map(log => ({
        category: log.category || '',
        carbonEmitted: log.carbonEmitted,
        activityName: log.activityName || ''
      })))

      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      try {
        let cleanedText = text.trim()
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        const jsonStart = cleanedText.indexOf('{')
        const jsonEnd = cleanedText.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1)
        }

        const parsedResult = JSON.parse(cleanedText)
        if (parsedResult.tips && Array.isArray(parsedResult.tips)) {
          setAiTips(parsedResult.tips)
          toast.success('AI tips generated!')
        } else {
          toast.error('Failed to parse AI response')
        }
      } catch (error) {
        console.error('Failed to parse AI response:', error)
        toast.error('Failed to generate tips. Please try again.')
      }
    } catch (error) {
      console.error('Error generating AI tips:', error)
      toast.error('Failed to connect to AI service.')
    } finally {
      setLoadingTips(false)
    }
  }

  const categoryActivities = activities.filter(a => a.category === selectedCategory)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin h-8 w-8 text-gray-600 dark:text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Carbon Footprint Tracker</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Track your daily activities and monitor your environmental impact</p>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Today&apos;s Footprint</p>
              <p className="text-3xl font-bold">{formatCarbonEmission(todayTotal)}</p>
            </div>
            <Leaf className="h-12 w-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Weekly Average</p>
              <p className="text-3xl font-bold">
                {weeklyStats ? formatCarbonEmission(weeklyStats.avgDaily) : '0g CO₂'}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 p-6 rounded-2xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Days Logged</p>
              <p className="text-3xl font-bold">{weeklyStats?.daysLogged || 0} / 7</p>
            </div>
            <Calendar className="h-12 w-12 opacity-80" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Log Activity Form */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
            <Plus className="mr-2 h-6 w-6 text-green-500" />
            Log Activity
          </h2>
          
          <form onSubmit={handleLogActivity} className="space-y-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="transport">🚗 Transport</option>
                <option value="food">🍽️ Food</option>
                <option value="energy">⚡ Energy</option>
                <option value="shopping">🛍️ Shopping</option>
              </select>
            </div>

            <div>
              <label htmlFor="activity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Activity
              </label>
              <select
                id="activity"
                value={selectedActivity?.id || ''}
                onChange={handleActivityChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {categoryActivities.map(activity => (
                  <option key={activity.id} value={activity.id}>
                    {activity.activityName}
                  </option>
                ))}
              </select>
              {selectedActivity?.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedActivity.description}</p>
              )}
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity ({selectedActivity?.unit || 'units'})
              </label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`e.g., 10 ${selectedActivity?.unit || 'units'}`}
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes (optional)
              </label>
              <Input
                id="notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details..."
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
              />
            </div>

            {selectedActivity && quantity && parseFloat(quantity) > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estimated emissions:</p>
                <p className={`text-2xl font-bold ${getEmissionColor(calculateCarbonEmission(selectedActivity.emissionFactor, parseFloat(quantity)))}`}>
                  {formatCarbonEmission(calculateCarbonEmission(selectedActivity.emissionFactor, parseFloat(quantity)))}
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl"
            >
              <Activity className="mr-2 h-5 w-5" />
              Log Activity
            </Button>
          </form>
        </div>

        {/* Today's Activities */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center">
              <Calendar className="mr-2 h-6 w-6 text-blue-500" />
              Today&apos;s Activities
            </h2>
            <Button
              onClick={handleGetAITips}
              disabled={loadingTips || todayLogs.length === 0}
              variant="outline"
              size="sm"
              className="border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
            >
              {loadingTips ? (
                <Loader className="animate-spin h-4 w-4" />
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Get Tips
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {todayLogs.length > 0 ? (
              todayLogs.map((log) => (
                <div key={log.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{log.activityName}</p>
                        {(log as DailyLog & { source?: string }).source === 'voice' && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs rounded-full flex items-center gap-1">
                            🎤 Voice
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {log.quantity} {log.unit}
                      </p>
                    </div>
                    <span className={`font-semibold ${getEmissionColor(log.carbonEmitted)}`}>
                      {formatCarbonEmission(log.carbonEmitted)}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">{log.notes}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Activity className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>No activities logged today</p>
                <p className="text-sm">Start tracking your carbon footprint!</p>
              </div>
            )}
          </div>

          {todayLogs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Total Today:</span>
                <span className={`text-xl font-bold ${getEmissionColor(todayTotal)}`}>
                  {formatCarbonEmission(todayTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Tips Section */}
      {aiTips.length > 0 && (
        <div className="mt-8 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-6 rounded-2xl border-2 border-amber-200 dark:border-amber-700">
          <h3 className="text-xl font-semibold mb-4 text-amber-900 dark:text-amber-200 flex items-center">
            <Lightbulb className="mr-2 h-6 w-6" />
            Personalized Tips to Reduce Your Carbon Footprint
          </h3>
          <div className="space-y-3">
            {aiTips.map((tip, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                <div className="flex">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                    {index + 1}
                  </span>
                  <p className="text-gray-700 dark:text-gray-300">{tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Breakdown */}
      {weeklyStats && weeklyStats.daysLogged > 0 && (
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
            <TrendingUp className="mr-2 h-6 w-6 text-purple-500" />
            Weekly Breakdown by Category
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(weeklyStats.categoryTotals).map(([category, total]) => (
              <div key={category} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize mb-1">{category}</p>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  {formatCarbonEmission(total as number)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
