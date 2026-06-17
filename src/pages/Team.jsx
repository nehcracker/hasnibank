import { useSEO } from '@/hooks/useSEO'
import { seoConfig } from '@/seo/seoConfig'
import { team } from '@/data/teamData'
import Hero from '@/components/sections/Hero'
import CtaBand from '@/components/sections/CtaBand'
import Container from '@/components/ui/Container'
import SectionHeading from '@/components/ui/SectionHeading'
import styles from './Team.module.css'

export default function Team() {
  useSEO(seoConfig.team)

  return (
    <>
      <Hero
        imageKey="team"
        badge="Our Team"
        heading="Financing Expertise, Globally Connected"
        subheading="Decades of combined experience in international finance, structured credit, and capital markets."
        primaryCta={{ label: 'Work With Us', href: '/contact' }}
      />
      <section className={styles.section}>
        <Container>
          <SectionHeading
            label="Leadership"
            title="The People Behind Hasni Bank"
            subtitle="A team of seasoned professionals with deep networks across global capital markets."
          />
          <div className={styles.grid}>
            {team.map(member => (
              <div key={member.name} className={styles.card}>
                <div className={styles.avatar}>
                  <span className={styles.initials}>
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <h3 className={styles.name}>{member.name}</h3>
                <p className={styles.title}>{member.title}</p>
                <p className={styles.bio}>{member.bio}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <CtaBand heading="Join Our Network" subheading="We work with experienced finance professionals and institutional partners worldwide." />
    </>
  )
}
