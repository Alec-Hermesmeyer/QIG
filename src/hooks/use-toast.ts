// hooks/use-toast.ts
'use client';

import { useToast as useToastOriginal } from "@/components/ui/toast";

export const useToast = useToastOriginal;

// Re-export for direct import
export { toast } from "@/components/ui/toast";