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
  Cpu
} from 'lucide-react';
import { IMenuItem } from './interfaces/MenuItem.interface';

const baseMenuItems = [
  {
    id: 1,
    code: 'dashboard',
    title: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    subMenu: []
  },
  {
    id: 2,
    code: 'contacts',
    title: 'Contacts',
    icon: <Users className="h-5 w-5" />,
    subMenu: [
      {
        code: 'firms',
        title: 'Firms',
        href: '/contacts/firms',
        icon: <Building className="h-5 w-5" />
      },
      {
        code: 'interlocutors',
        title: 'Interlocutors',
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
        title: 'Quotations',
        href: '/selling/quotations',
        icon: <File className="h-5 w-5" />
      },
      {
        code: 'invoices',
        title: 'Invoices',
        href: '/selling/invoices',
        icon: <FileText className="h-5 w-5" />
      },
      {
        code: 'payments',
        title: 'Payments',
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
        title: 'Quotations',
        href: '/buying/expense_quotations',
        icon: <File className="h-5 w-5" />
      },
      {
        code: 'invoices',
        title: 'Invoices',
        href: '/buying/expense_invoices',
        icon: <FileText className="h-5 w-5" />
      },
      {
        code: 'payments',
        title: 'Payments',
        href: '/buying/expense_payments',
        icon: <Wallet className="h-5 w-5" />
      },
      {
        code: 'articles',
        title: 'Articles',
        href: '/article/article-Lists',
        icon: <Wallet className="h-5 w-5" />
      },
    ]
  },
  {
    id: 6,
    code: 'administrative_tools',
    title: 'Administrative',
    icon: <Shield className="h-5 w-5" />,
    subMenu: [
      {
        code: 'user_management',
        title: 'Account',
        href: '/administrative-tools/user-management/users',
        icon: <Users className="h-5 w-5" />
      },
      {
        code: 'logger',
        title: 'Logger',
        href: '/administrative-tools/logger',
        icon: <Cpu className="h-5 w-5" />
      }
    ]
  },
  {
    id: 7,
    code: 'settings',
    title: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    subMenu: [
      {
        code: 'account',
        title: 'Account',
        href: '/settings/account/profile',
        icon: <UserCog className="h-5 w-5" />
      },
      {
        code: 'system',
        title: 'System',
        href: '/settings/system/activity',
        icon: <FileCog className="h-5 w-5" />
      },
      {
        code: 'pdf',
        title: 'PDF',
        href: '/settings/pdf/live',
        icon: <Printer className="h-5 w-5" />
      },
      {
        code: 'other',
        title: 'Other',
        href: '/settings/general',
        icon: <Wrench className="h-5 w-5" />
      }
    ]
  }
];

export const menuItems: IMenuItem[] = [...baseMenuItems];
