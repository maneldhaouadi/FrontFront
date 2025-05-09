import { api } from '@/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import InvoicePaymentsCard from './InvoicePaymentsCard';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HistoryIcon, XIcon } from 'lucide-react';


interface DialogflowTableProps {
  onNewMessage?: () => void;
  fullscreenMode?: boolean;
  onCloseFullscreen?: () => void;
  onShowFullHistory?: () => void;
  expandedHistory?: boolean;
}

type DocumentDetails = {
  number?: string;
  amount?: number;
  date?: string;
  dueDate?: string;
  status?: string;
  articleCount?: number;
};

type SessionData = {
  lastUpdated: string | Date; 
  messages: HistoryEntry[];
};

type LateInvoice = {
  invoiceNumber: string;
  amount: number;
  amountPaid: number;
  currency: string;
  dueDate: string;
  daysLate: number;
  status: string;
  remainingAmount: number;
};

type LateInvoicesResponse = {
  success: boolean;
  invoices: LateInvoice[];
  count: number;
  totalRemaining: number;
  error?: string;
};

type ExpensePayment = {
  amount?: number;
  date: string | Date;
  mode: string;
  notes?: string;
};

type InvoicePaymentsResponse = {
  success: boolean;
  invoiceNumber: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  payments: ExpensePayment[];
  message?: string;
};

type DialogflowResponse = {
  fulfillmentText: string;
  outputContexts?: Array<{
    name: string;
    lifespanCount: number;
    parameters?: {
      currentStep?: string;
      quotationData?: any;
      [key: string]: any;
    };
  }>;
  payload?: {
    type?: 'invoice' | 'quotation' | 'late_invoices' | 'invoice_payments';
    details?: DocumentDetails;
    lateInvoices?: LateInvoicesResponse;
    invoicePayments?: InvoicePaymentsResponse;
  };
};

type HistoryEntry = {
  sender: 'user' | 'bot';
  text: string;
  details?: DocumentDetails;
  type?: 'invoice' | 'quotation' | 'late_invoices';
  lateInvoices?: LateInvoicesResponse;
  invoicePayments?: InvoicePaymentsResponse;
  timestamp: Date;
};

type ComparisonParams = {
  data_type: 'invoice' | 'quotation';
  field_name: string;
  user_value: string | number;
  reference_id: string;
};

type ComparisonResponse = {
  success: boolean;
  message?: string;
};

const getStoredSessions = (): Record<string, SessionData> => {
  const stored = localStorage.getItem('chatSessions');
  return stored ? JSON.parse(stored) : {};
};

const storeSession = (sessionId: string, messages: HistoryEntry[]) => {
  const sessions = getStoredSessions();
  sessions[sessionId] = {
    messages,
    lastUpdated: new Date().toISOString()
  };
  localStorage.setItem('chatSessions', JSON.stringify(sessions));
};

const getSessionMessages = (sessionId: string): HistoryEntry[] => {
  const sessions = getStoredSessions();
  return sessions[sessionId]?.messages || [];
};

const DialogflowTable = ({ 
  fullscreenMode = false, 
  onCloseFullscreen, 
  onShowFullHistory,
  expandedHistory = false
}: DialogflowTableProps) => {
  const [languageCode, setLanguageCode] = useState<'fr' | 'en' | 'es'>('fr');
  const [queryText, setQueryText] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<HistoryEntry[]>([]);
  const [currentContexts, setCurrentContexts] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<HistoryEntry[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('sessionId');
    const newSessionId = urlSessionId || `session-${Date.now()}`;
  
    if (!urlSessionId) {
      window.history.replaceState({}, '', `?sessionId=${newSessionId}`);
    }
  
    setSessionId(newSessionId);
    const storedMessages = getSessionMessages(newSessionId);
  
    if (storedMessages.length > 0) {
      setMessages(storedMessages);
    } else {
      const welcomeMessage: HistoryEntry = {
        sender: 'bot',
        text: languageCode === 'fr' 
          ? 'Bonjour ! Comment puis-je vous aider ?' 
          : 'Hello! How can I help you?',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      storeSession(newSessionId, [welcomeMessage]);
    }
  }, [languageCode]);

  const isComparisonRequest = (text: string): boolean => {
    const comparisonKeywords = [
      'compar', 'vérif', 'vérifie', 'confirme', 'identique', 
      'match', 'correspond', 'est-ce que', 'a-t-il', 'a-t-elle',
      'compare', 'check', 'verify', 'confirm', 'same', 'equal'
    ];
    
    return comparisonKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    ) || /est\s*(?:il|elle)\s*(?:égal|identique)/i.test(text);
  };

  const extractComparisonParams = (text: string, lang: string): ComparisonParams | null => {
    const isInvoice = text.includes('facture') || text.includes('invoice');
    const isQuotation = text.includes('devis') || text.includes('quotation');
    
    if (!isInvoice && !isQuotation) return null;

    const referenceMatch = text.match(/(INV|QUO)-\d{4}-\d{2}-\d+/i);
    if (!referenceMatch) return null;
    const reference_id = referenceMatch[0].toUpperCase();

    let field_name = 'total';
    if (text.includes('statut') || text.includes('status')) {
      field_name = 'status';
    } else if (text.includes('montant') || text.includes('amount')) {
      field_name = 'total';
    } else if (text.includes('date')) {
      field_name = 'date';
    }

    let user_value: string | number = '';
    
    if (field_name === 'status') {
      const statusMatch = text.match(/['"]([^'"]+)['"]/);
      user_value = statusMatch ? statusMatch[1].toLowerCase() : '';
      
      if (lang === 'fr') {
        if (text.includes('payé')) user_value = 'paid';
        if (text.includes('non payé')) user_value = 'unpaid';
      } else {
        if (text.includes('paid')) user_value = 'paid';
        if (text.includes('unpaid')) user_value = 'unpaid';
      }
    } else {
      const amountPattern = /(?:montant|amount)\s*(?:de|of)?\s*(\d+[\.,]?\d*)/i;
      const amountMatch = text.match(amountPattern);
      user_value = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
    }

    return {
      data_type: isInvoice ? 'invoice' : 'quotation',
      field_name,
      user_value,
      reference_id
    };
  };

  const handleDataComparison = async (
    params: ComparisonParams,
    lang: string = 'fr'
  ): Promise<ComparisonResponse> => {
    try {
      const response = await api.dialogflow.sendRequest({
        languageCode: lang,
        queryText: `compare ${params.reference_id} ${params.field_name} ${params.user_value}`,
        sessionId: sessionId,
        parameters: {
          fields: {
            data_type: { stringValue: params.data_type },
            field_name: { stringValue: params.field_name },
            user_value: { 
              [typeof params.user_value === 'string' ? 'stringValue' : 'numberValue']: params.user_value 
            },
            reference_id: { stringValue: params.reference_id }
          }
        }
      });
  
      return {
        success: true,
        message: response.fulfillmentText || 
          (lang === 'fr' 
            ? "Comparaison effectuée" 
            : lang === 'en' 
            ? "Comparison completed"
            : "Comparación completada")
      };
    } catch (error) {
      console.error('Comparison error:', error);
      const t = {
        fr: "Erreur technique lors de la comparaison",
        en: "Technical error during comparison",
        es: "Error técnico durante la comparación"
      }[lang];
      
      return {
        success: false,
        message: `${t}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  };

  const loadSession = (sessionIdToLoad: string, isNew = false) => {
    setShowHistory(false);
    window.history.replaceState({}, '', `?sessionId=${sessionIdToLoad}`);
    
    const sessionMessages = isNew ? [] : getSessionMessages(sessionIdToLoad);
    
    if (isNew || sessionMessages.length === 0) {
      const welcomeMessage: HistoryEntry = {
        sender: 'bot',
        text: languageCode === 'fr' 
          ? 'Bonjour ! Comment puis-je vous aider ?' 
          : languageCode === 'en' 
          ? 'Hello! How can I help you?'
          : '¡Hola! ¿Cómo puedo ayudarte?',
        timestamp: new Date()
      };
      const newMessages = [welcomeMessage];
      setSessionId(sessionIdToLoad);
      setMessages(newMessages);
      setConversationHistory(newMessages);
      storeSession(sessionIdToLoad, newMessages);
    } else {
      setSessionId(sessionIdToLoad);
      setMessages(sessionMessages);
      setConversationHistory(sessionMessages);
    }
    
    setRefreshKey(prev => prev + 1);
  };

  const handleDialogflowResponse = (response: DialogflowResponse) => {
    if (response.outputContexts) {
      setCurrentContexts(response.outputContexts);
    }
  
    const newMessage: HistoryEntry = {
      sender: 'bot',
      text: response.fulfillmentText,
      details: response.payload?.details,
      timestamp: new Date()
    };
  
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    storeSession(sessionId, updatedMessages);
    setIsTyping(false);
  };
  
  const isInQuotationFlow = () => {
    return currentContexts.some(ctx => 
      ctx.name.includes('awaiting_quotation') && 
      ctx.parameters?.currentStep !== undefined
    );
  };
  
  const getCurrentStep = () => {
    const context = currentContexts.find(ctx => 
      ctx.name.includes('awaiting_quotation')
    );
    return context?.parameters?.currentStep || '';
  };

  const fetchHistory = () => {
    try {
      setIsTyping(true);
      const sessionMessages = getSessionMessages(sessionId);
      
      if (sessionMessages.length > 0) {
        setConversationHistory(sessionMessages);
        setShowHistory(true);
      } else {
        const infoMessage: HistoryEntry = {
          sender: 'bot',
          text: languageCode === 'fr' 
            ? "Aucun historique de conversation disponible" 
            : "No conversation history available",
          timestamp: new Date()
        };
        setConversationHistory([infoMessage]);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      const errorMessage: HistoryEntry = {
        sender: 'bot',
        text: languageCode === 'fr' 
          ? "Erreur lors de la récupération de l'historique" 
          : "Error while fetching history",
        timestamp: new Date()
      };
      setConversationHistory([errorMessage]);
      setShowHistory(true);
    } finally {
      setIsTyping(false);
    }
  };

  const getInputPlaceholder = () => {
    if (!isInQuotationFlow()) {
      return languageCode === 'fr' 
        ? 'Écrivez votre message...' 
        : languageCode === 'en' 
        ? 'Type your message...'
        : 'Escribe tu mensaje...';
    }

    const step = getCurrentStep();
    const placeholders: Record<string, string> = {
      'sequentialNumbr': languageCode === 'fr' ? 'Numéro séquentiel (ex: QUO-123456)' : 'Sequential number (ex: QUO-123456)',
      'object': languageCode === 'fr' ? 'Objet du devis' : 'Quotation subject',
      'firmName': languageCode === 'fr' ? 'Nom de la firme' : 'Firm name',
      'InterlocutorName': languageCode === 'fr' ? 'Nom complet de l\'interlocuteur' : 'Interlocutor full name',
      'date': languageCode === 'fr' ? 'Date (JJ-MM-AAAA)' : 'Date (DD-MM-YYYY)',
      'duedate': languageCode === 'fr' ? 'Date échéance (JJ-MM-AAAA)' : 'Due date (DD-MM-YYYY)',
      'status': languageCode === 'fr' ? 'Statut (Brouillon, En attente, Validé, Refusé)' : 'Status (Draft, Pending, Validated, Rejected)',
      'articleId': languageCode === 'fr' ? 'ID article (nombre entier)' : 'Article ID (integer)',
      'quantity': languageCode === 'fr' ? 'Quantité (nombre entier)' : 'Quantity (integer)',
      'unitPrice': languageCode === 'fr' ? 'Prix unitaire (nombre décimal ou "défaut")' : 'Unit price (decimal or "default")',
      'discount': languageCode === 'fr' ? 'Remise (nombre décimal ou pourcentage, ex: 10 ou 10%)' : 'Discount (decimal or percentage, ex: 10 or 10%)',
      'moreArticles': languageCode === 'fr' ? 'Ajouter un autre article ? (Oui/Non)' : 'Add another item? (Yes/No)',
      'finalize': languageCode === 'fr' ? 'Confirmer la création ? (Oui/Non)' : 'Confirm creation? (Yes/No)'
    };

    return placeholders[step] || (languageCode === 'fr' ? 'Répondez à la question...' : 'Answer the question...');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
  
    const userMessage: HistoryEntry = {
      sender: 'user',
      text: queryText,
      timestamp: new Date()
    };
  
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    storeSession(sessionId, updatedMessages);
  
    setQueryText('');
    setIsTyping(true);
  
    try {
      // Détection des requêtes de comparaison
      if (isComparisonRequest(queryText)) {
        const comparisonParams = extractComparisonParams(queryText, languageCode);
        if (comparisonParams) {
          const comparisonResult = await handleDataComparison(comparisonParams, languageCode);
          
          const botMessage: HistoryEntry = {
            sender: 'bot',
            text: comparisonResult.message || 
              (languageCode === 'fr' 
                ? "Réponse de comparaison non disponible" 
                : "Comparison response not available"),
            timestamp: new Date()
          };
  
          setMessages(prev => [...prev, botMessage]);
          storeSession(sessionId, [...updatedMessages, botMessage]);
          setIsTyping(false);
          return;
        }
      }

      const parameters: any = {
        fields: {
          queryText: { stringValue: queryText }
        }
      };
  
      if (isInQuotationFlow()) {
        parameters.fields.currentStep = { stringValue: getCurrentStep() };
        
        if (getCurrentStep() === 'sequentialNumbr') {
          if (!/^QUO-\d{6}$/.test(queryText)) {
            throw new Error("Format invalide. Le numéro doit être sous la forme QUO-123456");
          }
          parameters.fields.quotationNumber = { stringValue: queryText };
        }
      }
  
      const response = await api.dialogflow.sendRequest({
        languageCode,
        queryText,
        sessionId,
        parameters,
        outputContexts: currentContexts
      });
  
      if (response.outputContexts) {
        setCurrentContexts(response.outputContexts);
      }
  
      const botMessage: HistoryEntry = {
        sender: 'bot',
        text: response.fulfillmentText,
        details: response.payload?.details,
        timestamp: new Date()
      };
  
      setMessages(prev => [...prev, botMessage]);
      storeSession(sessionId, [...updatedMessages, botMessage]);
  
    } catch (error) {
      console.error('Error:', error);
      storeSession(sessionId, [...updatedMessages]);
    } finally {
      setIsTyping(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(languageCode);
  };

  const formatTime = (dateInput: Date | string | undefined | null) => {
    if (!dateInput) return '--:--';
    
    let dateObj: Date;
    
    if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else if (typeof dateInput === 'string') {
      dateObj = new Date(dateInput);
      if (isNaN(dateObj.getTime())) return '--:--';
    } else {
      return '--:--';
    }
    
    try {
      return dateObj.toLocaleTimeString(languageCode, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return '--:--';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return 'N/A';
    return new Intl.NumberFormat(languageCode === 'fr' ? 'fr-FR' : languageCode === 'es' ? 'es-ES' : 'en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const exportHistory = () => {
    const history = {
      sessionId,
      messages: conversationHistory,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteSession = (sessionIdToDelete: string) => {
    const sessions = getStoredSessions();
    delete sessions[sessionIdToDelete];
    localStorage.setItem('chatSessions', JSON.stringify(sessions));
    setRefreshKey(prev => prev + 1);
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return conversationHistory;
    return conversationHistory.filter(message => 
      message.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversationHistory, searchQuery]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn(
      "flex flex-col border rounded-lg overflow-hidden shadow-lg bg-white",
      fullscreenMode ? "w-full h-full" : expandedHistory ? "h-[800px] w-[600px]" : "h-[600px] w-[400px]"
    )}>
      {/* Chat header */}
      <div className="flex items-center p-4 border-b bg-primary text-primary-foreground">
        <Avatar className="h-10 w-10">
          <AvatarImage src="https://www.gstatic.com/mobilesdk/160503_mobilesdk/chat/chatui_2x.png" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <h2 className="font-semibold">
            {languageCode === 'fr' ? 'Assistant Virtuel' : languageCode === 'en' ? 'Virtual Assistant' : 'Asistente Virtual'}
          </h2>
          <p className="text-xs opacity-80">
            {languageCode === 'fr' ? 'En ligne' : languageCode === 'en' ? 'Online' : 'En línea'}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => {
              fetchHistory();
              if (onShowFullHistory && !fullscreenMode) {
                onShowFullHistory();
              }
            }}
          >
            <HistoryIcon className="h-4 w-4" />
            {fullscreenMode && (
              <span className="ml-2">
                {languageCode === 'fr' ? 'Historique' : 'History'}
              </span>
            )}
          </Button>
          <Select 
            value={languageCode}
            onValueChange={(value: 'fr' | 'en' | 'es') => setLanguageCode(value)}
          >
            <SelectTrigger className="w-[100px] h-8 bg-primary-foreground text-primary">
              <SelectValue placeholder="Langue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        <div className="space-y-3">
          {messages.map((msg, index) => {
            const isComparisonMessage = msg.text.includes('Comparaison pour') || 
                                      msg.text.includes('Comparison for');
            
            if (isComparisonMessage) {
              return (
                <div key={index} className="flex justify-start">
                  <Avatar className="h-8 w-8 mt-1 mr-2">
                    <AvatarImage src="/bot-avatar.png" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="max-w-[80%]">
                    <div className="bg-white border rounded-lg px-4 py-2 rounded-tl-none">
                      <div className="text-sm whitespace-pre-line">
                        {msg.text.split('\n').map((line, i) => (
                          <p 
                            key={i} 
                            className={i === 0 ? 'font-medium' : ''}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                      <div className="text-xs mt-1 text-right text-gray-500">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            return (
              <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'bot' && (
                  <Avatar className="h-8 w-8 mt-1 mr-2">
                    <AvatarImage src="/bot-avatar.png" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                
                <div className="max-w-[80%]">
                  <div className={`rounded-lg px-4 py-2 ${
                    msg.sender === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-tr-none' 
                      : 'bg-white border rounded-tl-none'
                  }`}>
                    <div className="text-sm">{msg.text}</div>
                    <div className={`text-xs mt-1 text-right ${
                      msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-gray-500'
                    }`}>
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                  
                  {msg.details && (
                    <Card className={`mt-2 ${msg.sender === 'user' ? 'ml-auto' : ''}`}>
                      <CardHeader className="p-3 pb-0">
                        <h4 className="font-medium text-sm">
                          {msg.type === 'quotation'
                            ? languageCode === 'fr' 
                              ? 'Détails du devis' 
                              : 'Quotation details'
                            : languageCode === 'fr'
                            ? 'Détails de la facture'
                            : 'Invoice details'}
                        </h4>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 text-sm">
                        {msg.details.number && (
                          <p><strong>{languageCode === 'fr' ? 'Numéro' : 'Number'}:</strong> {msg.details.number}</p>
                        )}
                        {msg.details.amount !== undefined && (
                          <p><strong>{languageCode === 'fr' ? 'Montant' : 'Amount'}:</strong> {formatCurrency(msg.details.amount)}</p>
                        )}
                        {msg.details.date && (
                          <p><strong>{languageCode === 'fr' ? 'Date' : 'Date'}:</strong> {formatDate(msg.details.date)}</p>
                        )}
                        {msg.details.dueDate && (
                          <p><strong>{languageCode === 'fr' ? 'Échéance' : 'Due date'}:</strong> {formatDate(msg.details.dueDate)}</p>
                        )}
                        {msg.details.status && (
                          <p><strong>{languageCode === 'fr' ? 'Statut' : 'Status'}:</strong> {msg.details.status}</p>
                        )}
                        {msg.details.articleCount !== undefined && (
                          <p><strong>{languageCode === 'fr' ? 'Articles' : 'Items'}:</strong> {msg.details.articleCount}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {msg.invoicePayments && (
                    <InvoicePaymentsCard 
                      payments={msg.invoicePayments} 
                      languageCode={languageCode} 
                    />
                  )}
                </div>

                {msg.sender === 'user' && (
                  <Avatar className="h-8 w-8 mt-1 ml-2">
                    <AvatarImage src="/user-avatar.png" />
                    <AvatarFallback>VO</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
          
          {isTyping && (
            <div className="flex justify-start">
              <Avatar className="h-8 w-8 mt-1 mr-2">
                <AvatarImage src="/bot-avatar.png" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="bg-white border rounded-lg px-4 py-2 rounded-tl-none">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <Input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={getInputPlaceholder()}
            className="flex-1 rounded-full"
          />
          <Button 
            type="submit" 
            className="rounded-full w-12 h-12 p-0"
            disabled={!queryText.trim()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </Button>
        </div>
      </form>

      {/* History Modal */}
      {showHistory && (
        <div className={cn(
          "fixed inset-0 flex items-center justify-center z-50",
          fullscreenMode ? "bg-background" : "bg-black/50 p-4"
        )}>
          <div className={cn(
            "bg-white rounded-xl flex flex-col shadow-xl",
            fullscreenMode ? "w-full h-full max-h-none rounded-none" : "w-full max-w-5xl h-[90vh]"
          )}>
            {/* Header */}
            <div className="p-5 border-b flex justify-between items-center bg-gray-50 rounded-t-xl sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {languageCode === 'fr' ? 'Historique des conversations' : 'Conversation History'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Session: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{sessionId}</span>
                </p>
              </div>
              <div className="flex gap-2">
                {fullscreenMode && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={onCloseFullscreen}
                  >
                    {languageCode === 'fr' ? 'Retour au chat' : 'Back to chat'}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowHistory(false)}
                  className="rounded-full hover:bg-gray-200"
                >
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
              {/* Sessions sidebar */}
<div className="min-w-[14rem] border-r flex flex-col bg-gray-50"> {/* Changement ici */}
  <div className="p-3">
    <Button 
      variant="outline" 
      size="sm" 
      className="w-full mb-3 bg-white hover:bg-gray-100" // Ajout de bg-white et hover:bg-gray-100
      onClick={() => {
        const newSessionId = `session-${Date.now()}`;
        loadSession(newSessionId, true);
        setRefreshKey(prev => prev + 1);
      }}
    >
      {languageCode === 'fr' ? '+ Nouvelle session' : '+ New session'}
    </Button>
    <h3 className="font-medium text-sm text-gray-500 mb-3">
      {languageCode === 'fr' ? 'Sessions récentes' : 'Recent sessions'}
    </h3>
  </div>
                <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-2">
                  {Object.entries(getStoredSessions())
                    .sort(([, a], [, b]) => {
                      const dateA = new Date(a.lastUpdated).getTime();
                      const dateB = new Date(b.lastUpdated).getTime();
                      return dateB - dateA;
                    })
                    .map(([id, sessionData]) => (
                      <div 
                        key={`${id}-${refreshKey}`}
                        className={`group relative p-2 rounded-lg cursor-pointer text-sm ${
                          id === sessionId 
                            ? 'bg-blue-100 text-blue-800 font-medium' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div 
                          onClick={() => loadSession(id)}
                          className="pr-6 truncate"
                        >
                          {id.startsWith('session-') 
                            ? `${languageCode === 'fr' ? 'Session du' : 'Session from'} ${new Date(parseInt(id.split('-')[1])).toLocaleDateString()}`
                            : id}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(sessionData.lastUpdated).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {sessionData.messages.length} {languageCode === 'fr' ? 'messages' : 'messages'}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(languageCode === 'fr' 
                              ? "Voulez-vous vraiment supprimer cette session ?" 
                              : "Are you sure you want to delete this session?")) {
                              deleteSession(id);
                              if (id === sessionId) {
                                const newSessionId = `session-${Date.now()}`;
                                loadSession(newSessionId);
                              }
                            }
                          }}
                        >
                          <XIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Messages history */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search bar */}
                <div className="p-3 border-b sticky top-0 bg-white z-10">
                  <div className="relative">
                    <Input
                      placeholder={languageCode === 'fr' ? "Rechercher dans l'historique..." : "Search history..."}
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Messages list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((entry, index) => (
                      <div key={index} className={`flex ${entry.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div 
                          className={`max-w-[85%] rounded-xl p-4 ${
                            entry.sender === 'user' 
                              ? 'bg-blue-500 text-white rounded-br-none' 
                              : 'bg-gray-100 text-gray-800 rounded-bl-none'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {entry.sender === 'bot' && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src="/bot-avatar.png" />
                                <AvatarFallback>AI</AvatarFallback>
                              </Avatar>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline gap-2 mb-2">
                                <span className="font-medium text-sm">
                                  {entry.sender === 'user' 
                                    ? (languageCode === 'fr' ? 'Vous' : 'You') 
                                    : 'Assistant'}
                                </span>
                                <span className={`text-xs ${
                                  entry.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                  {formatTime(entry.timestamp)}
                                </span>
                              </div>
                              
                              <div className="text-sm whitespace-pre-wrap break-words">
                                {entry.text.split('\n').map((line, i) => (
                                  <p key={i} className="mb-1 last:mb-0">
                                    {line}
                                    {line.includes('Invoice total:') && <hr className="my-2 border-gray-300/50" />}
                                  </p>
                                ))}
                              </div>
                            </div>
                            
                            {entry.sender === 'user' && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarImage src="/user-avatar.png" />
                                <AvatarFallback>VO</AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      {languageCode === 'fr' ? 'Aucun message trouvé' : 'No messages found'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t bg-gray-50 flex justify-between items-center rounded-b-xl sticky bottom-0">
              <div className="text-sm text-gray-500">
                {conversationHistory.length} {languageCode === 'fr' ? 'messages' : 'messages'}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportHistory}>
                  {languageCode === 'fr' ? 'Exporter' : 'Export'}
                </Button>
                {!fullscreenMode && onShowFullHistory && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onShowFullHistory}
                  >
                    {languageCode === 'fr' ? 'Plein écran' : 'Fullscreen'}
                  </Button>
                )}
                <Button 
                  onClick={() => setShowHistory(false)} 
                  size="sm"
                >
                  {languageCode === 'fr' ? 'Fermer' : 'Close'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DialogflowTable;