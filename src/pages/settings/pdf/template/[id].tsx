// app/settings/pdf/template/[id]/page.tsx
'use client'

import { TemplateEditorPage } from '@/components/settings/pdf/template/TemplateEditorPage'
import { templateApi } from '@/api/template'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { TemplateType, TemplateTypeValues } from '@/types/template'
import { toast } from 'sonner'

// Définissez un type qui correspond exactement à ce que vous attendez
interface TemplateState {
  id: number
  type: TemplateTypeValues
  content: string
  name: string
}

export default function EditTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const [template, setTemplate] = useState<TemplateState | null>(null)
  const [loading, setLoading] = useState(true)

  const id = params?.id

  useEffect(() => {
    if (!id) {
      toast.error('ID du template non valide')
      router.push('/settings/pdf/templates')
      return
    }

    const loadTemplate = async () => {
      try {
        const data = await templateApi.getById(Number(id))
        
        // Vérifiez que data contient bien toutes les propriétés nécessaires
        if (!data || !data.id || !data.type || !data.content || !data.name) {
          throw new Error('Données du template incomplètes')
        }
        
        const validTypes: TemplateTypeValues[] = ['invoice', 'quotation', 'payment']
        if (!validTypes.includes(data.type)) {
          toast.error('Type de template invalide')
          router.push('/settings/pdf/templates')
          return
        }
        
        // Créez un objet qui correspond exactement à TemplateState
        const templateData: TemplateState = {
          id: data.id,
          type: data.type,
          content: data.content,
          name: data.name
        }
        
        setTemplate(templateData)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Template non trouvé')
        router.push('/settings/pdf/templates')
      } finally {
        setLoading(false)
      }
    }

    loadTemplate()
  }, [id, router])

  if (loading) return <div className="p-4">Chargement du template...</div>
  if (!template) return null

  return (
    <TemplateEditorPage
      type={template.type as TemplateType}
      templateId={template.id}
      initialContent={template.content}
      initialName={template.name}
    />
  )
}
//Remarque:Voir recherche sur userClient et Component