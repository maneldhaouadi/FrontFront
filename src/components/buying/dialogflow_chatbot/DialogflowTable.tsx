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
import { Article } from '@/types';
import axios from '@/api/axios';


interface DialogflowTableProps {
  onNewMessage?: () => void;
  fullscreenMode?: boolean;
  onCloseFullscreen?: () => void;
  onShowFullHistory?: () => void;
  expandedHistory?: boolean;
}
interface Translation {
  invalidFormat: string;
  beforeCreation: string;
  example: string;
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
  isRetry?: boolean;
  isArticleSelection?: boolean;
  availableArticles?: {id: number, quantity: number}[];
  isFirmSelection?: boolean;
  availableFirms?: string[];
  isStatusSelection?: boolean;
  availableStatuses?: { value: string; label: string }[];
  isCurrencySelection?: boolean;
  availableCurrencies?: string[];
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
  const [quotationDate, setQuotationDate] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR');
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

  
  const fetchAvailableArticles = async (): Promise<{id: number, quantity: number}[]> => {
    try {
      const response = await api.article.findPaginated(
        1,
        100,
        'ASC',
        'id',
        '',
        []
      );
      
      // Filtrer les articles avec quantité > 0 et retourner les IDs et quantités
      return response.data
        .filter(article => article.quantityInStock > 0)
        .map(article => ({
          id: article.id,
          quantity: article.quantityInStock
        }));
    } catch (error) {
      console.error("Error fetching articles:", error);
      return [];
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
      'sequentialNumbr': languageCode === 'fr' 
        ? 'Numéro séquentiel (format: QUO-123456 - 6 chiffres requis)' 
        : 'Sequential number (format: QUO-123456 - 6 digits required)',
        'object': languageCode === 'fr' ? 'Objet du devis' : 'Quotation subject',
      'firmName': languageCode === 'fr' ? 'Nom de la firme' : 'Firm name',
      'InterlocutorName': languageCode === 'fr' ? 'Nom complet de l\'interlocuteur' : 'Interlocutor full name',
      'date': languageCode === 'fr' ? 'Date de création (JJ-MM-AAAA)' : 'Creation date (DD-MM-YYYY)',
      'duedate': languageCode === 'fr' 
      ? 'Date échéance (JJ-MM-AAAA) - Doit être après la date de création' 
      : 'Due date (DD-MM-YYYY) - Must be after creation date',
      'articleId': languageCode === 'fr' ? 'ID article (nombre entier)' : 'Article ID (integer)',
      'quantity': languageCode === 'fr' 
      ? 'Quantité (nombre entier) - Vérification du stock automatique' 
      : 'Quantity (integer) - Automatic stock check',
      'unitPrice': languageCode === 'fr' 
      ? 'Prix unitaire (nombre décimal)' 
      : 'Unit price (decimal number)','moreArticles': languageCode === 'fr' ? 'Ajouter un autre article ? (Oui/Non)' : 'Add another item? (Yes/No)',
      'finalize': languageCode === 'fr' ? 'Confirmer la création ? (Oui/Non)' : 'Confirm creation? (Yes/No)'
    };

    return placeholders[step] || (languageCode === 'fr' ? 'Répondez à la question...' : 'Answer the question...');
  };

  const validateDueDate = (dueDateInput: string, lang: 'fr' | 'en' | 'es' = 'fr'): { isValid: boolean; error?: string } => {
    // Vérification du format
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (!dateRegex.test(dueDateInput)) {
        return {
            isValid: false,
            error: lang === 'fr' 
                ? "❌ Format invalide. Utilisez strictement JJ-MM-AAAA (ex: 01-03-2025)" 
                : "❌ Invalid format. Use strictly DD-MM-YYYY (ex: 01-03-2025)"
        };
    }

    // Vérification des valeurs numériques
    const [day, month, year] = dueDateInput.split('-').map(Number);
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return {
            isValid: false,
            error: lang === 'fr' 
                ? "❌ La date contient des valeurs non numériques" 
                : "❌ Date contains non-numeric values"
        };
    }

    // Validation des plages
    if (month < 1 || month > 12) {
        return {
            isValid: false,
            error: lang === 'fr' 
                ? "❌ Le mois doit être entre 01 et 12" 
                : "❌ Month must be between 01 and 12"
        };
    }

    // Validation date valide
    const dueDate = new Date(year, month - 1, day);
    if (isNaN(dueDate.getTime())) {
        return {
            isValid: false,
            error: lang === 'fr'
                ? "❌ Date d'échéance invalide"
                : "❌ Invalid due date"
        };
    }

    // Validation date postérieure à aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0); // On ignore l'heure pour la comparaison
    if (dueDate <= today) {
        return {
            isValid: false,
            error: lang === 'fr'
                ? `❌ La date d'échéance (${dueDateInput}) doit être strictement postérieure à aujourd'hui`
                : `❌ Due date (${dueDateInput}) must be strictly after today`
        };
    }

    return { isValid: true };
};

const fetchAvailableFirms = async (): Promise<string[]> => {
  try {
    // Utilisez findPaginated au lieu de findChoices pour obtenir plus de données
    const response = await api.firm.findPaginated(
      1, // page
      100, // taille
      'ASC', // ordre
      'name', // clé de tri
      '', // recherche
      [] // relations
    );
    
    // Assurez-vous que la réponse contient bien un tableau data
    if (response && response.data) {
      return response.data
        .map(firm => firm.name)
        .filter((name): name is string => !!name); // Filtre les valeurs nulles/undefined
    }
    return [];
  } catch (error) {
    console.error("Error fetching firms:", error);
    return [];
  }
};

const validateUnitPrice = (input: string): { isValid: boolean; value?: number; currency?: string; error?: string } => {
  // Expression régulière pour capturer le montant et la devise
  const regex = /^(\d+(?:[.,]\d+)?)\s*([A-Za-z]{3})?$/;
  const match = input.trim().match(regex);
  
  if (!match) {
    return {
      isValid: false,
      error: languageCode === 'fr' 
        ? "Format invalide. Utilisez '150 EUR' ou simplement '150'" 
        : "Invalid format. Use '150 EUR' or just '150'"
    };
  }

  const amountStr = match[1].replace(',', '.');
  const amount = parseFloat(amountStr);
  const currency = match[2]?.toUpperCase();

  if (isNaN(amount)) {
    return {
      isValid: false,
      error: languageCode === 'fr' 
        ? "Le montant doit être un nombre valide" 
        : "Amount must be a valid number"
    };
  }

  return {
    isValid: true,
    value: amount,
    currency: currency || 'EUR' // EUR par défaut si non spécifié
  };
};
  
// Ajoutez cet effet quelque part dans votre composant
useEffect(() => {
  const loadFirmsIfNeeded = async () => {
    if (isInQuotationFlow() && getCurrentStep() === 'firmName' && queryText === '') {
      try {
        setIsTyping(true);
        const firms = await fetchAvailableFirms();
        
        if (firms.length > 0) {
          const botMessage: HistoryEntry = {
            sender: 'bot',
            text: languageCode === 'fr' 
              ? 'Veuillez sélectionner une entreprise parmi la liste :' 
              : 'Please select a firm from the list:',
            timestamp: new Date(),
            isFirmSelection: true,
            availableFirms: firms
          };
          
          setMessages(prev => [...prev, botMessage]);
          storeSession(sessionId, [...messages, botMessage]);
        } else {
          const errorMessage: HistoryEntry = {
            sender: 'bot',
            text: languageCode === 'fr' 
              ? 'Aucune entreprise disponible. Veuillez entrer le nom manuellement.' 
              : 'No firms available. Please enter the name manually.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } catch (error) {
        console.error('Error loading firms:', error);
      } finally {
        setIsTyping(false);
      }
    }
  };

  loadFirmsIfNeeded();
}, [currentContexts, languageCode, queryText]);
  

const fetchAvailableStatuses = async (): Promise<{ value: string; label: string }[]> => {
  try {
    const response = await api.expense_quotation.getAvailableStatuses();
    return response;
  } catch (error) {
    console.error("Error fetching statuses:", error);
    return [];
  }
};
useEffect(() => {
  const loadStatusesIfNeeded = async () => {
    // Vérifie si le dernier message du bot demande un statut
    const lastMessage = messages[messages.length - 1];
    const isAskingForStatus = lastMessage?.sender === 'bot' && 
                            (lastMessage.text.toLowerCase().includes('statut') || 
                             lastMessage.text.toLowerCase().includes('status'));

    if (isAskingForStatus && !lastMessage.isStatusSelection) {
      try {
        setIsTyping(true);
        const statuses = await fetchAvailableStatuses();
        
        if (statuses.length > 0) {
          const statusMessage: HistoryEntry = {
            sender: 'bot',
            text: languageCode === 'fr' 
              ? 'Veuillez sélectionner un statut parmi la liste :' 
              : 'Please select a status from the list:',
            timestamp: new Date(),
            isStatusSelection: true,
            availableStatuses: statuses
          };
          
          setMessages(prev => [...prev, statusMessage]);
          storeSession(sessionId, [...messages, statusMessage]);
        }
      } catch (error) {
        console.error('Error loading statuses:', error);
      } finally {
        setIsTyping(false);
      }
    }
  };

  loadStatusesIfNeeded();
}, [messages, languageCode, sessionId]);


useEffect(() => {
  const loadCurrenciesIfNeeded = async () => {
    if (isInQuotationFlow() && getCurrentStep() === 'unitPrice' && queryText === '') {
      try {
        setIsTyping(true);
        const currencies = await fetchAvailableCurrencies();
        
        if (currencies.length > 0) {
          const botMessage: HistoryEntry = {
            sender: 'bot',
            text: languageCode === 'fr' 
              ? 'Veuillez sélectionner une devise parmi la liste :' 
              : 'Please select a currency from the list:',
            timestamp: new Date(),
            isCurrencySelection: true,
            availableCurrencies: currencies
          };
          
          setMessages(prev => [...prev, botMessage]);
          storeSession(sessionId, [...messages, botMessage]);
        }
      } catch (error) {
        console.error('Error loading currencies:', error);
      } finally {
        setIsTyping(false);
      }
    }
  };

  loadCurrenciesIfNeeded();
}, [currentContexts, languageCode, queryText]);
const fetchAvailableCurrencies = async (): Promise<string[]> => {
  try {
    const response = await api.currency.find();
    // Extraire les codes de devise des objets Currency
    return response.map(currency => currency.code);
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return ['EUR', 'USD', 'GBP', 'JPY']; // Valeurs par défaut en cas d'erreur
  }
};

const checkArticleAvailability = async (articleId: number, quantity: number): Promise<{
  available: boolean;
  availableQuantity: number;
  message?: string;
}> => {
  try {
    const response = await api.article.checkAvailability(articleId, quantity);
    return {
      available: response.available,
      availableQuantity: response.availableQuantity,
      message: response.message
    };
  } catch (error) {
    console.error("Error checking article availability:", error);
    return {
      available: false,
      availableQuantity: 0,
      message: languageCode === 'fr' 
        ? "Erreur lors de la vérification de la disponibilité" 
        : "Error checking availability"
    };
  }
};

const updateArticleStock = async (
  id: number,
  quantityChange: number
): Promise<Article> => {
  try {
    const response = await axios.put<Article>(`/public/article/${id}/update-stock`, {
      quantityChange
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du stock:", error);
    throw new Error("Impossible de mettre à jour le stock de l'article.");
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!queryText.trim()) return;

  const userMessage: HistoryEntry = {
      sender: 'user',
      text: queryText,
      timestamp: new Date()
  };

  if (isInQuotationFlow() && getCurrentStep() === 'quantity') {
    const quantity = parseInt(queryText);
    if (isNaN(quantity) || quantity <= 0) {
      const errorMessage: HistoryEntry = {
        sender: 'bot',
        text: languageCode === 'fr' 
          ? "La quantité doit être un nombre entier positif" 
          : "Quantity must be a positive integer",
        timestamp: new Date(),
        isRetry: true
      };
      
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);
      storeSession(sessionId, updatedMessages);
      setIsTyping(false);
      return;
    }

    // Trouver le dernier message du bot qui contient l'ID de l'article
    const lastBotMessage = [...messages].reverse().find(msg => 
      msg.sender === 'bot' && msg.text.includes('Article') && msg.text.includes('ID')
    );

    // Extraire l'ID de l'article du texte du message
    let articleId: number | null = null;
    if (lastBotMessage) {
      const idMatch = lastBotMessage.text.match(/ID:\s*(\d+)/i);
      if (idMatch && idMatch[1]) {
        articleId = parseInt(idMatch[1]);
      }
    }

    // Si on n'a pas trouvé l'ID dans le message, essayer de le récupérer du contexte
    if (!articleId) {
      const quotationContext = currentContexts.find(ctx => 
        ctx.name.includes('awaiting_quotation')
      );
      articleId = quotationContext?.parameters?.fields?.articleId?.numberValue || 
                 quotationContext?.parameters?.articleId;
    }

    if (!articleId) {
      const errorMessage: HistoryEntry = {
        sender: 'bot',
        text: languageCode === 'fr' 
          ? "Erreur: Impossible de déterminer l'article référencé. Veuillez recommencer la sélection de l'article." 
          : "Error: Could not determine referenced article. Please restart article selection.",
        timestamp: new Date(),
        isRetry: true
      };
      
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);
      storeSession(sessionId, updatedMessages);
      setIsTyping(false);
      return;
    }

    // Vérifier la disponibilité
    try {
      const availability = await checkArticleAvailability(articleId, quantity);
      
      if (!availability.available) {
        const errorMessage: HistoryEntry = {
          sender: 'bot',
          text: availability.message || 
            (languageCode === 'fr' 
              ? `Quantité insuffisante. Stock disponible: ${availability.availableQuantity}` 
              : `Insufficient quantity. Available stock: ${availability.availableQuantity}`),
          timestamp: new Date(),
          isRetry: true
        };
        
        const updatedMessages = [...messages, userMessage, errorMessage];
        setMessages(updatedMessages);
        storeSession(sessionId, updatedMessages);
        setIsTyping(false);
        return;
      }
    } catch (error) {
      console.error('Error checking article availability:', error);
      const errorMessage: HistoryEntry = {
        sender: 'bot',
        text: languageCode === 'fr' 
          ? "Erreur lors de la vérification de la disponibilité" 
          : "Error checking availability",
        timestamp: new Date(),
        isRetry: true
      };
      
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);
      storeSession(sessionId, updatedMessages);
      setIsTyping(false);
      return;
    }
  }
  // Dans handleSubmit, avant l'envoi standard à Dialogflow
  if (isInQuotationFlow() && getCurrentStep() === 'unitPrice') {
    const amount = parseFloat(queryText.replace(',', '.'));
    
    if (isNaN(amount)) {
      const errorMessage: HistoryEntry = {
        sender: 'bot',
        text: languageCode === 'fr' 
          ? "Le montant doit être un nombre valide" 
          : "Amount must be a valid number",
        timestamp: new Date(),
        isRetry: true
      };
      
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);
      storeSession(sessionId, updatedMessages);
      setIsTyping(false);
      return;
    }

    // Si validation OK, préparer les paramètres
    const parameters = {
      fields: {
        queryText: { stringValue: `${amount} ${selectedCurrency}` },
        currentStep: { stringValue: 'unitPrice' },
        unitPrice: { numberValue: amount },
        currency: { stringValue: selectedCurrency },
        quotationData: {
          structValue: {
            fields: {
              unitPrice: { numberValue: amount },
              currency: { stringValue: selectedCurrency }
            }
          }
        }
      }
    };

    try {
      setIsTyping(true);
      const response = await api.dialogflow.sendRequest({
        languageCode,
        queryText: `${amount} ${selectedCurrency}`,
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
        timestamp: new Date()
      };

      const updatedMessages = [...messages, userMessage, botMessage];
      setMessages(updatedMessages);
      storeSession(sessionId, updatedMessages);
      setQueryText('');
      return;
    } catch (error) {
      console.error('Dialogflow error:', error);
      const errorMessage: HistoryEntry = {
        sender: 'bot',
        text: languageCode === 'fr' 
          ? "Erreur lors du traitement. Veuillez réessayer." 
          : "Processing error. Please try again.",
        timestamp: new Date(),
        isRetry: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
      storeSession(sessionId, [...messages, userMessage, errorMessage]);
      return;
    } finally {
      setIsTyping(false);
    }
  }

  // Si c'est l'étape de sélection d'entreprise
  if (isInQuotationFlow() && getCurrentStep() === 'firmName') {
      const availableFirms = await fetchAvailableFirms();
      
      // Normalisation des noms pour la comparaison (en minuscules)
      const normalizedInput = queryText.trim().toLowerCase();
      const normalizedAvailableFirms = availableFirms.map(f => f.toLowerCase());
      
      // Vérification si l'entreprise existe (comparaison insensible à la casse)
      if (!normalizedAvailableFirms.includes(normalizedInput)) {
          const errorMessage: HistoryEntry = {
              sender: 'bot',
              text: languageCode === 'fr' 
                  ? `L'entreprise "${queryText}" n'est pas valide. Veuillez choisir parmi les entreprises disponibles:` 
                  : `Firm "${queryText}" is not valid. Please choose from available firms:`,
              timestamp: new Date(),
              isFirmSelection: true,
              availableFirms
          };
          
          const updatedMessages = [...messages, userMessage, errorMessage];
          setMessages(updatedMessages);
          storeSession(sessionId, updatedMessages);
          setIsTyping(false);
          return;
      }

      // Si l'entreprise est valide, envoyer la réponse à Dialogflow
      try {
          const parameters = {
              fields: {
                  queryText: { stringValue: queryText },
                  currentStep: { stringValue: 'firmName' },
                  firmName: { stringValue: queryText.trim() },
                  quotationData: {
                      structValue: {
                          fields: {
                              firmName: { stringValue: queryText.trim() }
                          }
                      }
                  }
              }
          };

          setIsTyping(true);
          const response = await api.dialogflow.sendRequest({
              languageCode,
              queryText: queryText.trim(),
              sessionId,
              parameters,
              outputContexts: currentContexts
          });

          if (response.outputContexts) {
              setCurrentContexts(response.outputContexts);
          }

          const botMessage: HistoryEntry = {
              sender: 'bot',
              text: response.fulfillmentText || 
                  (languageCode === 'fr' 
                      ? "Entreprise sélectionnée. Veuillez entrer le nom de l'interlocuteur" 
                      : "Firm selected. Please enter interlocutor name"),
              timestamp: new Date()
          };

          const updatedMessages = [...messages, userMessage, botMessage];
          setMessages(updatedMessages);
          storeSession(sessionId, updatedMessages);
          setQueryText('');
          return;
      } catch (error) {
          console.error('Dialogflow error:', error);
          const errorMessage: HistoryEntry = {
              sender: 'bot',
              text: languageCode === 'fr' 
                  ? "Erreur lors du traitement. Veuillez réessayer." 
                  : "Processing error. Please try again.",
              timestamp: new Date(),
              isRetry: true
          };
          
          setMessages(prev => [...prev, errorMessage]);
          storeSession(sessionId, [...messages, userMessage, errorMessage]);
          return;
      } finally {
          setIsTyping(false);
      }
  }
 // Dans handleSubmit, avant l'envoi standard à Dialogflow
if (queryText.toLowerCase().includes('statut') || queryText.toLowerCase().includes('status')) {
  const statuses = await fetchAvailableStatuses();
  
  if (statuses.length > 0) {
    const statusMessage: HistoryEntry = {
      sender: 'bot',
      text: languageCode === 'fr' 
        ? 'Voici les statuts disponibles pour les devis :' 
        : 'Here are the available quotation statuses:',
      timestamp: new Date(),
      isStatusSelection: true,
      availableStatuses: statuses
    };

    const updatedMessages = [...messages, userMessage, statusMessage];
    setMessages(updatedMessages);
    storeSession(sessionId, updatedMessages);
    setIsTyping(false);
    return;
  }
}

  // Validation de la date d'échéance
  if (isInQuotationFlow() && getCurrentStep() === 'duedate') {
      const validation = validateDueDate(queryText.trim(), languageCode);
      
      if (!validation.isValid) {
          // Message d'erreur et on reste sur la même étape
          const errorMessage: HistoryEntry = {
              sender: 'bot',
              text: validation.error || (languageCode === 'fr' 
                  ? "Date d'échéance invalide. Veuillez réessayer." 
                  : "Invalid due date. Please try again."),
              timestamp: new Date(),
              isRetry: true
          };
          
          const updatedMessages = [...messages, userMessage, errorMessage];
          setMessages(updatedMessages);
          storeSession(sessionId, updatedMessages);
          setIsTyping(false);
          return;
      }

      // Si validation OK, on ajoute d'abord le message utilisateur
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      storeSession(sessionId, updatedMessages);

      // Puis on envoie à Dialogflow
      try {
          const parameters = {
              fields: {
                  queryText: { stringValue: queryText },
                  currentStep: { stringValue: 'duedate' }
              }
          };

          setIsTyping(true);
          const response = await api.dialogflow.sendRequest({
              languageCode,
              queryText: queryText,
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
              timestamp: new Date()
          };

          setMessages(prev => [...prev, botMessage]);
          storeSession(sessionId, [...updatedMessages, botMessage]);
          setQueryText('');
          return;
      } catch (error) {
          console.error('Dialogflow error:', error);
          const errorMessage: HistoryEntry = {
              sender: 'bot',
              text: languageCode === 'fr' 
                  ? "Erreur lors du traitement. Veuillez réessayer." 
                  : "Processing error. Please try again.",
              timestamp: new Date(),
              isRetry: true
          };
          
          setMessages(prev => [...prev, errorMessage]);
          storeSession(sessionId, [...updatedMessages, errorMessage]);
          return;
      } finally {
          setIsTyping(false);
      }
  }
    // Si validation OK ou si ce n'est pas l'étape 'duedate', on continue
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
  
      // Si c'est l'étape de sélection d'article
      // Dans la fonction handleSubmit, modifiez la partie qui gère la sélection d'article
// Dans la partie qui gère la sélection d'article (dans handleSubmit)
if (isInQuotationFlow() && getCurrentStep() === 'articleId') {
  const availableArticles = await fetchAvailableArticles();
  
  // Vérifier si l'ID saisi est valide
  const selectedId = parseInt(queryText);
  const selectedArticle = availableArticles.find(a => a.id === selectedId);
  
  if (isNaN(selectedId)) {
    const errorMessage: HistoryEntry = {
      sender: 'bot',
      text: languageCode === 'fr' 
        ? "Veuillez entrer un ID valide (nombre entier)" 
        : "Please enter a valid ID (integer)",
      timestamp: new Date(),
      isRetry: true
    };

    setMessages(prev => [...prev, errorMessage]);
    storeSession(sessionId, [...updatedMessages, errorMessage]);
    setIsTyping(false);
    return;
  }

  if (!selectedArticle) {
    const botMessage: HistoryEntry = {
      sender: 'bot',
      text: languageCode === 'fr' 
        ? "Article non disponible. Veuillez choisir parmi les articles disponibles :" 
        : "Article not available. Please choose from available articles:",
      timestamp: new Date(),
      isArticleSelection: true,
      availableArticles: availableArticles
    };

    setMessages(prev => [...prev, botMessage]);
    storeSession(sessionId, [...updatedMessages, botMessage]);
    setIsTyping(false);
    return;
  }

  // Mettre à jour le stock de l'article (décrémenter de 1)
  try {
    await updateArticleStock(selectedId, -1);
    
    // Mettre à jour la liste des articles disponibles avec la nouvelle quantité
    const updatedAvailableArticles = availableArticles.map(article => {
      if (article.id === selectedId) {
        return {
          ...article,
          quantity: article.quantity - 1 // Décrémente la quantité
        };
      }
      return article;
    });
    const refreshArticles = async () => {
      const refreshedArticles = await fetchAvailableArticles();
      setMessages(prev => prev.map(msg => 
        msg.isArticleSelection 
          ? { ...msg, availableArticles: refreshedArticles } 
          : msg
      ));
    };
    
    // Appelez cette fonction après chaque mise à jour de stock
    await updateArticleStock(selectedId, -1);
    await refreshArticles();

    // Si l'ID est valide, envoyer la réponse à Dialogflow
    const parameters = {
      fields: {
        queryText: { stringValue: queryText },
        currentStep: { stringValue: 'articleId' },
        articleId: { numberValue: selectedId },
        quotationData: {
          structValue: {
            fields: {
              articleId: { numberValue: selectedId }
            }
          }
        }
      }
    };

    const response = await api.dialogflow.sendRequest({
      languageCode,
      queryText: selectedId.toString(),
      sessionId,
      parameters,
      outputContexts: currentContexts
    });

    if (response.outputContexts) {
      setCurrentContexts(response.outputContexts);
    }

    const botMessage: HistoryEntry = {
      sender: 'bot',
      text: response.fulfillmentText || 
        (languageCode === 'fr' 
          ? "Article sélectionné. Veuillez entrer la quantité" 
          : "Article selected. Please enter the quantity"),
      timestamp: new Date(),
      availableArticles: updatedAvailableArticles // Envoyer la liste mise à jour
    };

    setMessages(prev => [...prev, botMessage]);
    storeSession(sessionId, [...updatedMessages, botMessage]);
    setIsTyping(false);
    return;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du stock:", error);
    const errorMessage: HistoryEntry = {
      sender: 'bot',
      text: languageCode === 'fr' 
        ? "Erreur lors de la sélection de l'article. Veuillez réessayer." 
        : "Error selecting article. Please try again.",
      timestamp: new Date(),
      isRetry: true
    };
    
    setMessages(prev => [...prev, errorMessage]);
    storeSession(sessionId, [...updatedMessages, errorMessage]);
    setIsTyping(false);
    return;
  }
}
  
      // Vérification du format QUO-XXXXXX pour le numéro séquentiel
      if (isInQuotationFlow() && getCurrentStep() === 'sequentialNumbr') {
        const sequentialNumber = queryText.trim();
        
        if (!/^QUO-\d{6}$/.test(sequentialNumber)) {
          throw new Error(
            languageCode === 'fr' 
              ? "Format invalide. Le numéro de devis doit être strictement sous la forme QUO-123456 (QUO en majuscules suivi d'un tiret et exactement 6 chiffres)" 
              : "Invalid format. The quotation number must be strictly in QUO-123456 format (QUO in uppercase followed by a hyphen and exactly 6 digits)"
          );
        }
  
        try {
          const checkResponse = await api.expense_quotation.checkSequentialNumber(sequentialNumber);
          if (checkResponse.exists) {
            const errorMessage: HistoryEntry = {
              sender: 'bot',
              text: languageCode === 'fr'
                ? `Le numéro ${sequentialNumber} existe déjà. Veuillez entrer un autre numéro.`
                : `The number ${sequentialNumber} already exists. Please enter a different number.`,
              timestamp: new Date(),
              isRetry: true
            };
            
            setMessages(prev => [...prev, errorMessage]);
            storeSession(sessionId, [...updatedMessages, errorMessage]);
            setIsTyping(false);
            return;
          }
        } catch (error) {
          console.error('Error checking quotation number:', error);
          // Continuer malgré l'erreur de vérification
        }
      }
  
      // Envoi standard à Dialogflow pour les autres cas
      const parameters: any = {
        fields: {
          queryText: { stringValue: queryText }
        }
      };
  
      if (isInQuotationFlow()) {
        parameters.fields.currentStep = { stringValue: getCurrentStep() };
        
        if (getCurrentStep() === 'sequentialNumbr') {
          parameters.fields.quotationNumber = { stringValue: queryText.trim().toUpperCase() };
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
      const errorMessage: HistoryEntry = {
        sender: 'bot',
        text: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      storeSession(sessionId, [...updatedMessages, errorMessage]);
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
      // Affichage de la sélection d'articles (existant)
      // Dans le JSX, modifiez la partie qui affiche les articles
     // Dans le JSX, modifiez la partie qui affiche les articles
if (msg.isArticleSelection && msg.availableArticles) {
  return (
    <div key={index} className="flex justify-start">
      <Avatar className="h-8 w-8 mt-1 mr-2">
        <AvatarImage src="/bot-avatar.png" />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div className="max-w-[80%]">
        <div className="bg-white border rounded-lg px-4 py-2 rounded-tl-none">
          <div className="text-sm mb-2">{msg.text}</div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2">
            {msg.availableArticles.map(article => (
              <Button
              key={article.id}
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={article.quantity <= 0} // Désactive si quantité insuffisante
              onClick={async () => {
                try {
                  const availability = await checkArticleAvailability(article.id, 1);
                  if (!availability.available) {
                    // Afficher message d'erreur
                    return;
                  }
            
                  // Mettre à jour le stock
                  const updatedArticle = await updateArticleStock(article.id, -1);
                  
                  // Mettre à jour l'UI
                  const newAvailableArticles = msg.availableArticles?.map(a => 
                    a.id === article.id 
                      ? { ...a, quantity: updatedArticle.quantityInStock }
                      : a
                  );
            
                  // Créer un nouveau message avec les quantités mises à jour
                  const updatedMessage = {
                    ...msg,
                    availableArticles: newAvailableArticles
                  };
            
                  // Mettre à jour les messages
                  setMessages(prev => prev.map(m => m === msg ? updatedMessage : m));
                  
                  // Sélectionner l'article
                  setQueryText(article.id.toString());
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                  handleSubmit(fakeEvent);
                } catch (error) {
                  console.error("Erreur:", error);
                  // Afficher message d'erreur
                }
              }}
            >
              {article.id} ({languageCode === 'fr' ? 'Dispo' : 'Avail'}: {article.quantity})
            </Button>
            ))}
          </div>
          <div className="text-xs mt-2 text-right text-gray-500">
            {formatTime(msg.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}

      // Nouveau: Affichage de la sélection de firms
      if (msg.isFirmSelection && msg.availableFirms) {
        return (
          <div key={index} className="flex justify-start">
            <Avatar className="h-8 w-8 mt-1 mr-2">
              <AvatarImage src="/bot-avatar.png" />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="max-w-[80%]">
              <div className="bg-white border rounded-lg px-4 py-2 rounded-tl-none">
                <div className="text-sm mb-2">{msg.text}</div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2">
                  {msg.availableFirms.map((firm, firmIndex) => (
                    <Button
                      key={`${firm}-${firmIndex}`}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setQueryText(firm);
                        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                        handleSubmit(fakeEvent);
                      }}
                    >
                      {firm}
                    </Button>
                  ))}
                </div>
                <div className="text-xs mt-2 text-right text-gray-500">
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          </div>
        );
      }
      // Dans le JSX, avec les autres conditions de rendu
// Dans le JSX, avec les autres conditions de rendu
if (msg.isStatusSelection && msg.availableStatuses) {
  return (
    <div key={index} className="flex justify-start">
      <Avatar className="h-8 w-8 mt-1 mr-2">
        <AvatarImage src="/bot-avatar.png" />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div className="max-w-[80%]">
        <div className="bg-white border rounded-lg px-4 py-2 rounded-tl-none">
          <div className="text-sm mb-2">{msg.text}</div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2">
            {msg.availableStatuses.map((status, statusIndex) => (
              <Button
                key={`${status.value}-${statusIndex}`}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setQueryText(status.value); // Envoie la valeur au backend
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                  handleSubmit(fakeEvent);
                }}
              >
                {status.label} {/* Affiche le label traduit */}
              </Button>
            ))}
          </div>
          <div className="text-xs mt-2 text-right text-gray-500">
            {formatTime(msg.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}
// Ajoutez ce bloc avec les autres conditions de rendu
if (msg.isCurrencySelection && msg.availableCurrencies) {
  return (
    <div key={index} className="flex justify-start">
      <Avatar className="h-8 w-8 mt-1 mr-2">
        <AvatarImage src="/bot-avatar.png" />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>
      <div className="max-w-[80%]">
        <div className="bg-white border rounded-lg px-4 py-2 rounded-tl-none">
          <div className="text-sm mb-2">{msg.text}</div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2">
            {msg.availableCurrencies.map((currency, currencyIndex) => (
              <Button
                key={`${currency}-${currencyIndex}`}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setQueryText(currency);
                  const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                  handleSubmit(fakeEvent);
                }}
              >
                {currency}
              </Button>
            ))}
          </div>
          <div className="text-xs mt-2 text-right text-gray-500">
            {formatTime(msg.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}
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
    {isInQuotationFlow() && getCurrentStep() === 'unitPrice' ? (
      <div className="flex gap-2 w-full">
        <Input
          type="text"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder={getInputPlaceholder()}
          className="flex-1 rounded-full"
        />
        <Select 
          value={selectedCurrency}
          onValueChange={(value) => setSelectedCurrency(value)}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Devise" />
          </SelectTrigger>
          <SelectContent>
            {['EUR', 'USD', 'GBP', 'JPY'].map((currency) => (
              <SelectItem key={currency} value={currency}>
                {currency}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ) : (
      <Input
        type="text"
        value={queryText}
        onChange={(e) => {
          const val = isInQuotationFlow() && getCurrentStep() === 'sequentialNumbr' 
            ? e.target.value.toUpperCase() 
            : e.target.value;
          setQueryText(val);
        }}
        placeholder={getInputPlaceholder()}
        className="flex-1 rounded-full"
      />
    )}
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