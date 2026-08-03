import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * پەنجەرە و ڕووپۆشەکان ڕاستەوخۆ دەخاتە سەر <body>.
 * بەبێ ئەمە، هەر شتێکی fixed کە لەناو ناوچەی سکرۆڵدا بێت دەکەوێتە
 * ژێر ناڤیگەیشنی خوارەوە لەسەر iOS (بەهۆی ستاکینگ کۆنتێکستی سکرۆڵەکە).
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [el] = useState(() => (typeof document === 'undefined' ? null : document.createElement('div')))

  useEffect(() => {
    if (!el) return
    el.setAttribute('data-portal', '')
    document.body.appendChild(el)
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el)
    }
  }, [el])

  if (!el) return null
  return createPortal(children, el)
}
