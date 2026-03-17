'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Brain, LayoutDashboard, MessageSquare, Network, GitBranch, Lightbulb, LogOut, PenLine } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/thoughts', icon: PenLine, label: 'Thoughts' },
  { href: '/graph', icon: Network, label: 'Belief Map' },
  { href: '/contradictions', icon: GitBranch, label: 'Contradictions' },
  { href: '/dialogue', icon: MessageSquare, label: 'Mirror' },
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
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] z-50 flex flex-col border-r border-border/40 bg-abyss/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="p-5 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full animated-border p-[1px] shrink-0">
            <div className="w-full h-full rounded-full bg-void flex items-center justify-center">
              <Brain size={14} className="text-electric" />
            </div>
          </div>
          <div>
            <div className="font-display text-sm text-bright leading-none">RCE</div>
            <div className="font-mono text-[9px] text-ghost mt-0.5">Cognition Engine</div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                isActive
                  ? 'text-bright bg-electric/10 border border-electric/15'
                  : 'text-ghost hover:text-pale hover:bg-surface/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-electric"
                />
              )}
              <item.icon
                size={15}
                className={`shrink-0 ${isActive ? 'text-electric' : 'text-ghost group-hover:text-pale'}`}
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-border/30">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ghost hover:text-contradiction hover:bg-contradiction/5 transition-all duration-200"
        >
          <LogOut size={15} />
          <span>Disconnect</span>
        </button>
      </div>
    </aside>
  )
}
