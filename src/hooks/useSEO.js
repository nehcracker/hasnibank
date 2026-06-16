import { useEffect } from 'react'

export function useSEO({ title, description, keywords, canonical, structuredData }) {
  useEffect(() => {
    document.title = title

    setMeta('name', 'description', description)
    if (keywords) setMeta('name', 'keywords', keywords)
    if (canonical) setLink('canonical', canonical)

    if (structuredData) {
      document.querySelectorAll('script[data-sd]').forEach(el => el.remove())
      const items = Array.isArray(structuredData) ? structuredData : [structuredData]
      items.forEach((sd, i) => {
        const script = document.createElement('script')
        script.setAttribute('data-sd', String(i))
        script.type = 'application/ld+json'
        script.textContent = JSON.stringify(sd)
        document.head.appendChild(script)
      })
    }

    return () => {
      document.querySelectorAll('script[data-sd]').forEach(el => el.remove())
    }
  }, [title, description, keywords, canonical, structuredData])
}

function setMeta(attr, key, value) {
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

function setLink(rel, href) {
  let el = document.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}
