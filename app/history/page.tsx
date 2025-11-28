'use client'
import { useState, useEffect } from 'react'
import { Clock, ShoppingBag, Loader, TrendingUp, Calendar, Download } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useUser } from '@clerk/nextjs'
import { getUserByEmail, createUser, getUserReceiptScans, getReceiptItems, getUserReceiptStats } from '@/utils/db/actions'
import { formatReceiptCarbon, getReceiptEmissionColor } from '@/lib/receiptAnalysis'
import { Button } from '@/components/ui/button'

type ReceiptScan = {
  id: number
  storeName: string
  purchaseDate: Date
  totalAmount: string
  totalCarbon: number
  itemCount: number
  createdAt: Date
}

type ReceiptItem = {
  id: number
  itemName: string
  category: string
  quantity: number
  carbonEmission: number
}

export default function HistoryPage() {
  const { user: clerkUser, isLoaded } = useUser()
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [receipts, setReceipts] = useState<ReceiptScan[]>([])
  const [selectedReceipt, setSelectedReceipt] = useState<number | null>(null)
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isLoaded) return
      
      setLoading(true)
      try {
        if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
          const userEmail = clerkUser.emailAddresses[0].emailAddress
          const name = clerkUser.fullName || clerkUser.firstName || 'Anonymous User'
          
          let fetchedUser = await getUserByEmail(userEmail)
          if (!fetchedUser) {
            fetchedUser = await createUser(userEmail, name)
          }
          setUser(fetchedUser)

          if (fetchedUser) {
            const fetchedReceipts = await getUserReceiptScans(fetchedUser.id)
            setReceipts(fetchedReceipts as ReceiptScan[])

            const fetchedStats = await getUserReceiptStats(fetchedUser.id)
            setStats(fetchedStats)
          }
        }
      } catch (error) {
        console.error('Error fetching history:', error)
        toast.error('Failed to load history. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [clerkUser, isLoaded])

  const handleViewReceipt = async (receiptId: number) => {
    setSelectedReceipt(receiptId)
    const items = await getReceiptItems(receiptId)
    setReceiptItems(items as ReceiptItem[])
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin h-8 w-8 text-gray-600 dark:text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">
          📊 Scan History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View your past receipt scans and track your carbon journey
        </p>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 p-6 rounded-2xl shadow-lg text-white">
            <p className="text-sm opacity-90 mb-1">Total Scans</p>
            <p className="text-3xl font-bold">{stats.totalScans}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-6 rounded-2xl shadow-lg text-white">
            <p className="text-sm opacity-90 mb-1">Items Tracked</p>
            <p className="text-3xl font-bold">{stats.totalItems}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 p-6 rounded-2xl shadow-lg text-white">
            <p className="text-sm opacity-90 mb-1">Carbon Tracked</p>
            <p className="text-3xl font-bold">{formatReceiptCarbon(stats.totalCarbon)}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 p-6 rounded-2xl shadow-lg text-white">
            <p className="text-sm opacity-90 mb-1">Avg per Receipt</p>
            <p className="text-3xl font-bold">
              {stats.totalScans > 0 ? formatReceiptCarbon(Math.round(stats.totalCarbon / stats.totalScans)) : '0g'}
            </p>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {stats && Object.keys(stats.categoryTotals).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
            <TrendingUp className="mr-2 h-6 w-6 text-purple-500" />
            Carbon by Category
          </h3>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(stats.categoryTotals)
              .sort((a: any, b: any) => b[1] - a[1])
              .map(([category, carbon]: [string, any]) => (
                <div key={category} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize mb-1">
                    {category.replace(/-/g, ' ')}
                  </p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {formatReceiptCarbon(carbon)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Receipt List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
          <Calendar className="mr-2 h-6 w-6 text-blue-500" />
          All Receipts
        </h3>

        {receipts.length > 0 ? (
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div 
                key={receipt.id}
                className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewReceipt(receipt.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mr-4">
                      <ShoppingBag className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                        {receipt.storeName}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(receipt.purchaseDate)}
                        </span>
                        <span>{receipt.itemCount} items</span>
                        <span>{receipt.totalAmount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-2xl font-bold ${getReceiptEmissionColor(receipt.totalCarbon)}`}>
                      {formatReceiptCarbon(receipt.totalCarbon)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Scanned {formatDate(receipt.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Show items if selected */}
                {selectedReceipt === receipt.id && receiptItems.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Items:</h5>
                    <div className="space-y-2">
                      {receiptItems.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">{item.itemName}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.category.replace(/-/g, ' ')} × {item.quantity}
                            </p>
                          </div>
                          <p className={`font-semibold ${getReceiptEmissionColor(item.carbonEmission)}`}>
                            {formatReceiptCarbon(item.carbonEmission)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Receipts Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start scanning receipts to track your carbon footprint
            </p>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              Scan Your First Receipt
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
