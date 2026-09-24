import { Children, isValidElement, cloneElement } from 'react'
import { cn } from '@/lib/utils'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  stagger?: number
  duration?: number
  yOffset?: number
}

/**
 * ظهور متتابع للعناصر بـ CSS فقط.
 * النسخة السابقة (GSAP) كانت تُظهر المحتوى من الخادم ثم تخفيه فجأة بعد التحميل
 * وتعيد إظهاره — وميض واضح، وعلى الاتصال البطيء يبقى النموذج شبه مخفي.
 * هنا يبدأ الحركة مباشرة مع أول رسم، ويحترم «تقليل الحركة» من CSS.
 */
export function FadeInStagger({
  children,
  className,
  stagger = 0.06,
  duration = 0.45,
  yOffset = 16,
  style,
  ...props
}: Props) {
  let i = 0
  const items = Children.map(children, child => {
    if (!isValidElement<{ style?: React.CSSProperties }>(child)) return child
    const delay = `${(i++ * stagger).toFixed(2)}s`
    return cloneElement(child, { style: { ...child.props.style, animationDelay: delay } })
  })

  return (
    <div
      className={cn('fade-stagger', className)}
      style={{ ...style, ['--fs-dur' as string]: `${duration}s`, ['--fs-y' as string]: `${yOffset}px` }}
      {...props}
    >
      {items}
    </div>
  )
}
