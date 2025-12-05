'use client'
import { useState, useRef, useEffect } from 'react'
import { Camera, Upload, Loader, CheckCircle, ShoppingBag, Sparkles, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { 
  getUserByEmail, 
  createUser, 
  saveReceiptScan, 
  saveScannedItems,
  getOrCreateUserProfile 
} from '@/utils/db/actions'
import { 
  generateReceiptAnalysisPrompt, 
  parseReceiptAnalysisResponse,
  formatReceiptCarbon,
  getReceiptEmissionColor,
  generateReceiptInsights,
  calculatePotentialSavings,
  type ReceiptAnalysisResult 
} from '@/lib/receiptAnalysis'

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export default function ScanReceiptPage() {
  const { user: clerkUser, isLoaded } = useUser()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ReceiptAnalysisResult | null>(null)
  const [insights, setInsights] = useState<string[]>([])
  const [savings, setSavings] = useState<{ category: string; current: number; potential: number; savings: number }[]>([])

  // Get or create user - use useEffect instead of useState
  useEffect(() => {
    const initUser = async () => {
      if (!isLoaded) return
      
      if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
        const userEmail = clerkUser.emailAddresses[0].emailAddress
        const name = clerkUser.fullName || clerkUser.firstName || 'Anonymous User'
        
        let fetchedUser = await getUserByEmail(userEmail)
        if (!fetchedUser) {
          fetchedUser = await createUser(userEmail, name)
        }
        setUser(fetchedUser)
        
        // Ensure user profile exists
        if (fetchedUser) {
          await getOrCreateUserProfile(fetchedUser.id)
        }
      }
    }
    initUser()
  }, [clerkUser, isLoaded])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string)
      setAnalysisResult(null)
      setInsights([])
      setSavings([])
    }
    reader.readAsDataURL(file)
  }

  const handleScanReceipt = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first')
      return
    }

    if (!user) {
      toast.error('Please sign in to scan receipts')
      router.push('/sign-in')
      return
    }

    setIsProcessing(true)
    
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!)
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

      const base64Data = selectedImage.split(',')[1]
      const mimeType = selectedImage.split(';')[0].split(':')[1]

      const imageParts = [{
        inlineData: {
          data: base64Data,
          mimeType,
        },
      }]

      const prompt = generateReceiptAnalysisPrompt()
      const result = await model.generateContent([prompt, ...imageParts])
      const response = await result.response
      const text = response.text()

      // Parse the response
      const analysisData = parseReceiptAnalysisResponse(text)
      setAnalysisResult(analysisData)

      // Generate insights
      const receiptInsights = generateReceiptInsights(analysisData.items)
      setInsights(receiptInsights)

      // Calculate potential savings
      const potentialSavings = calculatePotentialSavings(analysisData.items)
      setSavings(potentialSavings)

      toast.success(`Receipt analyzed! Found ${analysisData.itemCount} items.`)
    } catch (error) {
      console.error('Error scanning receipt:', error)
      toast.error('Failed to analyze receipt. Please try a clearer image.')
      setAnalysisResult(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveReceipt = async () => {
    if (!analysisResult || !user) return

    try {
      // Save receipt
      const receipt = await saveReceiptScan(
        user.id,
        selectedImage || '',
        analysisResult.storeName,
        analysisResult.purchaseDate,
        analysisResult.totalAmount,
        analysisResult.totalCarbon,
        analysisResult.itemCount,
        { insights, savings }
      )

      if (!receipt) {
        toast.error('Failed to save receipt')
        return
      }

      // Save items
      await saveScannedItems(receipt.id, analysisResult.items)

      const pointsEarned = 10 + Math.floor(analysisResult.totalCarbon / 1000)
      toast.success(
        `Receipt saved! You earned ${pointsEarned} points and tracked ${formatReceiptCarbon(analysisResult.totalCarbon)}.`,
        { duration: 5000 }
      )

      // Reset for next scan
      setSelectedImage(null)
      setAnalysisResult(null)
      setInsights([])
      setSavings([])
      
      // Redirect to history after a brief delay
      setTimeout(() => {
        router.push('/history')
      }, 2000)
    } catch (error) {
      console.error('Error saving receipt:', error)
      toast.error('Failed to save receipt. Please try again.')
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">
          📸 Smart Receipt Scanner
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Snap a photo of your receipt and let AI calculate your carbon footprint
        </p>
      </div>

      {/* Upload Section */}
      {!selectedImage && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex flex-col items-center justify-center">
            <div className="mb-6 p-6 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 rounded-full">
              <Camera className="h-16 w-16 text-green-600 dark:text-green-400" />
            </div>
            
            <h2 className="text-2xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
              Upload Receipt Image
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
              Take a clear photo of your shopping receipt. AI will automatically identify items and calculate their carbon footprint.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            <div className="flex gap-4">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg rounded-xl"
              >
                <Upload className="mr-2 h-5 w-5" />
                Choose Image
              </Button>
            </div>

            <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Supports JPG, PNG • Max 10MB
            </div>
          </div>
        </div>
      )}

      {/* Image Preview & Analysis */}
      {selectedImage && (
        <div className="space-y-6">
          {/* Image Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Receipt Image</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedImage(null)
                  setAnalysisResult(null)
                  setInsights([])
                  setSavings([])
                }}
              >
                Change Image
              </Button>
            </div>
            
            <div className="relative w-full max-w-md mx-auto">
              <Image
                src={selectedImage}
                alt="Receipt"
                width={400}
                height={600}
                className="rounded-lg shadow-md w-full h-auto"
                style={{ objectFit: 'contain' }}
              />
            </div>

            {!analysisResult && !isProcessing && (
              <div className="mt-6">
                <Button
                  onClick={handleScanReceipt}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg rounded-xl"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Analyze with AI
                </Button>
              </div>
            )}

            {isProcessing && (
              <div className="mt-6 flex flex-col items-center justify-center py-8">
                <Loader className="animate-spin h-12 w-12 text-green-600 dark:text-green-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Analyzing receipt with AI...</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">This may take a few seconds</p>
              </div>
            )}
          </div>

          {/* Analysis Results */}
          {analysisResult && !isProcessing && (
            <>
              {/* Summary Card */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-2xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 mr-3" />
                    <h3 className="text-2xl font-bold">Analysis Complete!</h3>
                  </div>
                  <ShoppingBag className="h-10 w-10 opacity-70" />
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-sm opacity-90 mb-1">Store</p>
                    <p className="text-xl font-bold">{analysisResult.storeName}</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-sm opacity-90 mb-1">Items Found</p>
                    <p className="text-xl font-bold">{analysisResult.itemCount}</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-sm opacity-90 mb-1">Total Carbon</p>
                    <p className="text-xl font-bold">{formatReceiptCarbon(analysisResult.totalCarbon)}</p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                  Detected Items
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analysisResult.items.map((item, index) => (
                    <div 
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {item.itemName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {item.category.replace(/-/g, ' ')} • Qty: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`font-semibold ${getReceiptEmissionColor(item.carbonEmission)}`}>
                          {formatReceiptCarbon(item.carbonEmission)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.confidence}% confident
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-2xl shadow-lg p-6 border-2 border-amber-200 dark:border-amber-700">
                  <h3 className="text-xl font-semibold mb-4 text-amber-900 dark:text-amber-200 flex items-center">
                    <Sparkles className="mr-2 h-6 w-6" />
                    AI Insights
                  </h3>
                  <div className="space-y-3">
                    {insights.map((insight, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                        <p className="text-gray-700 dark:text-gray-300">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Potential Savings */}
              {savings.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl shadow-lg p-6 border-2 border-blue-200 dark:border-blue-700">
                  <h3 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-200 flex items-center">
                    <TrendingDown className="mr-2 h-6 w-6" />
                    Potential Carbon Savings
                  </h3>
                  <div className="space-y-4">
                    {savings.map((saving, index) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl">
                        <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                          {saving.category}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Current:</span>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {formatReceiptCarbon(saving.current)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-gray-600 dark:text-gray-400">Potential:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {formatReceiptCarbon(saving.potential)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">You could save:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {formatReceiptCarbon(saving.savings)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <Button
                  onClick={handleSaveReceipt}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg rounded-xl"
                >
                  <CheckCircle className="mr-2 h-6 w-6" />
                  Save Receipt & Earn Points
                </Button>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3">
                  Earn {10 + Math.floor(analysisResult.totalCarbon / 1000)} points for tracking this receipt
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
