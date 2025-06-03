import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ArticleRestoreDialogProps {
  id: number;
  versions: {version: number, date?: Date}[];
  open: boolean;
  restoreVersion: (version: number) => void;
  onClose: () => void;
}

export const ArticleRestoreDialog: React.FC<ArticleRestoreDialogProps> = ({
  id,
  versions,
  open,
  restoreVersion,
  onClose,
}) => {
  const { t } = useTranslation('article');
  const [selectedVersion, setSelectedVersion] = React.useState(versions.length > 0 ? versions[0].version : 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('restore_version.title')}</DialogTitle>
          <DialogDescription>
            {t('restore_version.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="version">{t('restore_version.select_version')}</Label>
            <Select
              value={selectedVersion.toString()}
              onValueChange={(value) => setSelectedVersion(Number(value))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('restore_version.select_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {versions.map(version => (
                  <SelectItem 
                    key={version.version} 
                    value={version.version.toString()}
                  >
                    {t('restore_version.version')} {version.version} - {version.date ? format(new Date(version.date), 'PPPp', { locale: fr }) : t('restore_version.unknown_date')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => restoreVersion(selectedVersion)}>
            {t('restore_version.restore_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};