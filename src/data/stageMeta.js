// TODO confirm SLAs before launch
const stageMeta = [
  {
    key: 'submitted',
    label: 'Submitted',
    description:
      'Your application has been received and is queued for initial review by our financing team.',
    slaDays: [1, 2],
  },
  {
    key: 'kyc_verification',
    label: 'KYC Verification',
    description:
      'Our compliance team verifies your identity and business credentials against international regulatory standards.',
    slaDays: [3, 5],
  },
  {
    key: 'credit_assessment',
    label: 'Credit Assessment',
    description:
      'A senior analyst evaluates your financial profile, business performance, and funding requirements in detail.',
    slaDays: [5, 10],
  },
  {
    key: 'funder_matching',
    label: 'Funder Matching',
    description:
      "Hasni's global network is canvassed to identify the most suitable capital providers for your transaction.",
    slaDays: [10, 20],
  },
  {
    key: 'term_sheet',
    label: 'Term Sheet',
    description:
      'Preliminary financing terms are structured and prepared for your review and negotiation.',
    slaDays: [5, 10],
  },
  {
    key: 'offer_issued',
    label: 'Offer Issued',
    description:
      'A formal financing offer, including pricing and conditions, is presented for your consideration.',
    slaDays: [3, 7],
  },
  {
    key: 'offer_accepted',
    label: 'Offer Accepted',
    description:
      'You confirm acceptance of the financing terms, and documentation is prepared for execution.',
    slaDays: [3, 7],
  },
  {
    key: 'fee_payment',
    label: 'Fee Payment',
    description:
      'Applicable engagement or arrangement fees are settled to progress the transaction to disbursement.',
    slaDays: [2, 5],
  },
  {
    key: 'funded',
    label: 'Funded',
    description:
      'Capital is disbursed to your designated account, completing the financing process.',
    slaDays: [2, 5],
  },
]

export default stageMeta
