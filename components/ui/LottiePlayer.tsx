'use client'

import React, { useEffect, useState } from 'react'
import { Lottie } from 'lottie-react'

interface LottiePlayerProps {
  animationData: any
  loop?: boolean
  autoplay?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function LottiePlayer({
  animationData,
  loop = true,
  autoplay = true,
  className = '',
  style = {},
}: LottiePlayerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !animationData) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      />
    )
  }

  return (
    <Lottie
      src={animationData}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
    />
  )
}
