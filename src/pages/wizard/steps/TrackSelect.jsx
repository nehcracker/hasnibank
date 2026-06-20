import { financingTracks } from '@/data/financingData'
import styles from '../Wizard.module.css'

export default function TrackSelect({ selectedTrack, onSelect }) {
  return (
    <div>
      <h2 className={styles.sectionTitle}>Select your financing track</h2>
      <p className={styles.sectionSub}>Choose the type of financing that best fits your needs.</p>
      <div className={styles.trackGrid}>
        {financingTracks.map((track) => (
          <button
            key={track.id}
            type="button"
            className={`${styles.trackCard} ${selectedTrack === track.id ? styles.selected : ''}`}
            onClick={() => onSelect(track.id)}
          >
            <span className={styles.trackBadge}>{track.badge}</span>
            <div className={styles.trackTitle}>{track.title}</div>
            <div className={styles.trackDesc}>{track.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
