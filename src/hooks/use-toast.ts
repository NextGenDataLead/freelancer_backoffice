import { toast } from 'sonner'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  return {
    toast: ({ title, description, variant = 'default' }: ToastProps) => {
      const message = description ? `${title}: ${description}` : title

      if (variant === 'destructive') {
        toast.error(message)
      } else {
        toast.success(message)
      }
    }
  }
}