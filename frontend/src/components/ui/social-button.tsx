import { cn } from '@/lib/utils'

type SocialProvider = 'google' | 'apple'

const providers: Record<
  SocialProvider,
  { src: string; alt: string }
> = {
  google: { src: '/google.svg', alt: 'Google' },
  apple: { src: '/apple.svg', alt: 'Apple' },
}

type SocialButtonProps = {
  provider: SocialProvider
  label: string
  className?: string
  onClick?: () => void
}

export function SocialButton({
  provider,
  label,
  className,
  onClick,
}: SocialButtonProps) {
  const { src, alt } = providers[provider]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-[48px] w-full items-center justify-center gap-2.5 rounded-[14px] border border-border bg-surface text-[13px] font-semibold text-ink transition hover:bg-lavender',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={18}
        height={18}
        className={cn(
          'h-[18px] w-[18px] object-contain',
          provider === 'apple' && 'dark:invert',
        )}
      />
      {label}
    </button>
  )
}
