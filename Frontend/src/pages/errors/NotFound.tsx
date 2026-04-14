import { useNavigate } from 'react-router-dom'
import { motion, easeOut } from 'framer-motion'
import Button from '@/components/ui/Button'
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

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-base relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <Beams
          beamWidth={2.5}
          beamHeight={28}
          beamNumber={18}
          lightColor="#d4af37"
          speed={1.9}
          noiseIntensity={1.6}
          scale={0.18}
          rotation={15}
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
          404
        </motion.span>

        {/* Title */}
        <motion.h1
          custom={0}
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
          className="text-4xl md:text-5xl font-serif font-bold text-text mt-6 mb-4"
        >
          This Table Doesn't Exist
        </motion.h1>

        {/* Description */}
        <motion.p
          custom={1}
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
          className="text-lg text-text-2 mb-8 leading-relaxed"
        >
          The page you're looking for seems to have been cleared from the floor.
          Perhaps you took a wrong turn at the roulette wheel?
        </motion.p>

        {/* CTA Button */}
        <motion.div
          custom={2}
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
          className="flex gap-4 justify-center"
        >
          <Button
            variant="gold"
            size="lg"
            onClick={() => navigate('/')}
          >
            Return to Lobby
          </Button>
        </motion.div>
      </motion.main>
    </div>
  )
}
