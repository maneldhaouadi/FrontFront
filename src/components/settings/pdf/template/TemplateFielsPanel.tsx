'use client'

import { templateApi } from '@/api'
import { Button } from '@/components/ui/button'
import { Template, TemplateType } from '@/types/template'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TemplateFieldsPanelProps {
  onInsertField: (fieldPath: string, type: TemplateType) => void;
  type: TemplateType | string;
  compact?: boolean;
  templateData?: Template;
}

type SectionKey = 'header' | 'client' | 'totals' | 'details' | 'articles' | 'taxes' | 'company' | 'bank' | 'delivery' | 'invoicing' | 'fodec'

interface Field {
  name: string
  path: string
  template?: string
  description?: string
}

interface Section {
  title: string
  fields: Field[]
}

const DEFAULT_OPEN_SECTIONS: Record<SectionKey, boolean> = {
  header: true,
  client: true,
  totals: true,
  details: true,
  articles: true,
  taxes: true,
  company: true,
  bank: true,
  delivery: true,
  invoicing: true,
  fodec: true
}

const SECTION_ORDER: SectionKey[] = [
  'header',
  'company',
  'client',
  'delivery',
  'invoicing',
  'bank',
  'articles',
  'taxes',
  'fodec',
  'totals',
  'details'
]

export function TemplateFieldsPanel({
  onInsertField,
  type: initialType,
  compact = false,
  templateData
}: TemplateFieldsPanelProps) {
  const [fetchedTemplateData, setFetchedTemplateData] = useState<Template | undefined>()
  const [loading, setLoading] = useState(false)

  const normalizeType = (type: TemplateType | string): TemplateType => {
    if (typeof type === 'string') {
      const lowerType = type.toLowerCase()
      switch (lowerType) {
        case 'invoice': return TemplateType.INVOICE
        case 'quotation': return TemplateType.QUOTATION
        case 'payment': return TemplateType.PAYMENT
        default: return TemplateType.QUOTATION
      }
    }
    return type
  }

  const fetchTemplateByType = async (type: TemplateType) => {
    setLoading(true)
    try {
      const templates = await templateApi.findByType(type)
      if (templates.length > 0) {
        setFetchedTemplateData(templates[0])
      }
    } catch (error) {
      console.error("Erreur de récupération:", error)
    } finally {
      setLoading(false)
    }
  }

  const getEffectiveType = (): TemplateType => {
    if (templateData?.type) {
      const normalized = templateData.type.toLowerCase();
      if (Object.values(TemplateType).includes(normalized as TemplateType)) {
        return normalized as TemplateType;
      }
    }
    
    if (initialType && Object.values(TemplateType).includes(initialType as TemplateType)) {
      return initialType as TemplateType;
    }
    
    console.warn('Type de template non reconnu, utilisation du fallback INVOICE');
    return TemplateType.INVOICE;
  };

  const type = getEffectiveType();

  useEffect(() => {
    if (!templateData) {
      fetchTemplateByType(type)
    }
  }, [type, templateData])

  const effectiveTemplateData = templateData || fetchedTemplateData

  useEffect(() => {
    console.log("Détection du type:", {
      initialType,
      templateDataType: templateData?.type,
      effectiveType: type,
      source: templateData ? 'props' : 'api'
    })
  }, [type, templateData])

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(DEFAULT_OPEN_SECTIONS)

  const toggleSection = (section: SectionKey) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const getCommonFields = (): Record<SectionKey, Section> => ({
    header: {
      title: 'En-tête',
      fields: [
        { name: 'Type de document', path: 'meta.type' },
        { name: 'Numéro', path: 'sequential' },
        { name: 'Date', path: 'date' },
        { name: 'Date d\'échéance', path: 'dueDate' },
        { name: 'Objet', path: 'object' },
        { name: 'Statut', path: 'status' }
      ]
    },
    company: {
      title: 'Société',
      fields: [
        { name: 'Nom', path: 'cabinet.enterpriseName' },
        { 
          name: 'Adresse complète', 
          path: 'cabinet.address.full', 
          template: '{{cabinet.address.address}}, {{cabinet.address.zipcode}} {{cabinet.address.region}}, {{cabinet.address.country}}'
        },
        { name: 'Adresse', path: 'cabinet.address.address' },
        { name: 'Code postal', path: 'cabinet.address.zipcode' },
        { name: 'Région', path: 'cabinet.address.region' },
        { name: 'Pays', path: 'cabinet.address.country' },
        { name: 'Téléphone', path: 'cabinet.phone' },
        { name: 'Email', path: 'cabinet.email' },
        { name: 'Matricule fiscal', path: 'cabinet.taxIdentificationNumber' },
        { name: 'Logo', path: 'logo', template: '<img src="{{logo}}" style="max-width: 200px; max-height: 100px;">' }
      ]
    },
    client: {
      title: 'Client',
      fields: [
        { name: 'Nom', path: 'firm.name' },
        { name: 'Contact', path: 'interlocutor.name' },
        { name: 'Téléphone', path: 'firm.phone' },
        { name: 'Email', path: 'firm.email' },
        { name: 'Matricule fiscal', path: 'firm.taxIdentificationNumber' }
      ]
    },
    delivery: {
      title: 'Adresse de livraison',
      fields: [
        { 
          name: 'Adresse complète', 
          path: 'firm.deliveryAddress.full',
          template: '{{firm.deliveryAddress.address}}, {{firm.deliveryAddress.zipcode}} {{firm.deliveryAddress.region}}, {{firm.deliveryAddress.country}}'
        },
        { name: 'Adresse', path: 'firm.deliveryAddress.address' },
        { name: 'Code postal', path: 'firm.deliveryAddress.zipcode' },
        { name: 'Région', path: 'firm.deliveryAddress.region' },
        { name: 'Pays', path: 'firm.deliveryAddress.country' }
      ]
    },
    invoicing: {
      title: 'Adresse de facturation',
      fields: [
        { 
          name: 'Adresse complète', 
          path: 'firm.invoicingAddress.full',
          template: '{{firm.invoicingAddress.address}}, {{firm.invoicingAddress.zipcode}} {{firm.invoicingAddress.region}}, {{firm.invoicingAddress.country}}'
        },
        { name: 'Adresse', path: 'firm.invoicingAddress.address' },
        { name: 'Code postal', path: 'firm.invoicingAddress.zipcode' },
        { name: 'Région', path: 'firm.invoicingAddress.region' },
        { name: 'Pays', path: 'firm.invoicingAddress.country' }
      ]
    },
    bank: {
      title: 'Banque',
      fields: [
        { name: 'Nom de la banque', path: 'bankAccount.bankName' },
        { name: 'Code banque', path: 'bankAccount.bankCode' },
        { name: 'Code agence', path: 'bankAccount.branchCode' },
        { name: 'Numéro de compte', path: 'bankAccount.accountNumber' },
        { name: 'Clé RIB', path: 'bankAccount.ribKey' },
        { name: 'IBAN', path: 'bankAccount.iban' },
        { name: 'BIC/SWIFT', path: 'bankAccount.bic' }
      ]
    },
    fodec: {
      title: 'FODEC',
      fields: [
        { name: 'Montant FODEC', path: 'fodec.amount', description: 'Montant de la contribution FODEC' },
        { name: 'Taux FODEC', path: 'fodec.rate', description: 'Taux de la contribution FODEC (%)' },
        { name: 'Base FODEC', path: 'fodec.base', description: 'Base de calcul de la FODEC' }
      ]
    },
    articles: { title: 'Articles', fields: [] },
    taxes: { title: 'Taxes', fields: [] },
    totals: { title: 'Totaux', fields: [] },
    details: { title: 'Détails', fields: [] }
  })

  const getTypeSpecificFields = (): Partial<Record<SectionKey, Section>> => {
    switch (type) {
      case TemplateType.INVOICE: 
  return {
    articles: {
      title: 'Lignes de facture',
      fields: [
        { 
          name: 'Liste complète des articles',
          path: 'articleExpenseEntries',
          template: `<% if (invoice.articleExpenseEntries?.length) { %>
            <table class="article-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Description</th>
                  <th>Référence</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>Remise</th>
                  <th>Sous-total</th>
                </tr>
              </thead>
              <tbody>
                <% invoice.articleExpenseEntries.forEach(function(entry, index) { %>
                  <tr>
                    <td><%= entry.article?.title || 'Sans titre' %></td>
                    <td><%= entry.article?.description || '-' %></td>
                    <td><%= entry.article?.reference || '-' %></td>
                    <td><%= entry.quantity || '0' %> <%= entry.unit || 'unité' %></td>
                    <td><%= entry.unit_price || '0' %> <%= invoice.currency?.symbol || '' %></td>
                    <td>
                      <% if (entry.discount > 0) { %>
                        <%= entry.discount %><%= entry.discount_type === 'PERCENT' ? '%' : ' ' + (invoice.currency?.symbol || '') %>
                      <% } else { %>
                        -
                      <% } %>
                    </td>
                    <td><%= entry.subTotal || '0' %> <%= invoice.currency?.symbol || '' %></td>
                  </tr>
                <% }); %>
              </tbody>
            </table>
          <% } else { %>
            <p class="no-articles">Aucun article dans cette facture</p>
          <% } %>`
        },
        { 
          name: 'Tous les titres d\'articles',
          path: 'articleExpenseEntries[].article.title',
          template: `<% if (invoice.articleExpenseEntries?.length) { %>
            <div class="article-titles">
              <% invoice.articleExpenseEntries.forEach(function(entry, index) { %>
                <div class="title-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.article?.title || 'Sans titre' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Toutes les descriptions',
          path: 'articleExpenseEntries[].article.description',
          template: `<% if (invoice.articleExpenseEntries?.length) { %>
            <div class="article-descriptions">
              <% invoice.articleExpenseEntries.forEach(function(entry, index) { %>
                <div class="description-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.article?.description || 'Pas de description' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Toutes les références',
          path: 'articleExpenseEntries[].article.reference',
          template: `<% if (invoice.articleExpenseEntries?.length) { %>
            <div class="article-references">
              <% invoice.articleExpenseEntries.forEach(function(entry, index) { %>
                <div class="reference-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.article?.reference || 'Pas de référence' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Toutes les quantités',
          path: 'articleExpenseEntries[].quantity',
          template: `<% if (invoice.articleExpenseEntries?.length) { %>
            <div class="article-quantities">
              <% invoice.articleExpenseEntries.forEach(function(entry, index) { %>
                <div class="quantity-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.quantity || '0' %> <%= entry.unit || 'unité' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Tous les prix unitaires',
          path: 'articleExpenseEntries[].unit_price',
          template: `<% if (invoice.articleExpenseEntries?.length) { %>
            <div class="article-unit-prices">
              <% invoice.articleExpenseEntries.forEach(function(entry, index) { %>
                <div class="unit-price-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.unit_price || '0' %> <%= invoice.currency?.symbol || '' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Toutes les remises',
          path: 'articleExpenseEntries[].discount',
          template: `<% if (invoice.articleExpenseEntries?.length) { %>
            <div class="article-discounts">
              <% invoice.articleExpenseEntries.forEach(function(entry, index) { %>
                <div class="discount-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p>
                    <% if (entry.discount > 0) { %>
                      <%= entry.discount %><%= entry.discount_type === 'PERCENT' ? '%' : ' ' + (invoice.currency?.symbol || '') %>
                    <% } else { %>
                      Aucune remise
                    <% } %>
                  </p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Tous les sous-totaux',
          path: 'articleExpenseEntries[].subTotal',
          template: `<% if (invoice.articleExpenseEntries?.length) { %>
            <div class="article-subtotals">
              <% invoice.articleExpenseEntries.forEach(function(entry, index) { %>
                <div class="subtotal-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.subTotal || '0' %> <%= invoice.currency?.symbol || '' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        }
      ]
    },
    taxes: {
      title: 'Taxes',
      fields: [
        { 
          name: 'Récapitulatif des taxes',
          path: 'taxSummary',
          template: `<% if (invoice.taxSummary?.length) { %>
            <table class="tax-summary">
              <thead>
                <tr>
                  <th>Taxe</th>
                  <th>Taux</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                <% invoice.taxSummary.forEach(function(tax) { %>
                  <tr>
                    <td><%= tax.label %></td>
                    <td><%= tax.rate %>%</td>
                    <td><%= tax.amount %> <%= invoice.currency?.symbol || '' %></td>
                  </tr>
                <% }); %>
              </tbody>
            </table>
          <% } else { %>
            <p class="no-taxes">Aucune taxe applicable</p>
          <% } %>`
        },
        { 
          name: 'Détail des taxes par article',
          path: 'articleExpenseEntries[].expenseArticleInvoiceEntryTaxes',
          template: `<% if (invoice.articleExpenseEntries?.length) { %>
            <div class="article-taxes">
              <% invoice.articleExpenseEntries.forEach(function(entry, index) { %>
                <div class="taxes-for-article">
                  <h4>Article <%= index + 1 %>: <%= entry.article?.title || 'Sans titre' %></h4>
                  <% if (entry.expenseArticleInvoiceEntryTaxes?.length) { %>
                    <table>
                      <thead>
                        <tr>
                          <th>Taxe</th>
                          <th>Taux</th>
                          <th>Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        <% entry.expenseArticleInvoiceEntryTaxes.forEach(function(taxEntry) { %>
                          <tr>
                            <td><%= taxEntry.tax?.label || 'Taxe' %></td>
                            <td><%= taxEntry.tax?.rate %>%</td>
                            <td><%= taxEntry.amount %> <%= invoice.currency?.symbol || '' %></td>
                          </tr>
                        <% }); %>
                      </tbody>
                    </table>
                  <% } else { %>
                    <p class="no-taxes-for-article">Pas de taxes pour cet article</p>
                  <% } %>
                </div>
              <% }); %>
            </div>
          <% } %>`
        }
      ]
    },
    totals: {
      title: 'Totaux',
      fields: [
        { 
          name: 'Sous-total HT',
          path: 'subTotal',
          template: `<div class="total-row">
            <span>Sous-total HT:</span>
            <span><%= invoice.subTotal || 0 %> <%= invoice.currency?.symbol || '' %></span>
          </div>`
        },
        { 
          name: 'Remise globale',
          path: 'discount',
          template: `<div class="total-row">
            <span>Remise globale:</span>
            <span>
              <%= invoice.discount || 0 %><%= invoice.discount_type === 'PERCENT' ? '%' : ' ' + (invoice.currency?.symbol || '') %>
            </span>
          </div>`
        },
        { 
          name: 'Total HT',
          path: 'totalHT',
          template: `<div class="total-row">
            <span>Total HT:</span>
            <span><%= invoice.totalHT || 0 %> <%= invoice.currency?.symbol || '' %></span>
          </div>`
        },
        { 
          name: 'Total TVA',
          path: 'totalTVA',
          template: `<div class="total-row">
            <span>Total TVA:</span>
            <span><%= invoice.totalTVA || 0 %> <%= invoice.currency?.symbol || '' %></span>
          </div>`
        },
        { 
          name: 'Total FODEC',
          path: 'totalFODEC',
          template: `<div class="total-row">
            <span>Total FODEC:</span>
            <span><%= invoice.totalFODEC || 0 %> <%= invoice.currency?.symbol || '' %></span>
          </div>`
        },
        { 
          name: 'Total TTC',
          path: 'total',
          template: `<div class="total-row total-ttc">
            <strong>Total TTC:</strong>
            <strong><%= invoice.total || 0 %> <%= invoice.currency?.symbol || '' %></strong>
          </div>`
        },
        { 
          name: 'Montant payé',
          path: 'amountPaid',
          template: `<div class="total-row">
            <span>Montant payé:</span>
            <span><%= invoice.amountPaid || 0 %> <%= invoice.currency?.symbol || '' %></span>
          </div>`
        },
        { 
          name: 'Reste à payer',
          path: 'remainingAmount',
          template: `<div class="total-row">
            <span>Reste à payer:</span>
            <span><%= invoice.remainingAmount || 0 %> <%= invoice.currency?.symbol || '' %></span>
          </div>`
        }
      ]
    },
    details: {
      title: 'Détails',
      fields: [
        { 
          name: 'Conditions générales',
          path: 'generalConditions',
          template: `<div class="general-conditions">
            <h4>Conditions générales</h4>
            <p><%= invoice.generalConditions || 'Aucune condition générale spécifiée' %></p>
          </div>`
        },
        { 
          name: 'Validité',
          path: 'validityPeriod',
          template: `<div class="validity-period">
            <p>Validité de la facture: <%= invoice.validityPeriod ? invoice.validityPeriod + ' jours' : 'Non spécifiée' %></p>
          </div>`
        },
        { 
          name: 'Notes',
          path: 'notes',
          template: `<div class="notes">
            <h4>Notes</h4>
            <p><%= invoice.notes || 'Aucune note' %></p>
          </div>`
        }
      ]
    }
  };

        case TemplateType.QUOTATION:
  return {
    articles: {
      title: 'Lignes de devis',
      fields: [
        { 
          name: 'Liste complète des articles',
          path: 'expensearticleQuotationEntries',
          template: `<% if (quotation.expensearticleQuotationEntries?.length) { %>
            <table class="article-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Description</th>
                  <th>Référence</th>
                  <th>Quantité</th>
                  <th>Prix unitaire</th>
                  <th>Remise</th>
                  <th>Sous-total</th>
                </tr>
              </thead>
              <tbody>
                <% quotation.expensearticleQuotationEntries.forEach(function(entry, index) { %>
                  <tr>
                    <td><%= entry.article?.title || 'Sans titre' %></td>
                    <td><%= entry.article?.description || '-' %></td>
                    <td><%= entry.article?.reference || '-' %></td>
                    <td><%= entry.quantity || '0' %> <%= entry.unit || 'unité' %></td>
                    <td><%= entry.unit_price || '0' %> <%= quotation.currency?.symbol || '' %></td>
                    <td>
                      <% if (entry.discount > 0) { %>
                        <%= entry.discount %><%= entry.discount_type === 'PERCENT' ? '%' : ' ' + (quotation.currency?.symbol || '') %>
                      <% } else { %>
                        -
                      <% } %>
                    </td>
                    <td><%= entry.subTotal || '0' %> <%= quotation.currency?.symbol || '' %></td>
                  </tr>
                <% }); %>
              </tbody>
            </table>
          <% } else { %>
            <p class="no-articles">Aucun article dans ce devis</p>
          <% } %>`
        },
        { 
          name: 'Tous les titres d\'articles',
          path: 'expensearticleQuotationEntries[].article.title',
          template: `<% if (quotation.expensearticleQuotationEntries?.length) { %>
            <div class="article-titles">
              <% quotation.expensearticleQuotationEntries.forEach(function(entry, index) { %>
                <div class="title-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.article?.title || 'Sans titre' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Toutes les descriptions',
          path: 'expensearticleQuotationEntries[].article.description',
          template: `<% if (quotation.expensearticleQuotationEntries?.length) { %>
            <div class="article-descriptions">
              <% quotation.expensearticleQuotationEntries.forEach(function(entry, index) { %>
                <div class="description-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.article?.description || 'Pas de description' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Toutes les références',
          path: 'expensearticleQuotationEntries[].article.reference',
          template: `<% if (quotation.expensearticleQuotationEntries?.length) { %>
            <div class="article-references">
              <% quotation.expensearticleQuotationEntries.forEach(function(entry, index) { %>
                <div class="reference-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.article?.reference || 'Pas de référence' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Toutes les quantités',
          path: 'expensearticleQuotationEntries[].quantity',
          template: `<% if (quotation.expensearticleQuotationEntries?.length) { %>
            <div class="article-quantities">
              <% quotation.expensearticleQuotationEntries.forEach(function(entry, index) { %>
                <div class="quantity-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.quantity || '0' %> <%= entry.unit || 'unité' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Tous les prix unitaires',
          path: 'expensearticleQuotationEntries[].unit_price',
          template: `<% if (quotation.expensearticleQuotationEntries?.length) { %>
            <div class="article-unit-prices">
              <% quotation.expensearticleQuotationEntries.forEach(function(entry, index) { %>
                <div class="unit-price-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.unit_price || '0' %> <%= quotation.currency?.symbol || '' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Toutes les remises',
          path: 'expensearticleQuotationEntries[].discount',
          template: `<% if (quotation.expensearticleQuotationEntries?.length) { %>
            <div class="article-discounts">
              <% quotation.expensearticleQuotationEntries.forEach(function(entry, index) { %>
                <div class="discount-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p>
                    <% if (entry.discount > 0) { %>
                      <%= entry.discount %><%= entry.discount_type === 'PERCENT' ? '%' : ' ' + (quotation.currency?.symbol || '') %>
                    <% } else { %>
                      Aucune remise
                    <% } %>
                  </p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        },
        { 
          name: 'Tous les sous-totaux',
          path: 'expensearticleQuotationEntries[].subTotal',
          template: `<% if (quotation.expensearticleQuotationEntries?.length) { %>
            <div class="article-subtotals">
              <% quotation.expensearticleQuotationEntries.forEach(function(entry, index) { %>
                <div class="subtotal-item">
                  <strong>Article <%= index + 1 %>:</strong>
                  <p><%= entry.subTotal || '0' %> <%= quotation.currency?.symbol || '' %></p>
                </div>
              <% }); %>
            </div>
          <% } %>`
        }
      ]
    },
    taxes: {
      title: 'Taxes',
      fields: [
        { 
          name: 'Récapitulatif des taxes',
          path: 'taxSummary',
          template: `<% if (quotation.taxSummary?.length) { %>
            <table class="tax-summary">
              <thead>
                <tr>
                  <th>Taxe</th>
                  <th>Taux</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                <% quotation.taxSummary.forEach(function(tax) { %>
                  <tr>
                    <td><%= tax.label %></td>
                    <td><%= tax.rate %>%</td>
                    <td><%= tax.amount %> <%= quotation.currency?.symbol || '' %></td>
                  </tr>
                <% }); %>
              </tbody>
            </table>
          <% } else { %>
            <p class="no-taxes">Aucune taxe applicable</p>
          <% } %>`
        },
        { 
          name: 'Détail des taxes par article',
          path: 'expensearticleQuotationEntries[].articleQuotationEntryTaxes',
          template: `<% if (quotation.expensearticleQuotationEntries?.length) { %>
            <div class="article-taxes">
              <% quotation.expensearticleQuotationEntries.forEach(function(entry, index) { %>
                <div class="taxes-for-article">
                  <h4>Article <%= index + 1 %>: <%= entry.article?.title || 'Sans titre' %></h4>
                  <% if (entry.articleQuotationEntryTaxes?.length) { %>
                    <table>
                      <thead>
                        <tr>
                          <th>Taxe</th>
                          <th>Taux</th>
                          <th>Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        <% entry.articleQuotationEntryTaxes.forEach(function(taxEntry) { %>
                          <tr>
                            <td><%= taxEntry.tax?.label || 'Taxe' %></td>
                            <td><%= taxEntry.tax?.rate %>%</td>
                            <td><%= taxEntry.amount %> <%= quotation.currency?.symbol || '' %></td>
                          </tr>
                        <% }); %>
                      </tbody>
                    </table>
                  <% } else { %>
                    <p class="no-taxes-for-article">Pas de taxes pour cet article</p>
                  <% } %>
                </div>
              <% }); %>
            </div>
          <% } %>`
        }
      ]
    },
    totals: {
      title: 'Totaux',
      fields: [
        { 
          name: 'Sous-total HT',
          path: 'subTotal',
          template: `<div class="total-row">
            <span>Sous-total HT:</span>
            <span><%= quotation.subTotal || 0 %> <%= quotation.currency?.symbol || '' %></span>
          </div>`
        },
        { 
          name: 'Remise globale',
          path: 'discount',
          template: `<div class="total-row">
            <span>Remise globale:</span>
            <span>
              <%= quotation.discount || 0 %><%= quotation.discount_type === 'PERCENT' ? '%' : ' ' + (quotation.currency?.symbol || '') %>
            </span>
          </div>`
        },
        { 
          name: 'Total HT',
          path: 'totalHT',
          template: `<div class="total-row">
            <span>Total HT:</span>
            <span><%= quotation.totalHT || 0 %> <%= quotation.currency?.symbol || '' %></span>
          </div>`
        },
        { 
          name: 'Total TVA',
          path: 'totalVAT',
          template: `<div class="total-row">
            <span>Total TVA:</span>
            <span><%= quotation.totalVAT || 0 %> <%= quotation.currency?.symbol || '' %></span>
          </div>`
        },
        { 
          name: 'Total FODEC',
          path: 'fodec.amount',
          template: `<div class="total-row">
            <span>Total FODEC:</span>
            <span><%= quotation.fodec?.amount || 0 %> <%= quotation.currency?.symbol || '' %></span>
          </div>`
        },
        { 
          name: 'Total TTC',
          path: 'total',
          template: `<div class="total-row total-ttc">
            <strong>Total TTC:</strong>
            <strong><%= quotation.total || 0 %> <%= quotation.currency?.symbol || '' %></strong>
          </div>`
        }
      ]
    },
    details: {
      title: 'Détails',
      fields: [
        { 
          name: 'Conditions générales',
          path: 'generalConditions',
          template: `<div class="general-conditions">
            <h4>Conditions générales</h4>
            <p><%= quotation.generalConditions || 'Aucune condition générale spécifiée' %></p>
          </div>`
        },
        { 
          name: 'Validité',
          path: 'validityPeriod',
          template: `<div class="validity-period">
            <p>Validité du devis: <%= quotation.validityPeriod ? quotation.validityPeriod + ' jours' : 'Non spécifiée' %></p>
          </div>`
        },
        { 
          name: 'Notes',
          path: 'notes',
          template: `<div class="notes">
            <h4>Notes</h4>
            <p><%= quotation.notes || 'Aucune note' %></p>
          </div>`
        }
      ]
    }
  };
  case TemplateType.PAYMENT:
    return {
      details: {
        title: 'Détails paiement',
        fields: [
          { 
            name: 'Méthode de paiement', 
            path: 'mode',
            template: `<% if (payment.mode) { %>
              <span class="payment-mode">
                <% 
                  const modeMap = {
                    'CASH': 'Espèces',
                    'CHECK': 'Chèque',
                    'TRANSFER': 'Virement',
                    'CREDIT_CARD': 'Carte bancaire'
                  };
                  const translatedMode = modeMap[payment.mode] || payment.mode;
                %>
                <%= translatedMode %>
              </span>
            <% } %>`
          },
          { name: 'Référence', path: 'sequential' },
          { 
            name: 'Date paiement', 
            path: 'date',
            template: `<%= payment.date ? new Date(payment.date).toLocaleDateString('fr-FR') : 'Non spécifiée' %>`
          },
          { 
            name: 'Factures associées', 
            path: 'invoices',
            template: `<% if (payment.invoices?.length) { %>
              <ul class="linked-invoices">
                <% payment.invoices.forEach(invoice => { %>
                  <li class="invoice-item">
  <div class="invoice-row">
    <span class="invoice-label">Numéro:</span>
    <span class="invoice-value"><%= invoice.invoiceNumber || 'N/A' %></span>
  </div>
  <div class="invoice-row">
    <span class="invoice-label">Date facture:</span>
    <span class="invoice-value"><%= invoice.invoiceDate || 'N/A' %></span>
  </div>
  <div class="invoice-row">
    <span class="invoice-label">Échéance:</span>
    <span class="invoice-value"><%= invoice.dueDate || 'N/A' %></span>
  </div>
  <div class="invoice-row">
    <span class="invoice-label">Total:</span>
    <span class="invoice-value"><%= invoice.total || '0' %> <%= invoice.currency || '' %></span>
  </div>
  <div class="invoice-row">
    <span class="invoice-label">Taux de change:</span>
    <span class="invoice-value"><%= invoice.exchangeRate || '1.0' %></span>
  </div>
  <div class="invoice-row">
    <span class="invoice-label">Paiement:</span>
    <span class="invoice-value"><%= invoice.amount || '0' %> <%= invoice.currency || '' %></span>
  </div>
  <div class="invoice-row">
    <span class="invoice-label">Montant restant:</span>
    <span class="invoice-value"><%= invoice.remainingAmount >= 0 ? invoice.remainingAmount : 0 %> <%= invoice.currency || '' %></span>
  </div>
</li>
                <% }); %>
              </ul>
            <% } else { %>
              <p>Aucune facture associée</p>
            <% } %>`
          },
          { 
            name: 'Statut', 
            path: 'status',
            template: `<%= payment.status || 'Non spécifié' %>`
          }
        ]
      },
      totals: {
        title: 'Montants',
        fields: [
          { 
            name: 'Montant', 
            path: 'amount',
            template: `<%= payment.amount || 0 %> <%= payment.currency?.symbol || '' %>`
          },
          { 
            name: 'Frais', 
            path: 'fee',
            template: `<%= payment.fee || 0 %> <%= payment.currency?.symbol || '' %>`
          },
          { 
            name: 'Total', 
            path: 'total',
            template: `<%
              const amount = payment.amount || 0;
              const fee = payment.fee || 0;
              const total = amount + fee;
            %>
            <%= total %> <%= payment.currency?.symbol || '' %>`
          },
          { 
            name: 'Devise', 
            path: 'currency.symbol',
            template: `<%= payment.currency?.symbol || 'EUR' %>`
          }
        ]
      }
    }
      
      default:
        return {}
    }
  }

  const templateFields = {
    ...getCommonFields(),
    ...getTypeSpecificFields()
  }

  const renderSection = (sectionKey: SectionKey) => {
    const section = templateFields[sectionKey]
    if (!section || !section.fields?.length) return null

    return (
      <Collapsible 
        key={`${type}-${sectionKey}`}
        open={openSections[sectionKey]}
        onOpenChange={() => toggleSection(sectionKey)}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1 font-medium">
          <span>{section.title}</span>
          {openSections[sectionKey] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 mt-1">
          {section.fields.map((field) => (
            <Button
              key={`${type}-${field.path}`}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left h-8 px-2"
              onClick={() => onInsertField(field.template ? field.template : field.path, type)}
              title={field.description || ''}
            >
              {field.name}
            </Button>
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  if (loading) {
    return <div className="p-4 text-center">Chargement des champs...</div>
  }

  return (
    <div className={compact ? "w-64" : "w-full lg:w-64 bg-gray-50 p-4 rounded-lg border"}>
      <div className="space-y-2">
        {SECTION_ORDER.map(sectionKey => renderSection(sectionKey))}
      </div>
    </div>
  )
}