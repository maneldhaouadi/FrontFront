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
import { Loader2, Trash2, Check, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/other/useMediaQuery"
import { Label } from "@/components/ui/label"

interface TemplateDeleteDialogProps {
  open: boolean
  template: Template
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
}

const TemplateDeleteDialog: React.FC<TemplateDeleteDialogProps> = ({
  open,
  template,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const header = (
    <Label className="leading-5">
      Voulez-vous vraiment supprimer le template <span className="font-semibold">"{template.name}"</span> ?
    </Label>
  )

  const footer = (
    <div className="flex gap-2 mt-2">
      <Button
        variant="default"
        className="flex-1 gap-2 bg-black hover:bg-gray-800 text-white"
        onClick={() => {
          onConfirm()
        }}
        disabled={isDeleting}
      >
        <Check size={16} />
        Supprimer
        {isDeleting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
      </Button>
      <Button
        variant="outline"
        className="flex-1 gap-2"
        onClick={onClose}
        disabled={isDeleting}
      >
        <X size={16} />
        Annuler
      </Button>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmation de suppression</DialogTitle>
            <DialogDescription className="pt-4">
              {header}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Confirmation de suppression</DrawerTitle>
          <DrawerDescription className="pt-4">
            {header}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pt-2">{footer}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

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
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDownload = async (format: 'pdf' | 'docx' | 'png' | 'jpeg') => {
    try {
      setIsDownloading(true)
      setDownloadFormat(format)
      
      const blob = await templateApi.exportTemplate(template.id, format)
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.name.replace(/[^\w]/g, '_')}_${new Date().toISOString().slice(0,10)}.${format}`
      document.body.appendChild(a)
      a.click()
      
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

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await templateApi.remove(template.id)
      toast.success("Template supprimé avec succès")
      window.location.reload()
    } catch (error) {
      toast.error("Échec de la suppression", {
        description: error instanceof Error ? error.message : "Erreur inconnue",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
            className="text-black hover:bg-gray-100 transition-colors"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-black" />
            ) : (
              <span className="flex items-center gap-1">
                <Trash2 className="w-4 h-4" />
                Supprimer
              </span>
            )}
          </Button>
          
        </div>
      </Card>

      <TemplateDeleteDialog
        open={showDeleteDialog}
        template={template}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
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