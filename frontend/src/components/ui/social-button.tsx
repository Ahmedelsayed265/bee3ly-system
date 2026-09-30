import { cn } from '@/lib/utils';

type SocialProvider = 'google' | 'apple';

const providers: Record<SocialProvider, { src: string; alt: string }> = {
  google: { src: '/google.svg', alt: 'Google' },
  apple: { src: '/apple.svg', alt: 'Apple' },
};

type SocialButtonProps = {
  provider: SocialProvider;
  label: string;
  /** Shorter label on small screens so side-by-side buttons don’t feel cramped. */
  compactLabel?: string;
  className?: string;
  onClick?: () => void;
};

export function SocialButton({
  provider,
  label,
  compactLabel,
  className,
  onClick,
}: SocialButtonProps) {
  const { src, alt } = providers[provider];
  const mobileLabel = compactLabel ?? label;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-border bg-surface text-ink hover:bg-lavender flex h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-[14px] border px-2 text-[11px] leading-tight font-semibold transition sm:h-12 sm:gap-2.5 sm:px-3 sm:text-[13px] sm:leading-normal',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={18}
        height={18}
        className={cn(
          'h-4 w-4 shrink-0 object-contain sm:h-[18px] sm:w-[18px]',
          provider === 'apple' && 'dark:invert',
        )}
      />
      <span className="truncate sm:hidden">{mobileLabel}</span>
      <span className="hidden truncate sm:inline">{label}</span>
    </button>
  );
}
