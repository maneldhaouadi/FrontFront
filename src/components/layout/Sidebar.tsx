import React from 'react';
import Link from 'next/link';
import logoDark from 'src/assets/logo-light.png';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { IMenuItem } from '@/components/layout/interfaces/MenuItem.interface';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { Label } from '../ui/label';
import packageJson from 'package.json';

interface SidebarProps {
  menuItems: IMenuItem[];
}

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <div className="flex gap-3 px-2"> {/* Ajout de padding horizontal */}
      {['en', 'fr'].map((lang) => (
        <button
          key={lang}
          onClick={() => i18n.changeLanguage(lang)}
          className={`
            p-1 rounded-md text-white text-lg
            ${i18n.language === lang ? 'bg-slate-700' : 'hover:bg-slate-800/50'}
          `}
        >
          {lang === 'en' ? '🇬🇧' : '🇫🇷'}
        </button>
      ))}
    </div>
  );
};

export const Sidebar = ({ menuItems }: SidebarProps) => {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { theme } = useTheme();

  const activeItem = menuItems.find((item) => router.asPath.includes(item.code));

  return (
    <div className="hidden border-r bg-muted/40 md:block w-1/4 lg:w-1/5 xl:w-2/12 bg-slate-900 dark:bg-gray-950">
      <div className="flex h-full max-h-screen flex-col gap-4">
        {/* Header avec espacement égal */}
        <div className="flex h-20 items-center border-b border-slate-700 px-6 lg:h-[80px]"> {/* Padding horizontal augmenté */}
          <div className="w-full flex justify-center">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold cursor-pointer px-4"> {/* Padding horizontal ajouté */}
              <Image
                src={theme === 'light' ? logoDark : logoDark}
                alt="logo"
                className="w-40 cursor-pointer transition-transform hover:scale-105"
                priority
                height={40}
                width={160}
              />
            </Link>
          </div>
        </div>

        {/* Main Menu */}
        <div className="flex-1 overflow-y-auto">
          <nav className="grid items-start px-2 text-base lg:px-4 space-y-1">
            <Accordion type="single" collapsible defaultValue={activeItem?.id?.toString()}>
              {menuItems.map((item) => (
                <AccordionItem
                  key={item.code}
                  value={item.id?.toString() || ''}
                  className="border-0 mb-1"
                >
                  <AccordionTrigger
                    className={cn(
                      'gap-3 rounded-lg px-4 py-3 text-slate-200 hover:text-white transition-colors',
                      item.code.includes(router.pathname)
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'hover:bg-slate-800/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-left">{t(`menu.${item.code}`)}</span>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pb-0 pt-1">
                    {item.subMenu?.map((subItem: IMenuItem) => (
                      <Link
                        key={subItem.code}
                        href={subItem.href || '#'}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-4 py-3 ml-2 my-1 transition-all text-slate-300 hover:text-white',
                          subItem.href === router.asPath
                            ? 'bg-slate-800 text-white font-semibold'
                            : 'hover:bg-slate-800/50'
                        )}
                      >
                        <span className="text-lg">{subItem.icon}</span>
                        <span className="font-medium">{t(`submenu.${subItem.code}`)}</span>
                      </Link>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </nav>
        </div>

        {/* Footer */}
        <div className="mt-auto p-4 space-y-3 border-t border-slate-700">
          <div className="flex justify-start pl-2"> {/* Alignement à gauche avec padding */}
            <LanguageSwitcher />
          </div>
          <div className="text-start text-slate-400 text-sm pl-3"> {/* Alignement à gauche avec padding */}
            <Label>v{packageJson.version}</Label>
          </div>
        </div>
      </div>
    </div>
  );
};