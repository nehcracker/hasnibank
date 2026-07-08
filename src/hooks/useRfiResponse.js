import { useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Shared borrower-side RFI response mutation, used by the My Application
 * action card and the Documents page.
 *
 * respondRfi(rfi, { file })  - document response: upload + document row
 * respondRfi(rfi, { value }) - text or figure response
 */
export function useRfiResponse({ application, user, onDone }) {
  const [respondingRfiId, setRespondingRfiId] = useState(null)

  async function respondRfi(rfi, response) {
    setRespondingRfiId(rfi.id)
    try {
      let responsePayload

      if (response.file) {
        const path = `${application.id}/rfi-${rfi.id}-${Date.now()}-${response.file.name}`
        const { error: uploadError } = await supabase.storage
          .from('application-documents')
          .upload(path, response.file)
        if (uploadError) throw uploadError

        const { data: doc, error: docError } = await supabase
          .from('application_documents')
          .insert({
            application_id: application.id,
            document_type: 'rfi_response',
            label: response.file.name,
            note: 'Uploaded in response to an information request',
            storage_path: path,
            uploaded_by: user.id,
          })
          .select()
          .single()
        if (docError) throw docError
        responsePayload = { document_id: doc.id, label: response.file.name }
      } else {
        responsePayload = { value: response.value }
      }

      const { error: updateError } = await supabase
        .from('information_requests')
        .update({
          status: 'responded',
          responded_at: new Date().toISOString(),
          response_payload: responsePayload,
        })
        .eq('id', rfi.id)
      if (updateError) throw updateError

      await supabase.from('application_events').insert({
        application_id: application.id,
        actor_id: user.id,
        actor_role: 'borrower',
        event_type: 'rfi',
        payload: { action: 'responded', prompt: rfi.prompt },
      })
      await onDone?.()
    } catch (error) {
      console.error('[useRfiResponse] response failed:', error.message)
    }
    setRespondingRfiId(null)
  }

  return { respondRfi, respondingRfiId }
}
