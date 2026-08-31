'use client'

import React from 'react'
import NumberFlow, { type Format } from '@number-flow/react'

interface Props {
  value: number
  format?: Format
  className?: string
}

export function RollingNumber({ value, format, className = '' }: Props) {
  return (
    <NumberFlow
      value={value}
      format={format}
      className={`num transition-all duration-300 font-extrabold ${className}`}
    />
  )
}
