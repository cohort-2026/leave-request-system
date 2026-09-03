/**
 * Usage: <Button variant="primary" type="submit">Sign in</Button>
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'

type ButtonProps = {
  variant?: ButtonVariant
  className?: string
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = ['button', `button-${variant}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} data-variant={variant} className={classes} {...rest}>
      {children}
    </button>
  )
}
