import * as React from "react"

interface TabsContextValue {
  selectedValue: string
  onChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

function useTabs() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within a TabsProvider")
  }
  return context
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState(defaultValue)
    
    const actualValue = value ?? selectedValue
    const handleValueChange = onValueChange ?? setSelectedValue

    return (
      <TabsContext.Provider
        value={{
          selectedValue: actualValue,
          onChange: handleValueChange,
        }}
      >
        <div ref={ref} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    )
  }
)
Tabs.displayName = "Tabs"

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-600"
        {...props}
      />
    )
  }
)
TabsList.displayName = "TabsList"

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, className, ...props }, ref) => {
    const { selectedValue, onChange } = useTabs()
    const isSelected = selectedValue === value

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
          isSelected
            ? "bg-white text-blue-600 shadow-sm"
            : "text-gray-600 hover:text-gray-900"
        }`}
        onClick={() => onChange(value)}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, ...props }, ref) => {
    const { selectedValue } = useTabs()
    const isSelected = selectedValue === value

    if (!isSelected) return null

    return (
      <div
        ref={ref}
        role="tabpanel"
        {...props}
      />
    )
  }
)
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }