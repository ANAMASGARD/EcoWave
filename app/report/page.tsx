'use client'
import { useState, useEffect } from 'react'
import {  MapPin, Upload, CheckCircle, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { LocationSearch } from '@/components/LocationSearch';
import { createUser, getUserByEmail, createReport, getRecentReports } from '@/utils/db/actions';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast'
import { useUser } from '@clerk/nextjs'
import Image from 'next/image'

const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export default function ReportPage() {
  const { user: clerkUser, isLoaded } = useUser();
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(null);
  const router = useRouter();

  const [reports, setReports] = useState<Array<{
    id: number;
    location: string;
    wasteType: string;
    amount: string;
    createdAt: string;
  }>>([]);

  const [newReport, setNewReport] = useState({
    location: '',
    type: '',
    amount: '',
  })

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure'>('idle')
  const [verificationResult, setVerificationResult] = useState<{
    wasteType: string;
    quantity: string;
    confidence: number;
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setNewReport({ ...newReport, [name]: value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleVerify = async () => {
    if (!file) return

    setVerificationStatus('verifying')
    
    try {
      const genAI = new GoogleGenerativeAI(geminiApiKey!);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const base64Data = await readFileAsBase64(file);

      const imageParts = [
        {
          inlineData: {
            data: base64Data.split(',')[1],
            mimeType: file.type,
          },
        },
      ];

      const prompt = `You are an expert in waste management and recycling. Analyze this image and provide:
        1. The type of waste (e.g., plastic, paper, glass, metal, organic, mixed)
        2. An estimate of the quantity or amount (be concise, e.g., "5 kg", "2-3 bags", "small pile")
        3. Your confidence level in this assessment (as a number between 0 and 1)
        
        IMPORTANT: Respond ONLY with valid JSON format, no markdown or extra text:
        {
          "wasteType": "type of waste",
          "quantity": "estimated quantity with unit (keep it short)",
          "confidence": confidence level as a number between 0 and 1
        }`;

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();
      
      try {
        // Clean the response text by removing markdown code blocks
        let cleanedText = text.trim();
        
        // Remove markdown code block markers if present
        if (cleanedText.startsWith('```json')) {
          cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedText.startsWith('```')) {
          cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Additional cleanup for any remaining markdown or extra characters
        cleanedText = cleanedText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        
        // Find JSON object boundaries more robustly
        const jsonStart = cleanedText.indexOf('{');
        const jsonEnd = cleanedText.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
        }
        
        const parsedResult = JSON.parse(cleanedText);
        if (parsedResult.wasteType && parsedResult.quantity && typeof parsedResult.confidence === 'number') {
          // Ensure quantity is not too long (truncate if necessary)
          let quantity = parsedResult.quantity;
          if (quantity.length > 100) {
            quantity = quantity.substring(0, 97) + '...';
          }
          
          const result = {
            wasteType: parsedResult.wasteType,
            quantity: quantity,
            confidence: parsedResult.confidence
          };
          
          setVerificationResult(result);
          setVerificationStatus('success');
          setNewReport({
            ...newReport,
            type: result.wasteType,
            amount: result.quantity
          });
          
          toast.success('Waste verification completed successfully!');
        } else {
          console.error('Invalid verification result:', parsedResult);
          toast.error('AI verification returned incomplete data. Please try again.');
          setVerificationStatus('failure');
        }
      } catch (error) {
        console.error('Failed to parse JSON response:', text);
        console.error('Parse error:', error);
        toast.error('Failed to process AI response. Please try uploading a different image.');
        setVerificationStatus('failure');
      }
    } catch (error) {
      console.error('Error verifying waste:', error);
      toast.error('Error connecting to AI service. Please check your internet connection and try again.');
      setVerificationStatus('failure');
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to submit a report.');
      router.push('/sign-in');
      return;
    }
    
    if (verificationStatus !== 'success') {
      toast.error('Please verify the waste before submitting.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const report = await createReport(
        user.id,
        newReport.location,
        newReport.type,
        newReport.amount,
        preview || undefined,
        verificationResult ? JSON.stringify(verificationResult) : undefined
      );
      
      if (report) {
        const formattedReport = {
          id: report.id,
          location: report.location,
          wasteType: report.wasteType,
          amount: report.amount,
          createdAt: new Date(report.createdAt).toISOString().split('T')[0]
        };
        
        setReports([formattedReport, ...reports]);
        setNewReport({ location: '', type: '', amount: '' });
        setFile(null);
        setPreview(null);
        setVerificationStatus('idle');
        setVerificationResult(null);
        
        // Calculate carbon offset from waste
        const wasteMatch = newReport.amount.match(/(\d+(\.\d+)?)/);
        const wasteAmount = wasteMatch ? parseFloat(wasteMatch[0]) : 0;
        const carbonOffset = Math.round(wasteAmount * 500); // 500g CO2 per kg of waste
        
        toast.success(
          `Eco action logged! You've earned points and offset ${carbonOffset}g CO₂ by reporting waste.`,
          { duration: 5000 }
        );
      } else {
        toast.error('Failed to create report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      if (!isLoaded) return;
      
      if (clerkUser?.emailAddresses?.[0]?.emailAddress) {
        const email = clerkUser.emailAddresses[0].emailAddress;
        const name = clerkUser.fullName || clerkUser.firstName || 'Anonymous User';
        
        let user = await getUserByEmail(email);
        if (!user) {
          user = await createUser(email, name);
        }
        setUser(user);
        
        const recentReports = await getRecentReports();
        const formattedReports = recentReports.map(report => ({
          ...report,
          createdAt: report.createdAt.toISOString().split('T')[0]
        }));
        setReports(formattedReports);
      } else {
        // User is not signed in, but we can still show the report page
        // They just won't be able to submit reports
        const recentReports = await getRecentReports();
        const formattedReports = recentReports.map(report => ({
          ...report,
          createdAt: report.createdAt.toISOString().split('T')[0]
        }));
        setReports(formattedReports);
      }
    };
    checkUser();
  }, [clerkUser, isLoaded]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Log Eco Action</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Report waste to help your community and offset your carbon footprint!</p>
      
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg mb-12">
        <div className="mb-8">
          <label htmlFor="waste-image" className="block text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload Waste Image
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl hover:border-green-500 dark:hover:border-green-400 transition-colors duration-300 bg-gray-50 dark:bg-gray-700">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                <label
                  htmlFor="waste-image"
                  className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-green-500"
                >
                  <span>Upload a file</span>
                  <input id="waste-image" name="waste-image" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 10MB</p>
            </div>
          </div>
        </div>
        
        {preview && (
          <div className="mt-4 mb-8">
            <Image 
              src={preview} 
              alt="Waste preview" 
              width={500}
              height={300}
              className="max-w-full h-auto rounded-xl shadow-md" 
              style={{ objectFit: 'contain' }}
            />
          </div>
        )}
        
        <Button 
          type="button" 
          onClick={handleVerify} 
          className="w-full mb-8 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg rounded-xl transition-colors duration-300" 
          disabled={!file || verificationStatus === 'verifying'}
        >
          {verificationStatus === 'verifying' ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Verifying...
            </>
          ) : 'Verify Waste'}
        </Button>

        {verificationStatus === 'success' && verificationResult && (
          <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-400 dark:border-green-500 p-4 mb-8 rounded-r-xl">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-400 dark:text-green-300 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Verification Successful</h3>
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p>Waste Type: {verificationResult.wasteType}</p>
                  <p>Quantity: {verificationResult.quantity}</p>
                  <p>Confidence: {(verificationResult.confidence * 100).toFixed(2)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
            <LocationSearch
              value={newReport.location}
              onChange={(value) => setNewReport(prev => ({ ...prev, location: value }))}
              placeholder="Enter waste location"
            />
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Waste Type</label>
            <input
              type="text"
              id="type"
              name="type"
              value={newReport.type}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Verified waste type"
              readOnly
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Amount</label>
            <input
              type="text"
              id="amount"
              name="amount"
              value={newReport.amount}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Verified amount"
              readOnly
            />
          </div>
        </div>
        <Button 
          type="submit" 
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg rounded-xl transition-colors duration-300 flex items-center justify-center"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
              Submitting...
            </>
          ) : 'Submit Report'}
        </Button>
      </form>

      {/* Carbon Offset Info Box */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-2xl border-2 border-green-200 dark:border-green-700 mb-8">
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-2">
          🌱 How Waste Reporting Helps Reduce Carbon
        </h3>
        <p className="text-sm text-green-800 dark:text-green-300">
          Every kilogram of waste you report and help divert from landfills prevents approximately <strong>0.5 kg of CO₂</strong> from entering the atmosphere. 
          When waste is properly collected and recycled, it reduces methane emissions from decomposition and saves energy compared to producing new materials.
        </p>
      </div>

      <h2 className="text-3xl font-semibold mb-6 text-gray-800 dark:text-gray-200">Recent Eco Actions</h2>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    <MapPin className="inline-block w-4 h-4 mr-2 text-green-500 dark:text-green-400" />
                    {report.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{report.wasteType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{report.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{report.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}