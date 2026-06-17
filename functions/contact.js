import { Resend } from 'resend'

export async function onRequestPost(context) {
  const { request, env } = context

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const { fullName, companyName, email, country, fundingRequirement, financingType, projectDescription } = body

  const errors = {}
  if (!fullName?.trim())           errors.fullName = 'Full name is required'
  if (!companyName?.trim())        errors.companyName = 'Company name is required'
  if (!email?.trim())              errors.email = 'Email is required'
  if (!country?.trim())            errors.country = 'Country is required'
  if (!fundingRequirement?.trim()) errors.fundingRequirement = 'Funding requirement is required'
  if (!financingType?.trim())      errors.financingType = 'Financing type is required'
  if (!projectDescription?.trim()) errors.projectDescription = 'Project description is required'

  if (Object.keys(errors).length) return json({ errors }, 422)

  const resend = new Resend(env.RESEND_API_KEY)

  try {
    await resend.emails.send({
      from: 'Hasni Bank <noreply@hasnibank.com>',
      to:   'financing@hasnibank.com',
      subject: `New Financing Inquiry — ${companyName}`,
      text: [
        `New financing inquiry from ${fullName} at ${companyName}.`,
        '',
        `Full Name:            ${fullName}`,
        `Company:              ${companyName}`,
        `Email:                ${email}`,
        `Country:              ${country}`,
        `Funding Requirement:  ${fundingRequirement}`,
        `Financing Type:       ${financingType}`,
        '',
        'Project Description:',
        projectDescription,
      ].join('\n'),
    })
  } catch (err) {
    console.error('Resend error:', err)
    return json({ error: 'Failed to send. Please try again.' }, 500)
  }

  return json({ success: true }, 200)
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
