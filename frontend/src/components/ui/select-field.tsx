import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type SelectFieldOption = {
  value: string;
  label: string;
};

type SelectFieldProps = {
  id?: string;
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
};

export function SelectField({
  id,
  label,
  value,
  onValueChange,
  options,
  placeholder,
  error,
  disabled,
  className,
}: SelectFieldProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {label && id ? <Label htmlFor={id}>{label}</Label> : null}
      <Select
        value={value || undefined}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={Boolean(error) || undefined}
          className={cn(
            error && 'border-danger focus:border-danger focus:ring-danger/20',
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-danger mt-1.5 text-sm">{error}</p> : null}
    </div>
  );
}
