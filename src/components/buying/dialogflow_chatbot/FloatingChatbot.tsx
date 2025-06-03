'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import DialogflowTable from './DialogflowTable'

export const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [fullscreenMode, setFullscreenMode] = useState(false)
  const pathname = usePathname()

  // Fermer le chatbot quand la route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Gestion des messages non lus
  useEffect(() => {
    if (!isOpen && hasUnreadMessages) {
      const timer = setTimeout(() => {
        setHasUnreadMessages(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [isOpen, hasUnreadMessages])

  const handleNewMessage = () => {
    if (!isOpen) {
      setHasUnreadMessages(true)
    }
  }

  const handleShowFullHistory = () => {
    setFullscreenMode(true)
  }

  const handleCloseFullscreen = () => {
    setFullscreenMode(false)
  }

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50",
      "transition-all duration-300 ease-in-out"
    )}>
      {/* Chatbot normal */}
      {!fullscreenMode && isOpen && (
        <div className={cn(
          "absolute bottom-full right-0 mb-4",
          "w-[400px] h-[600px]",
          "shadow-xl rounded-lg overflow-hidden border",
          "transform origin-bottom-right",
          "transition-all duration-300 ease-in-out",
          isOpen
            ? "scale-100 opacity-100 pointer-events-auto" 
            : "scale-95 opacity-0 pointer-events-none"
        )}>
          <DialogflowTable 
            onNewMessage={handleNewMessage}
            onShowFullHistory={handleShowFullHistory}
          />
        </div>
      )}

      {/* Historique en plein écran */}
      {fullscreenMode && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <DialogflowTable 
            fullscreenMode 
            onCloseFullscreen={handleCloseFullscreen}
          />
        </div>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => {
              setIsOpen(!isOpen)
              setHasUnreadMessages(false)
            }}
            className={cn(
              "rounded-full w-14 h-14 p-0",
              "shadow-lg hover:shadow-md",
              "transition-all duration-200",
              "relative",
              "group",
              hasUnreadMessages && "animate-chatbot-bounce"
            )}
            variant="default"
            size="icon"
          >
            {/* Icône de chat */}
            <div className={cn(
              "absolute inset-0 flex items-center justify-center",
              "transition-all duration-300",
              isOpen ? "rotate-0 opacity-0" : "rotate-0 opacity-100"
            )}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "w-6 h-6",
                  "group-hover:scale-110 transition-transform"
                )}
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            
            {/* Icône de fermeture */}
            <div className={cn(
              "absolute inset-0 flex items-center justify-center",
              "transition-all duration-300",
              isOpen ? "rotate-0 opacity-100" : "rotate-90 opacity-0"
            )}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn(
                  "w-6 h-6",
                  "group-hover:rotate-90 transition-transform"
                )}
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            
            {/* Badge de notification */}
            {hasUnreadMessages && (
              <span className={cn(
                "absolute -top-1 -right-1",
                "h-4 w-4 rounded-full",
                "bg-destructive text-destructive-foreground",
                "text-xs flex items-center justify-center",
                "animate-pulse"
              )}>
                !
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}