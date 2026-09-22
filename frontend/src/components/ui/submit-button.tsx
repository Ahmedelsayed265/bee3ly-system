import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils';

type SubmitButtonProps = Omit<ButtonProps, 'type' | 'children'> & {
  label: string;
  loadingLabel?: string;
  loading?: boolean;
};

export function SubmitButton({
  label,
  loadingLabel,
  loading = false,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { dir } = useLocale();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <Button
      type="submit"
      disabled={disabled || loading}
      className={cn('h-[52px] w-full rounded-[14px] text-[15px]', className)}
      {...props}
    >
      {loading ? (loadingLabel ?? label) : label}
      <Arrow className="h-4 w-4" />
    </Button>
  );
}
