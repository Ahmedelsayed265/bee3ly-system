import * as React from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils';

export type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  containerClassName?: string;
};

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      id,
      label,
      error,
      icon: Icon,
      type = 'text',
      className,
      containerClassName,
      ...props
    },
    ref,
  ) => {
    const { t } = useLocale();
    const [visible, setVisible] = React.useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (visible ? 'text' : 'password') : type;

    return (
      <div className={containerClassName}>
        {label && id ? <Label htmlFor={id}>{label}</Label> : null}
        <div className="relative">
          {Icon ? (
            <Icon className="text-muted pointer-events-none absolute inset-s-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          ) : null}
          <Input
            id={id}
            ref={ref}
            type={inputType}
            className={cn(
              'h-12 rounded-[14px] text-[14px]',
              Icon && 'ps-11',
              isPassword && 'pe-11',
              className,
            )}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setVisible((value) => !value)}
              className="text-muted hover:text-ink absolute inset-e-3.5 top-1/2 -translate-y-1/2"
              aria-label={visible ? t('hidePassword') : t('showPassword')}
            >
              {visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>
        {error ? <p className="text-danger mt-1 text-xs">{error}</p> : null}
      </div>
    );
  },
);
InputField.displayName = 'InputField';
