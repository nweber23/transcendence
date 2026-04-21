import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, easeOut } from 'framer-motion'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import CasinoBackground from '@/components/ui/CasinoBackground'
import Beams from '@/components/ui/Beams'

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOut },
  },
}

const errorCodeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.1, duration: 0.6, ease: easeOut },
  },
}

const staggerVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { delay: 0.2 + i * 0.1, duration: 0.5 },
  }),
}

const reasonVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
}

const FALLBACK_REASONS = [
  "The house always wins, and today isn't your day.",
  "Access denied: Your luck ran out.",
  "This table is reserved for players with better odds.",
  "The dealer says no.",
  "Your chip stack doesn't grant you passage here.",
]

export function AccessDenied() {
  const navigate = useNavigate()
  const [reason, setReason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchReason = async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('https://naas.isalman.dev/no')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setReason(data.reason)
    } catch {
      setError(true)
      // Pick a random fallback reason
      const randomReason = FALLBACK_REASONS[Math.floor(Math.random() * FALLBACK_REASONS.length)]
      setReason(randomReason)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReason()
  }, [])

  return (
    <div className="min-h-screen bg-base relative overflow-hidden flex items-center justify-center">
      <CasinoBackground />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <Beams
          beamWidth={2.5}
          beamHeight={28}
          beamNumber={18}
          lightColor="#d4af37"
          speed={1.9}
          noiseIntensity={1.6}
          scale={0.18}
          rotation={35}
        />
      </div>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 text-center px-8 max-w-2xl"
      >
        {/* Error Code */}
        <motion.span
          variants={errorCodeVariants}
          className="text-9xl font-serif font-bold text-gold block leading-none"
        >
          403
        </motion.span>

        {/* Title */}
        <motion.h1
          custom={0}
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
          className="text-4xl md:text-5xl font-serif font-bold text-text mt-6 mb-4"
        >
          Access Denied
        </motion.h1>

        {/* Description */}
        <motion.p
          custom={1}
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
          className="text-lg text-text-2 mb-8 leading-relaxed"
        >
          Sorry, you don't have permission to access this area.
        </motion.p>

        {/* Reason Card */}
        <motion.div
          custom={2}
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <Card className="p-6 border border-border">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="space-y-2">
                  <div className="h-2 bg-gradient-to-r from-gold/0 via-gold to-gold/0 rounded-full w-48 animate-pulse" />
                  <p className="text-sm text-text-3">Consulting the dealer...</p>
                </div>
              </div>
            ) : reason ? (
              <motion.div
                key={reason}
                variants={reasonVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <p className="text-text text-lg italic">"{reason}"</p>
              </motion.div>
            ) : null}
          </Card>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          custom={3}
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
          className="flex gap-4 justify-center flex-wrap"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={fetchReason}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Another Excuse'}
          </Button>
          <Button
            variant="gold"
            size="lg"
            onClick={() => navigate('/')}
          >
            Return to Lobby
          </Button>
        </motion.div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-text-3 mt-4"
          >
            (Using house rules for excuses)
          </motion.p>
        )}
      </motion.main>
    </div>
  )
}
