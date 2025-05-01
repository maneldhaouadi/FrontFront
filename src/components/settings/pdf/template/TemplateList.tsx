'use client'

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { TemplateType, Template } from "@/types/template"
import { templateApi } from "@/api/template"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Loader2 } from "lucide-react";

interface TemplateListProps {
  type: TemplateType
}

export function TemplateList({ type }: TemplateListProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const data = await templateApi.findByType(type)
        setTemplates(data)
      } catch (err) {
        console.error("Template loading error:", err)
        setError(err instanceof Error ? err.message : "Erreur inconnue")
        toast.error("Échec du chargement", {
          description: "Impossible de charger les templates"
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadTemplates()
  }, [type])

  if (isLoading) return <TemplateSkeleton />
  if (error) return <ErrorState error={error} type={type} />
  if (templates.length === 0) return <EmptyState type={type} />

  return (
    <div className="grid grid-cols-1 gap-4">
      {templates.map(template => (
        <TemplateItem key={template.id} template={template} type={type} />
      ))}
    </div>
  )
}

const TemplateItem = ({ template, type }: { template: Template; type: TemplateType }) => {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState<string | null>(null)

  const handleDownload = async (format: 'pdf' | 'docx' | 'png' | 'jpeg') => {
    try {
      setIsDownloading(true)
      setDownloadFormat(format)
      
      const blob = await templateApi.exportTemplate(template.id, format)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.name.replace(/[^\w]/g, '_')}_${new Date().toISOString().slice(0,10)}.${format}`
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        a.remove()
      }, 100)

      toast.success(`Template téléchargé (${format.toUpperCase()})`)
    } catch (error) {
      toast.error('Échec du téléchargement', {
        description: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    } finally {
      setIsDownloading(false)
      setDownloadFormat(null)
    }
  }

  return (
    <Card className="p-4 flex justify-between items-center">
      <div>
        <h3 className="font-medium">{template.name}</h3>
        <p className="text-sm text-muted-foreground">
          {template.isDefault && (
            <span className="inline-flex items-center mr-2">
              ⭐ Par défaut
            </span>
          )}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/settings/pdf/template/${template.id}`}>
            Éditer
          </Link>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" disabled={isDownloading}>
              {isDownloading ? (
                <>
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />                  {downloadFormat?.toUpperCase()}
                </>
              ) : (
                'Télécharger'
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownload('pdf')}>
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('docx')}>
              Word (DOCX)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('png')}>
              Image (PNG)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('jpeg')}>
              Image (JPEG)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}

// Les autres sous-composants restent inchangés
const TemplateSkeleton = () => (
  <div className="grid grid-cols-1 gap-4">
    {[...Array(3)].map((_, i) => (
      <Card key={i} className="p-4 flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </Card>
    ))}
  </div>
)

const ErrorState = ({ error, type }: { error: string; type: TemplateType }) => (
  <div className="text-center py-8 space-y-2">
    <p className="text-destructive">{error}</p>
    <Button onClick={() => window.location.reload()}>
      Réessayer
    </Button>
  </div>
)

const EmptyState = ({ type }: { type: TemplateType }) => (
  <div className="text-center py-8">
    <p className="text-muted-foreground mb-4">
      Aucun template disponible pour {type}
    </p>
    <Button asChild>
      <Link href={`/templates/${type}/new`}>
        Créer un nouveau template
      </Link>
    </Button>
  </div>
)