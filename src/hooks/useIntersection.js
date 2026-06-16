import { useState, useEffect, useRef } from 'react'

export function useIntersection(threshold = 0.15) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => {
      observer.unobserve(el)
      observer.disconnect()
    }
  }, [threshold])

  return { ref, isVisible }
}
