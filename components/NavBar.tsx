'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Brain, LayoutDashboard, Network, GitBranch, Lightbulb, LogOut, Orbit } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/dialogue', icon: Orbit, label: 'Mirror' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/graph', icon: Network, label: 'Belief Map' },
  { href: '/contradictions', icon: GitBranch, label: 'Conflicts' },
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
    <aside className="fixed left-0 top-0 bottom-0 w-16 z-50 flex flex-col items-center border-r py-4"
      style={{ background: 'rgba(3,3,8,0.95)', borderColor: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>

      {/* Logo */}
      <div className="mb-8">
        <div className="w-8 h-8 rounded-full p-[1px]" style={{ background: 'linear-gradient(135deg, #29b6f6, #ab47bc)' }}>
          <div className="w-full h-full rounded-full bg-void flex items-center justify-center">
            <Brain size={13} className="text-electric" />
          </div>
        </div>
      </div>

      {/* Nav icons */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group"
              style={{
                background: isActive ? 'rgba(41,182,246,0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(41,182,246,0.2)' : '1px solid transparent',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
                  style={{ background: '#29b6f6' }}
                />
              )}
              <item.icon
                size={15}
                style={{ color: isActive ? '#4fc3f7' : 'rgba(107,107,138,0.7)' }}
              />
              {/* Tooltip */}
              <div className="absolute left-14 px-2.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150"
                style={{ background: 'rgba(10,10,16,0.95)', border: '1px solid rgba(255,255,255,0.08)', color: '#c4c4d8' }}>
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        title="Disconnect"
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group relative"
        style={{ border: '1px solid transparent' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,71,87,0.08)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,71,87,0.15)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'transparent'
        }}
      >
        <LogOut size={14} style={{ color: 'rgba(107,107,138,0.6)' }} />
        <div className="absolute left-14 px-2.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150"
          style={{ background: 'rgba(10,10,16,0.95)', border: '1px solid rgba(255,255,255,0.08)', color: '#ff4757' }}>
          Disconnect
        </div>
      </button>
    </aside>
  )
}
