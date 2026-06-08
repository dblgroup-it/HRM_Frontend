import { cn } from '@shared/lib';
import { getInitials, resolveMediaUrl } from '@shared/utils';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const resolved = resolveMediaUrl(src);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-700',
        sizes[size],
        className
      )}
      title={name}
    >
      {resolved ? (
        <img src={resolved} alt={name} className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
