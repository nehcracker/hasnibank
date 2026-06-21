import styles from './Status.module.css'

export default function ActionZone({ status, onAcceptOffer, accepting }) {
  return (
    <div className={styles.actionZone}>
      <h3 className={styles.actionTitle}>Next Steps</h3>
      <ActionContent status={status} onAcceptOffer={onAcceptOffer} accepting={accepting} />
    </div>
  )
}

function ActionContent({ status, onAcceptOffer, accepting }) {
  if (status === 'funded') {
    return (
      <p className={`${styles.actionMsg} ${styles.fundedMsg}`}>
        Congratulations — your financing has been funded. Our team will be in touch with
        final disbursement details.
      </p>
    )
  }

  if (status === 'offer_issued') {
    return (
      <>
        <p className={styles.actionMsg}>
          Your offer letter is ready. Review the terms and accept to proceed.
        </p>
        <button
          className={styles.acceptBtn}
          onClick={onAcceptOffer}
          disabled={accepting}
        >
          {accepting ? 'Accepting…' : 'Accept Offer'}
        </button>
      </>
    )
  }

  if (status === 'offer_accepted') {
    return (
      <p className={styles.actionMsg}>
        You have accepted the offer. Our team is preparing the next steps.
      </p>
    )
  }

  return (
    <p className={styles.actionMsg}>
      Your financing application is <strong>being reviewed</strong> by our team. We will
      be in touch as it advances through each stage.
    </p>
  )
}
