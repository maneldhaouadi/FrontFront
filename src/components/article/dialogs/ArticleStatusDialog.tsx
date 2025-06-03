import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

interface ArticleStatusDialogProps {
  id: number;
  currentStatus: string;
  open: boolean;
  updateStatus: (newStatus: string) => void;
  onClose: () => void;
}

export const ArticleStatusDialog: React.FC<ArticleStatusDialogProps> = ({
  id,
  currentStatus,
  open,
  updateStatus,
  onClose,
}) => {
  const { t } = useTranslation('article');
  const [newStatus, setNewStatus] = React.useState(currentStatus);

  const statusOptions = [
    { value: 'draft', label: t('status.draft') },
    { value: 'active', label: t('status.active') },
    { value: 'inactive', label: t('status.inactive') },
    { value: 'out_of_stock', label: t('status.out_of_stock') },
    { value: 'archived', label: t('status.archived') },
  ];

  const availableOptions = statusOptions.filter(option => {
    if (currentStatus === 'draft') {
      return ['active', 'inactive', 'archived'].includes(option.value);
    }
    if (currentStatus === 'active') {
      return ['inactive', 'out_of_stock', 'archived'].includes(option.value);
    }
    if (currentStatus === 'inactive') {
      return ['active', 'out_of_stock', 'archived'].includes(option.value);
    }
    if (currentStatus === 'out_of_stock') {
      return ['active', 'inactive', 'archived'].includes(option.value);
    }
    return false;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('change_status.title')}</DialogTitle>
          <DialogDescription>
            {t('change_status.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>{t('change_status.current_status')}</Label>
            <div className="mt-1 p-2 bg-gray-100 rounded-md">
              {statusOptions.find(opt => opt.value === currentStatus)?.label || currentStatus}
            </div>
          </div>
          
          <div>
            <Label htmlFor="newStatus">{t('change_status.new_status')}</Label>
            <Select
              value={newStatus}
              onValueChange={setNewStatus}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={t('change_status.select_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
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
          <Button onClick={() => updateStatus(newStatus)}>
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};