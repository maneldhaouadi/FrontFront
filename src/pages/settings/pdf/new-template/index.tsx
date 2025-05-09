'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { TemplateEditorPage } from "@/components/settings/pdf/template/TemplateEditorPage"
import { getEmptyTemplate } from '@/lib/template-utils'
import { notFound } from 'next/navigation'
import { TemplateTypeSelection } from '../template/TemplateTypeSelection'
import { useState, useEffect } from 'react'
import { TemplateType, TemplateTypeValues } from '@/types/template'

interface TemplateState {
  id?: number
  type: TemplateType // Utilisez TemplateType au lieu de TemplateTypeValues
  content: string
  name: string
}

export default function NewTemplatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type')
  const name = searchParams.get('name') || 'Nouveau modèle'

  const validTypes = ['invoice', 'quotation', 'payment'] as const
  const normalizedType = type?.toLowerCase()

  const [template, setTemplate] = useState<TemplateState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (normalizedType && validTypes.includes(normalizedType as TemplateType)) {
      setTemplate({
        type: normalizedType as TemplateType, // Conversion explicite
        content: getEmptyTemplate(normalizedType as TemplateType),
        name: name
      })
      setLoading(false)
    }
  }, [normalizedType, name])

  if (type && (!normalizedType || !validTypes.includes(normalizedType as TemplateType))) {
    return notFound()
  }

  if (!normalizedType) {
    return (
      <div className="p-8">
        <TemplateTypeSelection />
      </div>
    )
  }

  if (loading || !template) {
    return <div className="p-8">Chargement...</div>
  }

  // app/settings/pdf/new-template/page.tsx
return (
  <div className="flex-1 flex flex-col overflow-hidden p-8">
    <TemplateEditorPage
      type={normalizedType as TemplateType} // Conversion explicite
      initialName={template.name}
      initialContent={template.content}
      templateData={{ type: normalizedType }} // Ajout de templateData
    />
  </div>
)
}