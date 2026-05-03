import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full rounded-lg border border-fortune-hairline bg-fortune-canvas px-3.5 py-2 text-base text-fortune-ink-deep placeholder:text-fortune-stone outline-none focus-visible:border-2 focus-visible:border-fortune-fb-blue disabled:opacity-50 aria-invalid:border-fortune-critical-strong",
        className
      )}
      {...props}
    />
  )
}

export { Input }
