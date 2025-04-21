import * as React from "react"

export interface SwitchProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLDivElement, SwitchProps>(
  ({ checked = false, onCheckedChange, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange && onCheckedChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
        {...props}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </div>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }