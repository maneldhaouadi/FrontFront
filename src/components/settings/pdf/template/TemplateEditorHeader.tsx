// components/templates/TemplateEditorHeader.tsx
'use client'

import { Button } from '@/components/ui/button'
import { TemplateTypeValues } from '@/types/template'
import { ArrowLeft } from 'lucide-react'

interface TemplateEditorHeaderProps {
  type: TemplateTypeValues
  onBack: () => void
  name: string
  onNameChange: (name: string) => void
}

export function TemplateEditorHeader({ type, onBack }: TemplateEditorHeaderProps) {
  const getTitle = () => {
    switch(type) {
      case 'invoice': return 'de facture'
      case 'quotation': return 'de devis'
      case 'payment': return 'de paiement'
      default: return ''
    }
  }

  return (
    <div className="flex items-center gap-4 mb-6">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div>
        <h1 className="text-2xl font-bold">
          Créer un nouveau modèle {getTitle()}
        </h1>
        <p className="text-muted-foreground">
          Utilisez l'éditeur ci-dessous pour créer votre template
        </p>
      </div>
    </div>

    
  )
}