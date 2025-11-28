'use client'
import { useState, useEffect } from 'react'
import { ArrowRight, Leaf, Recycle, Users, Coins, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Poppins } from 'next/font/google'
import Link from 'next/link'
import { getRecentReports, getAllRewards, getWasteCollectionTasks } from '@/utils/db/actions'
const poppins = Poppins({ 
  weight: ['300', '400', '600'],
  subsets: ['latin'],
  display: 'swap',
})

function AnimatedGlobe() {
  return (
    <div className="relative w-32 h-32 mx-auto mb-8">
      <div className="absolute inset-0 rounded-full bg-green-500 opacity-20 animate-pulse"></div>
      <div className="absolute inset-2 rounded-full bg-green-400 opacity-40 animate-ping"></div>
      <div className="absolute inset-4 rounded-full bg-green-300 opacity-60 animate-spin"></div>
      <div className="absolute inset-6 rounded-full bg-green-200 opacity-80 animate-bounce"></div>
      <Leaf className="absolute inset-0 m-auto h-16 w-16 text-green-600 animate-pulse" />
    </div>
  )
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [impactData, setImpactData] = useState({
    wasteCollected: 0,
    reportsSubmitted: 0,
    tokensEarned: 0,
    co2Offset: 0
  });

  

  useEffect(() => {
    async function fetchImpactData() {
      try {
        const reports = await getRecentReports(100);  // Fetch last 100 reports
        const rewards = await getAllRewards();
        const tasks = await getWasteCollectionTasks(100);  // Fetch last 100 tasks

        const wasteCollected = tasks.reduce((total, task) => {
          const match = task.amount.match(/(\d+(\.\d+)?)/);
          const amount = match ? parseFloat(match[0]) : 0;
          return total + amount;
        }, 0);

        const reportsSubmitted = reports.length;
        const tokensEarned = rewards.reduce((total, reward) => total + (reward.points || 0), 0);
        const co2Offset = wasteCollected * 0.5;  // Assuming 0.5 kg CO2 offset per kg of waste

        setImpactData({
          wasteCollected: Math.round(wasteCollected * 10) / 10, // Round to 1 decimal place
          reportsSubmitted,
          tokensEarned,
          co2Offset: Math.round(co2Offset * 10) / 10 // Round to 1 decimal place
        });
      } catch (error) {
        console.error("Error fetching impact data:", error);
        // Set default values in case of error
        setImpactData({
          wasteCollected: 0,
          reportsSubmitted: 0,
          tokensEarned: 0,
          co2Offset: 0
        });
      }
    }

    fetchImpactData();
  }, []);

  const login = () => {
    setLoggedIn(true);
  };

  return (
    <div className={`container mx-auto px-4 py-16 ${poppins.className}`}>
      <section className="text-center mb-20">
        <AnimatedGlobe />
        <h1 className="text-6xl font-bold mb-6 text-gray-800 dark:text-gray-200 tracking-tight">
          <span className="text-green-600 dark:text-green-400">Snap. Track. Reduce.</span>
        </h1>
        <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Your Simple Carbon Footprint Tracker
        </p>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed mb-8">
          Take a photo of your receipts, let AI calculate your carbon footprint, and get personalized tips to reduce your environmental impact.
        </p>
        {!loggedIn ? (
          <Button onClick={login} className="bg-green-600 hover:bg-green-700 text-white text-lg py-6 px-10 rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105">
            Get Started Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <div className="flex gap-4 justify-center">
            <Link href="/scan">
              <Button className="bg-green-600 hover:bg-green-700 text-white text-lg py-6 px-10 rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105">
                📸 Scan Receipt
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/carbon">
              <Button variant="outline" className="border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 text-lg py-6 px-10 rounded-full font-medium transition-all duration-300">
                Manual Log
              </Button>
            </Link>
          </div>
        )}
      </section>
      
      <section className="grid md:grid-cols-3 gap-10 mb-20">
        <FeatureCard
          icon={Recycle}
          title="📸 Snap Your Receipts"
          description="Take a quick photo of shopping receipts. AI automatically identifies items and calculates their carbon footprint in seconds."
        />
        <FeatureCard
          icon={Leaf}
          title="🤖 AI-Powered Insights"
          description="Get personalized tips and alternative suggestions to reduce your carbon impact. Learn what choices make the biggest difference."
        />
        <FeatureCard
          icon={Users}
          title="🏆 Campus Competition"
          description="Join your dorm or department team. Compete on leaderboards and see how your group ranks in carbon reduction."
        />
      </section>
      
      <section className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-lg mb-20">
        <h2 className="text-4xl font-bold mb-12 text-center text-gray-800 dark:text-gray-200">Community Impact</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <ImpactCard title="CO₂ Tracked" value={`${impactData.co2Offset * 2} kg`} icon={Leaf} />
          <ImpactCard title="Activities Logged" value={impactData.reportsSubmitted.toString()} icon={MapPin} />
          <ImpactCard title="Eco Actions" value={impactData.tokensEarned.toString()} icon={Coins} />
          <ImpactCard title="Waste Recycled" value={`${impactData.wasteCollected} kg`} icon={Recycle} />
        </div>
      </section>

   
    </div>
  )
}

function ImpactCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  const formattedValue = typeof value === 'number' ? value.toLocaleString('en-US', { maximumFractionDigits: 1 }) : value;
  
  return (
    <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 transition-all duration-300 ease-in-out hover:shadow-md">
      <Icon className="h-10 w-10 text-green-500 dark:text-green-400 mb-4" />
      <p className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-200">{formattedValue}</p>
      <p className="text-sm text-gray-600 dark:text-gray-300">{title}</p>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-in-out flex flex-col items-center text-center">
      <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full mb-6">
        <Icon className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{description}</p>
    </div>
  )
}