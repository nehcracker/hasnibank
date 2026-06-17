import { useEffect } from 'react'

export function useSEO({ title, description, keywords, canonical, ogImage, structuredData }) {
  useEffect(() => {
    document.title = title

    setMeta('name', 'description', description)
    setMeta('name', 'robots', 'index, follow')
    if (keywords) setMeta('name', 'keywords', keywords)
    if (canonical) setLink('canonical', canonical)

    // Open Graph
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', 'Hasni Bank')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    if (canonical) setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:image', ogImage || 'https://hasnibank.com/android-chrome-512x512.png')
    setMeta('property', 'og:locale', 'en_US')

    // Twitter Card
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', ogImage || 'https://hasnibank.com/android-chrome-512x512.png')

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
  }, [title, description, keywords, canonical, ogImage, structuredData])
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
