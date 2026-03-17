'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Brain, LayoutDashboard, Network, GitBranch, Lightbulb, LogOut, Orbit } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dialogue', icon: Orbit, label: 'Mirror' },
  { href: '/graph', icon: Network, label: 'Belief Map' },
  { href: '/contradictions', icon: GitBranch, label: 'Contradictions' },
  { href: '/insights', icon: Lightbulb, label: 'Insights' },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[200px] z-50 flex flex-col border-r border-border/30 bg-abyss/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="p-5 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full animated-border p-[1px] shrink-0">
            <div className="w-full h-full rounded-full bg-void flex items-center justify-center">
              <Brain size={12} className="text-electric" />
            </div>
          </div>
          <div>
            <div className="font-display text-sm text-bright leading-none">RCE</div>
            <div className="font-mono text-[9px] text-ghost mt-0.5">Cognition Engine</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                isActive
                  ? 'text-bright bg-electric/8 border border-electric/12'
                  : 'text-ghost hover:text-pale hover:bg-surface/40'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-electric"
                />
              )}
              <item.icon
                size={14}
                className={isActive ? 'text-electric shrink-0' : 'text-ghost group-hover:text-pale shrink-0'}
              />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-border/20">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ghost hover:text-contradiction hover:bg-contradiction/5 transition-all duration-200"
        >
          <LogOut size={14} />
          <span>Disconnect</span>
        </button>
      </div>
    </aside>
  )
}
