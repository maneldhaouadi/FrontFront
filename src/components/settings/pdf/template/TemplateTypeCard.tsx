'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useState } from 'react'
import { CreateTemplateDialog } from './CreateTemplateDialog'
import { TemplateType } from "@/types/template"
import { Edit2, Save, X } from 'lucide-react' // Icônes pour l'édition
import { Input } from "@/components/ui/input"

interface TemplateTypeCardProps {
  type: TemplateType
  title: string
  icon: React.ReactNode
  description: string
  onNameUpdate?: (newName: string) => Promise<void> // Callback pour la mise à jour
}

export function TemplateTypeCard({ type, title, icon, description, onNameUpdate }: TemplateTypeCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!onNameUpdate) return
    
    try {
      setIsLoading(true)
      await onNameUpdate(editedTitle)
      setIsEditing(false)
    } catch (error) {
      console.error("Erreur lors de la mise à jour du nom", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className="p-6 hover:shadow-md transition-shadow hover:border-primary">
        <div className="flex flex-col items-center text-center h-full">
          <div className="p-3 mb-4 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
          
          {/* Section titre avec édition */}
          <div className="flex items-center gap-2 mb-2">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="h-8 w-auto text-center"
                disabled={isLoading}
              />
            ) : (
              <h3 className="text-xl font-semibold">{title}</h3>
            )}
            
            {onNameUpdate && (
              isEditing ? (
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setIsEditing(false)
                      setEditedTitle(title) // Réinitialiser
                    }}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )
            )}
          </div>

          <p className="text-muted-foreground mb-6 flex-grow">
            {description}
          </p>
          <Button 
            className="w-full" 
            onClick={() => setDialogOpen(true)}
          >
            Créer un modèle
          </Button>
        </div>
      </Card>

      <CreateTemplateDialog 
        open={dialogOpen}
        type={type}
        onOpenChange={setDialogOpen}
      />
    </>
  )
}