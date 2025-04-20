import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { useExpenseInvoiceManager } from '../hooks/useExpenseInvoiceManager';

interface ExpenseInvoiceGeneralConditionsProps {
  className?: string;
  hidden?: boolean;
  isPending?: boolean;
  defaultCondition?: string;
  edit?: boolean;
  isInspectMode?: boolean;
}

export const ExpenseInvoiceGeneralConditions = ({
  className,
  hidden,
  isPending,
  defaultCondition,
  edit = true,
  isInspectMode = false
}: ExpenseInvoiceGeneralConditionsProps) => {
  const router = useRouter();
  const { t: tInvoicing } = useTranslation('invoicing');
  const { t: tSettings } = useTranslation('settings');

  const invoiceManager = useExpenseInvoiceManager();

  return (
    <div className={cn(className)}>
      {!hidden && (
        <div className="flex flex-col gap-4">
          <Textarea
            disabled={!edit}
            placeholder={tInvoicing('invoice.attributes.general_condition')}
            className="resize-none"
            value={invoiceManager.generalConditions}
            onChange={(e) => invoiceManager.set('generalConditions', e.target.value)}
            isPending={isPending}
            rows={7}
          />
          {edit && defaultCondition && !isInspectMode && (
            <div className="flex items-center gap-4">
              <div className="flex gap-2 items-center">
                <Button
                  disabled={invoiceManager.generalConditions == defaultCondition}
                  onClick={() => {
                    invoiceManager.set('generalConditions', defaultCondition);
                  }}>
                  {tInvoicing('expense_invoice.use_default_condition')}
                </Button>
                <Button
                  variant={'secondary'}
                  onClick={() => {
                    invoiceManager.set('generalConditions', '');
                  }}>
                  Clear
                </Button>
              </div>
            </div>
          )}
          {edit && !defaultCondition && !isInspectMode && ( // Masquer le label en mode inspection
            <Label
              className="font-bold underline cursor-pointer"
              onClick={() => !isInspectMode && router.push('/settings/system/conditions')}>
              {tSettings('default_condition.not_set')}
            </Label>
          )}
        </div>
      )}
    </div>
  );
};
