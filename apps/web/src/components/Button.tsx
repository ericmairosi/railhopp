import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'railway' | 'terminal' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      fullWidth,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

    const variants = {
      primary:
        'bg-railway-red-600 text-white hover:bg-railway-red-700 focus:ring-railway-red-500 shadow-railway',
      secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 focus:ring-slate-500',
      railway:
        'bg-gradient-to-r from-railway-red-600 to-railway-red-700 text-white hover:from-railway-red-700 hover:to-railway-red-800 focus:ring-railway-red-500 shadow-railway',
      terminal:
        'bg-railway-terminal-background text-railway-terminal-green border-2 border-railway-terminal-green hover:bg-railway-terminal-green hover:text-railway-terminal-background focus:ring-railway-terminal-green font-mono uppercase tracking-wide shadow-terminal',
      ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-500',
      outline:
        'border-2 border-railway-red-600 text-railway-red-600 hover:bg-railway-red-600 hover:text-white focus:ring-railway-red-500',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-6 py-3 text-base rounded-lg',
      xl: 'px-8 py-4 text-lg rounded-xl',
    }

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
