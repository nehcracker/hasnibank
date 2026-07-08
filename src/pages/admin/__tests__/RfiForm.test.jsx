import { render, screen, fireEvent } from '@testing-library/react'
import RfiForm from '../RfiForm'

function options() {
  return screen.getAllByRole('option').map((o) => o.textContent)
}

test('document upload is offered once an offer has been issued', () => {
  render(<RfiForm onSave={vi.fn()} onCancel={vi.fn()} documentsAllowed />)
  expect(options()).toContain('Document upload')
})

test('document upload is not offered before an offer is issued', () => {
  render(<RfiForm onSave={vi.fn()} onCancel={vi.fn()} documentsAllowed={false} />)
  expect(options()).not.toContain('Document upload')
  expect(screen.getByText(/document requests unlock once an offer is issued/i)).toBeInTheDocument()
})

test('written answer and figure remain available before an offer', () => {
  render(<RfiForm onSave={vi.fn()} onCancel={vi.fn()} documentsAllowed={false} />)
  expect(options()).toEqual(expect.arrayContaining(['Written answer', 'Figure']))
})

test('extended-section templates are offered once an offer has been issued', () => {
  const sectionTemplates = [
    {
      key: 'collateral',
      label: 'Collateral and security',
      fields: [{ label: 'Collateral type' }, { label: 'Estimated value' }],
    },
  ]
  render(
    <RfiForm onSave={vi.fn()} onCancel={vi.fn()} documentsAllowed sectionTemplates={sectionTemplates} />
  )
  expect(screen.getByRole('button', { name: /collateral and security/i })).toBeInTheDocument()
})

test('clicking a section template fills the prompt with its field labels', () => {
  const sectionTemplates = [
    {
      key: 'collateral',
      label: 'Collateral and security',
      fields: [{ label: 'Collateral type' }, { label: 'Estimated value' }],
    },
  ]
  render(
    <RfiForm onSave={vi.fn()} onCancel={vi.fn()} documentsAllowed sectionTemplates={sectionTemplates} />
  )
  fireEvent.click(screen.getByRole('button', { name: /collateral and security/i }))
  expect(screen.getByPlaceholderText(/describe the item precisely/i)).toHaveValue(
    'Collateral and security: Collateral type; Estimated value'
  )
})

test('no section templates render before an offer has been issued', () => {
  const sectionTemplates = [
    { key: 'collateral', label: 'Collateral and security', fields: [{ label: 'Collateral type' }] },
  ]
  render(
    <RfiForm
      onSave={vi.fn()}
      onCancel={vi.fn()}
      documentsAllowed={false}
      sectionTemplates={sectionTemplates}
    />
  )
  expect(screen.queryByRole('button', { name: /collateral and security/i })).not.toBeInTheDocument()
})
