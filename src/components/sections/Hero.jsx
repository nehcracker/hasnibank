import { Link } from 'react-router-dom'
import Container from '@/components/ui/Container'
import Button from '@/components/ui/Button'
import styles from './Hero.module.css'

const IMAGES = {
  home:           'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1920&q=80',
  smeFinance:     'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1920&q=80',
  projectFunding: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1920&q=80',
  howItWorks:     'https://images.unsplash.com/photo-1560472355-536de3962603?auto=format&fit=crop&w=1920&q=80',
  about:          'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1920&q=80',
  team:           'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1920&q=80',
  insights:       'https://images.unsplash.com/photo-1453928582365-b6ad33cbcf64?auto=format&fit=crop&w=1920&q=80',
  contact:        'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1920&q=80',
}

export default function Hero({ imageKey = 'home', badge, heading, subheading, primaryCta, secondaryCta }) {
  const img = IMAGES[imageKey] ?? IMAGES.home

  return (
    <section
      className={styles.hero}
      style={{
        backgroundImage: `linear-gradient(rgba(var(--color-navy-rgb) / 0.72), rgba(var(--color-navy-rgb) / 0.88)), url(${img})`,
      }}
    >
      <Container>
        <div className={styles.content}>
          {badge && <span className={styles.badge}>{badge}</span>}
          <h1 className={styles.heading}>{heading}</h1>
          {subheading && <p className={styles.subheading}>{subheading}</p>}
          {(primaryCta || secondaryCta) && (
            <div className={styles.actions}>
              {primaryCta   && <Button href={primaryCta.href}  variant="primary">{primaryCta.label}</Button>}
              {secondaryCta && <Button href={secondaryCta.href} variant="outline">{secondaryCta.label}</Button>}
            </div>
          )}
        </div>
      </Container>
    </section>
  )
}
