import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Camera, History, Activity, Medal, Coins, Settings, Home, Mic } from "lucide-react"

const sidebarItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/scan", icon: Camera, label: "Scan Receipt", highlight: true },
  { href: "/voice", icon: Mic, label: "Talk to Eco", highlight: true },
  { href: "/history", icon: History, label: "History" },
  { href: "/carbon", icon: Activity, label: "Manual Log" },
  { href: "/leaderboard", icon: Medal, label: "Leaderboard" },
  { href: "/rewards", icon: Coins, label: "Rewards" },
]

interface SidebarProps {
  open: boolean
}

export default function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={`bg-white dark:bg-gray-900 border-r pt-20 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 w-64 fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <nav className="h-full flex flex-col justify-between">
        <div className="px-4 py-6 space-y-2">
          {sidebarItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <Button 
                variant={pathname === item.href ? "secondary" : "ghost"}
                className={`w-full justify-start py-3 ${
                  pathname === item.href 
                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" 
                    : item.highlight
                    ? "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 font-semibold"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`} 
              >
                <item.icon className="mr-3 h-5 w-5" />
                <span className="text-base">{item.label}</span>
                {item.highlight && pathname !== item.href && (
                  <span className="ml-auto text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full">
                    New
                  </span>
                )}
              </Button>
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <Link href="/settings" passHref>
            <Button 
              variant={pathname === "/settings" ? "secondary" : "outline"}
              className={`w-full py-3 ${
                pathname === "/settings"
                  ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                  : "text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`} 
            >
              <Settings className="mr-3 h-5 w-5" />
              <span className="text-base">Settings</span>
            </Button>
          </Link>
        </div>
      </nav>
    </aside>
  )
}