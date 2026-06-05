import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-bold uppercase tracking-widest text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600 active:scale-95 shadow-md hover:shadow-lg focus-visible:ring-primary-500',
        secondary: 'bg-primary-100 text-primary-700 hover:bg-primary-200 active:scale-95 focus-visible:ring-primary-500',
        accent: 'bg-accent-coral text-white hover:bg-red-600 active:scale-95 shadow-md hover:shadow-lg focus-visible:ring-accent-coral',
        gold: 'bg-accent-gold text-white hover:bg-amber-600 active:scale-95 shadow-md hover:shadow-lg focus-visible:ring-accent-gold',
        ghost: 'text-primary-600 hover:bg-primary-50 active:scale-95',
        outline: 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 active:scale-95',
      },
      size: {
        sm: 'px-4 py-2 text-xs',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base',
        xl: 'px-10 py-5 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  icon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, icon, children, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isLoading || props.disabled}
      ref={ref}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
