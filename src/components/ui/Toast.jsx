import { createContext, useCallback, useContext, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, X } from 'lucide-react'

const ToastContext = createContext(() => {})

/** toast('Saved'), toast('Payout failed', 'error'). One toast at a time, 4 seconds. */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()
  const show = useCallback((message, tone = 'ok') => {
    window.clearTimeout(timer.current)
    setToast({ message, tone, key: Date.now() })
    timer.current = window.setTimeout(() => setToast(null), 4000)
  }, [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="fixed bottom-6 inset-x-4 z-[60] flex justify-center pointer-events-none">
        {toast && (
          <div key={toast.key} className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink-900 text-white pl-3 pr-5 py-2.5 shadow-xl text-sm max-w-full">
            <span className={clsx('grid place-items-center size-6 shrink-0 rounded-full', toast.tone === 'error' ? 'bg-danger-600' : 'bg-ok-600')}>
              {toast.tone === 'error' ? <X className="size-3.5" strokeWidth={3} /> : <Check className="size-3.5" strokeWidth={3} />}
            </span>
            <span className="min-w-0">{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
