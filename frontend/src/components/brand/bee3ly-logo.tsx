import { cn } from '@/lib/utils'

type Bee3lyLogoProps = {
  className?: string
  markClassName?: string
  withWordmark?: boolean
  /** brand = primary mark; light = surface mark; ink = text mark; onDark = primary mark + light wordmark */
  tone?: 'brand' | 'light' | 'ink' | 'onDark'
}

/** Official growth-path mark */
export function Bee3lyMark({
  className,
  tone = 'brand',
}: {
  className?: string
  tone?: Exclude<Bee3lyLogoProps['tone'], 'onDark'> | 'brand'
}) {
  const resolved = tone === 'brand' || !tone ? 'brand' : tone
  const bg =
    resolved === 'brand' ? '#6366F1' : resolved === 'light' ? '#F8FAFC' : '#0F172A'
  const stroke =
    resolved === 'brand' ? '#FFFFFF' : resolved === 'light' ? '#6366F1' : '#F8FAFC'

  return (
    <svg
      width="88"
      height="88"
      viewBox="0 0 120 120"
      role="img"
      aria-label="bee3ly logo mark"
      className={cn('shrink-0', className)}
    >
      <rect x="0" y="0" width="120" height="120" rx="28" fill={bg} />
      <path
        d="M32 78 L54 56 L70 70 L90 40"
        stroke={stroke}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="90" cy="40" r="9" fill={stroke} />
    </svg>
  )
}

export function Bee3lyLogo({
  className,
  markClassName,
  withWordmark = true,
  tone = 'brand',
}: Bee3lyLogoProps) {
  const markTone = tone === 'onDark' ? 'brand' : tone
  const wordColor = tone === 'onDark' || tone === 'light' ? 'text-[#F8FAFC]' : 'text-ink'
  const accentColor =
    tone === 'onDark' || tone === 'light' ? 'text-[#818CF8]' : 'text-brand'

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Bee3lyMark className={cn('h-10 w-10', markClassName)} tone={markTone} />
      {withWordmark ? (
        <span
          className={cn(
            'font-display text-[1.65rem] font-bold leading-none tracking-tight',
            wordColor,
          )}
        >
          bee
          <span className={accentColor}>3</span>
          ly
        </span>
      ) : null}
      <span className="sr-only">bee3ly</span>
    </span>
  )
}
