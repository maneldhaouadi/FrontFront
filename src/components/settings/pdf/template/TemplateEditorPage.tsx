import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { TemplateEditorHeader } from './TemplateEditorHeader'
import { useState, useEffect } from 'react' // Ajout de useEffect
import TiptapEditor from './TemplateEditor'
import { templateApi } from '@/api/template'
import { Template, TemplateType, TemplateTypeValues } from '@/types/template'
import { toast } from 'sonner'

interface TemplateEditorPageProps {
  type: TemplateType
  initialContent?: string
  initialName?: string
  templateId?: number
  templateData?: Template;
}

export function TemplateEditorPage({ 
  type: initialType, // Renommage pour éviter la confusion
  initialContent = '', 
  initialName = '', 
  templateId,
  templateData,
}: TemplateEditorPageProps) {
  const router = useRouter()
  const [content, setContent] = useState(initialContent)
  const [name, setName] = useState(initialName)
  const [isSaving, setIsSaving] = useState(false)
  const [type, setType] = useState<TemplateType>(initialType) // État séparé pour le type

  // Effet pour mettre à jour le type si templateData change
  useEffect(() => {
    if (templateData?.type) {
      setType(templateData.type)
    }
  }, [templateData])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      if (!name.trim()) {
        toast.error('Le nom du modèle est requis')
        return
      }
      
      if (!content.trim()) {
        toast.error('Le contenu du modèle ne peut pas être vide')
        return
      }

      const templateData = {
        name,
        content,
        type: type, // Utilisation de l'état type plutôt que la prop
        isDefault: false
      }

      if (templateId) {
        await templateApi.update(templateId, templateData)
        toast.success('Modèle mis à jour avec succès')
        router.push(`/settings/pdf/templates?updated=true`)
      } else {
        await templateApi.create(templateData)
        toast.success('Modèle créé avec succès')
        router.push('/settings/pdf/templates?created=true')
      }
      
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <TemplateEditorHeader 
        type={type} // Passage de l'état type
        onBack={() => router.push('/settings/pdf/templates')}
        name={name}
        onNameChange={setName}
      />
      
      <div className="bg-white rounded-lg shadow border mt-6">
      <TiptapEditor
  value={content}
  onChange={setContent}
  templateData={templateData}
  templateId={templateId}
  templateName={name} // Ajoutez cette ligne
  onNameChange={async (newName) => {
    setName(newName);
    return Promise.resolve(); // Retourne une promesse résolue
  }}
/>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Button 
          variant="outline" 
          onClick={() => router.push('/settings/pdf/templates')}
          disabled={isSaving}
        >
          Annuler
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Sauvegarde en cours...' : 'Sauvegarder le modèle'}
        </Button>
      </div>
    </div>
  )
}