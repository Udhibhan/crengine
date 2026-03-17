'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Brain, LayoutDashboard, Network, GitBranch, Lightbulb, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/graph', icon: Network, label: 'Belief Map' },
  { href: '/contradictions', icon: GitBranch, label: 'Conflicts' },
  { href: '/insights', icon: Lightbulb, label: 'Insights' },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const isOnMirror = pathname === '/dialogue'

  useEffect(() => {
    const check = () => {
      const started = sessionStorage.getItem('mirror_started') === 'true'
      const notMirror = !window.location.pathname.includes('dialogue') || started
      setVisible(started || !window.location.pathname.includes('dialogue'))
    }
    check()
    window.addEventListener('mirror_started', check)
    return () => window.removeEventListener('mirror_started', check)
  }, [pathname])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    sessionStorage.clear()
    router.push('/')
    router.refresh()
  }

  // On mirror page: slides in from left after started
  // On other pages: always visible
  const shouldShow = !isOnMirror || visible

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.aside
          initial={isOnMirror ? { x: -80, opacity: 0 } : { x: 0, opacity: 1 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed left-0 top-0 bottom-0 w-14 z-50 flex flex-col items-center py-5"
          style={{ background: 'rgba(3,3,8,0.9)', borderRight: '1px solid rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}
        >
          {/* Logo */}
          <Link href="/dialogue" className="mb-8 shrink-0">
            <div className="w-7 h-7 rounded-full p-[1px]" style={{ background: 'linear-gradient(135deg, #29b6f6, #ab47bc)' }}>
              <div className="w-full h-full rounded-full bg-void flex items-center justify-center">
                <Brain size={12} className="text-electric" />
              </div>
            </div>
          </Link>

          <nav className="flex-1 flex flex-col items-center gap-1">
            {navItems.map(item => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 group"
                  style={{
                    background: isActive ? 'rgba(41,182,246,0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(41,182,246,0.18)' : '1px solid transparent',
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-full"
                      style={{ background: '#29b6f6' }}
                    />
                  )}
                  <item.icon size={14} style={{ color: isActive ? '#4fc3f7' : 'rgba(107,107,138,0.6)' }} />
                  <div className="absolute left-12 px-2.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
                    style={{ background: 'rgba(8,8,14,0.98)', border: '1px solid rgba(255,255,255,0.07)', color: '#c4c4d8', zIndex: 100 }}>
                    {item.label}
                  </div>
                </Link>
              )
            })}
          </nav>

          <button
            onClick={handleSignOut}
            title="Disconnect"
            className="w-9 h-9 rounded-xl flex items-center justify-center group relative transition-all"
            style={{ border: '1px solid transparent' }}
          >
            <LogOut size={13} style={{ color: 'rgba(107,107,138,0.5)' }} />
            <div className="absolute left-12 px-2.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"
              style={{ background: 'rgba(8,8,14,0.98)', border: '1px solid rgba(255,71,87,0.15)', color: '#ff4757', zIndex: 100 }}>
              Disconnect
            </div>
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
