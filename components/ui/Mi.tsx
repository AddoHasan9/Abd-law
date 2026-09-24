/** أيقونة Material صغيرة تنساب داخل النص — بديل الإيموجي (التي تختلف بين iPhone وAndroid وWindows) */
export function Mi({ n, className = '' }: { n: string; className?: string }) {
  return <span className={`material-symbols-outlined mi ${className}`} aria-hidden>{n}</span>
}
