import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  'w-full rounded-2xl border font-medium transition-all duration-200 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'border-primary-200 bg-primary-50 text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:ring-primary-500/10',
        light: 'border-white/80 bg-white/50 backdrop-blur-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:bg-white focus:ring-primary-500/10',
        dark: 'border-white/12 bg-white/6 backdrop-blur-sm text-white placeholder:text-white/50 focus:border-primary-400 focus:bg-white/10 focus:ring-primary-500/20',
      },
      size: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-5 py-3 text-base',
        lg: 'px-6 py-4 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, ...props }, ref) => (
    <input
      className={cn(inputVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input, inputVariants }
