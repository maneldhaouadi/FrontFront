import React from 'react';
import {
  Settings,
  Home,
  Package,
  ShoppingCart,
  Users,
  UserCog,
  Wrench,
  FileCog,
  Building,
  File,
  FileText,
  Magnet,
  BookUser,
  Printer,
  Wallet,
  Shield,
  Cpu,
  Newspaper,
  BarChart2,
  List,
  Archive
} from 'lucide-react';
import { IMenuItem } from './interfaces/MenuItem.interface';

const baseMenuItems = [
  {
    id: 1,
    code: 'dashboard',
    title: 'Tableau de bord',
    icon: <Home className="h-5 w-5" />,
    subMenu: [
      {
        code: 'articles_stats',
        title: 'Statistiques Articles',
        href: '/dashboard/articleDashboard',
        icon: <BarChart2 className="h-5 w-5" />
      }
    ]
  },
  {
    id: 2,
    code: 'contacts',
    title: 'Contacts',
    icon: <Users className="h-5 w-5" />,
    subMenu: [
      {
        code: 'firms',
        title: 'Entreprises',
        href: '/contacts/firms',
        icon: <Building className="h-5 w-5" />
      },
      {
        code: 'interlocutors',
        title: 'Interlocuteurs',
        href: '/contacts/interlocutors',
        icon: <BookUser className="h-5 w-5" />
      }
    ]
  },
  {
    id: 3,
    code: 'selling',
    title: 'Vente',
    icon: <Package className="h-5 w-5" />,
    subMenu: [
      {
        code: 'quotations',
        title: 'Devis',
        href: '/selling/quotations',
        icon: <File className="h-5 w-5" />
      },
      {
        code: 'invoices',
        title: 'Factures',
        href: '/selling/invoices',
        icon: <FileText className="h-5 w-5" />
      },
      {
        code: 'payments',
        title: 'Paiements',
        href: '/selling/payments',
        icon: <Wallet className="h-5 w-5" />
      }
    ]
  },
  {
    id: 4,
    code: 'buying',
    title: 'Achat',
    icon: <ShoppingCart className="h-5 w-5" />,
    subMenu: [
      {
        code: 'quotations',
        title: 'Devis fournisseurs',
        href: '/buying/expense_quotations',
        icon: <File className="h-5 w-5" />
      },
      {
        code: 'invoices',
        title: 'Factures fournisseurs',
        href: '/buying/expense_invoices',
        icon: <FileText className="h-5 w-5" />
      },
      {
        code: 'payments',
        title: 'Paiements fournisseurs',
        href: '/buying/expense_payments',
        icon: <Wallet className="h-5 w-5" />
      },
      // Section Articles avec codes simplifiés
      {
        code: 'articles', // Code simplifié
        title: 'Articles',
        href: '/article/article-Lists',
        icon: <Newspaper className="h-5 w-5" />
      },
      {
        code: 'archives', // Code simplifié (au lieu de articles_archives)
        title: 'Archives',
        href: '/article/article-archives',
        icon: <Archive className="h-5 w-5" />
      }
    ]
  },
  {
    id: 6,
    code: 'administrative_tools',
    title: 'Administration',
    icon: <Shield className="h-5 w-5" />,
    subMenu: [
      {
        code: 'user_management',
        title: 'Gestion Utilisateurs',
        href: '/administrative-tools/user-management/users',
        icon: <Users className="h-5 w-5" />
      },
      {
        code: 'logger',
        title: 'Journal d\'activité',
        href: '/administrative-tools/logger',
        icon: <Cpu className="h-5 w-5" />
      }
    ]
  },
  {
    id: 7,
    code: 'settings',
    title: 'Paramètres',
    icon: <Settings className="h-5 w-5" />,
    subMenu: [
      {
        code: 'account',
        title: 'Mon Compte',
        href: '/settings/account/profile',
        icon: <UserCog className="h-5 w-5" />
      },
      {
        code: 'system',
        title: 'Système',
        href: '/settings/system/activity',
        icon: <FileCog className="h-5 w-5" />
      },
      {
        code: 'pdf',
        title: 'Gestion PDF',
        href: '/settings/pdf/live',
        icon: <Printer className="h-5 w-5" />
      },
      {
        code: 'other',
        title: 'Autres Paramètres',
        href: '/settings/general',
        icon: <Wrench className="h-5 w-5" />
      }
    ]
  }
];

export const menuItems: IMenuItem[] = [...baseMenuItems];