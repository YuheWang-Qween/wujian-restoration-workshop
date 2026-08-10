import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/*
 * UI_SPEC section 5.4 is the single source of truth for button appearance.
 * The variants below are the spec's class strings verbatim, so <Button> and the
 * hand-written spec strings used elsewhere in the app render identically:
 *   primary   -> variant="default"
 *   secondary -> variant="outline" (and "secondary", aliased to the same look)
 *   ghost     -> variant="ghost"
 *   danger    -> variant="destructive"
 * Heights are limited to the h-8 / h-9 / h-10 ladder. No gradients, no
 * shadow-color glow, no transform on hover, and no opacity-based disabled state
 * (section 5.3: disabled uses explicit dim tokens so text stays legible).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lab-green/50 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-lab-green text-lab-green-ink hover:bg-lab-green/90 disabled:bg-lab-border disabled:text-lab-dim',
        destructive:
          'border border-lab-red/40 bg-lab-red/10 text-lab-red hover:border-lab-red/60 hover:bg-lab-red/15 disabled:border-lab-line disabled:bg-transparent disabled:text-lab-dim',
        outline:
          'border border-lab-border bg-transparent text-lab-text hover:border-lab-green/45 hover:bg-lab-raised disabled:border-lab-line disabled:text-lab-dim',
        secondary:
          'border border-lab-border bg-transparent text-lab-text hover:border-lab-green/45 hover:bg-lab-raised disabled:border-lab-line disabled:text-lab-dim',
        ghost:
          'text-lab-muted hover:bg-lab-raised hover:text-lab-text disabled:text-lab-dim',
        link: 'text-lab-green underline-offset-4 hover:underline disabled:text-lab-dim',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3',
        lg: 'h-10 px-6',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
