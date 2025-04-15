import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

interface SettingsSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsSidebar({ open, onOpenChange }: SettingsSidebarProps) {
  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Configure answer generation</SheetTitle>
          </SheetHeader>
          <div className="space-y-6">
            {/* Prompt Template */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="prompt" className="text-sm font-medium">
                  Override prompt template
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Custom prompt template for the AI</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea id="prompt" className="min-h-[100px]" />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="temperature" className="text-sm font-medium">
                  Temperature
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Controls randomness in the output</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-4">
                <Slider id="temperature" min={0} max={5} step={0.1} defaultValue={[0.3]} className="flex-1" />
                <Input type="number" className="w-20" value="0.3" />
              </div>
            </div>

            {/* Seed */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="seed" className="text-sm font-medium">
                  Seed
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Random seed for reproducibility</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input id="seed" type="text" />
            </div>

            {/* Search and Reranker Scores */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="search-score" className="text-sm font-medium">
                    Minimum search score
                  </label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Minimum relevance score for search results</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input id="search-score" type="number" min="0" max="5" defaultValue="0" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="reranker-score" className="text-sm font-medium">
                    Minimum reranker score
                  </label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Minimum score for reranking results</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input id="reranker-score" type="number" min="0" max="5" defaultValue="0" />
              </div>
            </div>

            {/* Categories */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Include category</label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="policies">Policies</SelectItem>
                    <SelectItem value="coverage">Coverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Exclude category</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="policies">Policies</SelectItem>
                    <SelectItem value="coverage">Coverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="semantic-ranker" defaultChecked />
                <label
                  htmlFor="semantic-ranker"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Use semantic ranker for retrieval
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="semantic-captions" />
                <label
                  htmlFor="semantic-captions"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Use semantic captions
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="stream-response" defaultChecked />
                <label
                  htmlFor="stream-response"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Stream chat completion responses
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="follow-up" />
                <label
                  htmlFor="follow-up"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Suggest follow-up questions
                </label>
              </div>
            </div>

            {/* Retrieval Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Retrieval mode</label>
              <Select defaultValue="hybrid">
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">Vectors + Text (Hybrid)</SelectItem>
                  <SelectItem value="vectors">Vectors only</SelectItem>
                  <SelectItem value="text">Text only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}

