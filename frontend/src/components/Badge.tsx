import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-700 border border-primary-200',
        primary: 'bg-primary-500 text-white',
        secondary: 'bg-primary-50 text-primary-600 border border-primary-200',
        success: 'bg-success-50 text-success-600 border border-success-200',
        warning: 'bg-warning-50 text-warning-600 border border-warning-200',
        error: 'bg-error-50 text-error-600 border border-error-200',
        info: 'bg-info-50 text-info-600 border border-info-200',
        coral: 'bg-red-50 text-accent-coral border border-red-200',
        gold: 'bg-amber-50 text-accent-gold border border-amber-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div className={cn(badgeVariants({ variant, className }))} ref={ref} {...props} />
  )
)
Badge.displayName = 'Badge'

export { Badge, badgeVariants }
