import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/common/Spinner';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const ExtractFromImageModal = ({ 
  imageFile, 
  onExtractedData, 
  onClose, 
  open 
}: {
  imageFile: File;
  onExtractedData: (data: any) => void;
  onClose: () => void;
  open: boolean;
}) => {
  const { t } = useTranslation('article');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [displayedMessages, setDisplayedMessages] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imageFile) return;

    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages]);

  const addMessage = (message: string) => {
    setDisplayedMessages(prev => [...prev, message]);
  };

  const typeMessage = async (message: string, speed = 10) => {
    for (let i = 0; i < message.length; i++) {
      addMessage(message.substring(0, i+1));
      await new Promise(resolve => setTimeout(resolve, speed));
    }
    addMessage(''); // Ajoute un espace entre les messages
  };

  const extractData = async () => {
    try {
      setIsProcessing(true);
      setDisplayedMessages([]);
      setExtractedData(null);
      
      await typeMessage(t('article.extraction.starting'));
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await typeMessage(t('article.extraction.analyzing_image'));
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await typeMessage(t('article.extraction.detecting_text'));
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulation d'extraction (remplacer par l'appel API réel)
      const mockData = {
        title: "Article de test",
        description: "Description extraite de l'image",
        category: "Électronique",
        subCategory: "Téléphones",
        purchasePrice: 299.99,
        salePrice: 399.99,
        quantityInStock: 50,
        status: "active"
      };
      
      setExtractedData(mockData);
      
      await typeMessage(t('article.extraction.results'));
      await typeMessage(`${t('article.attributes.title')}: ${mockData.title || '-'}`);
      await typeMessage(`${t('article.attributes.description')}: ${mockData.description || '-'}`);
      await typeMessage(`${t('article.attributes.category')}: ${mockData.category || '-'}`);
      await typeMessage(`${t('article.attributes.sub_category')}: ${mockData.subCategory || '-'}`);
      await typeMessage(`${t('article.attributes.purchase_price')}: ${mockData.purchasePrice || '-'}`);
      await typeMessage(`${t('article.attributes.sale_price')}: ${mockData.salePrice || '-'}`);
      await typeMessage(`${t('article.attributes.quantity_in_stock')}: ${mockData.quantityInStock || '-'}`);
      await typeMessage(`${t('article.attributes.status')}: ${mockData.status || '-'}`);
      
      await typeMessage(t('article.extraction.complete'));
      
    } catch (error) {
      console.error('Error:', error);
      await typeMessage(t('article.extraction.error'));
      toast.error(t('article.data_extraction_failed'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex p-0 overflow-hidden">
        <div className="w-1/2 p-6 flex flex-col border-r">
          <DialogHeader>
            <DialogTitle>{t('article.extraction.image_preview')}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg">
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="Image uploadée" 
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <Spinner size="medium" />
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              onClick={extractData}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Spinner size="small" className="mr-2" />
                  {t('article.extraction.processing')}
                </>
              ) : t('article.extraction.extract_button')}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {t('common.commands.cancel')}
            </Button>
          </div>
        </div>

        <div className="w-1/2 p-6 flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('article.extraction.extracted_data')}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-4">
            {displayedMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                {t('article.extraction.no_data')}
              </div>
            ) : (
              <div className="space-y-2">
                {displayedMessages.map((msg, index) => (
                  msg ? (
                    <div key={index} className="flex">
                      <div className="bg-muted rounded-lg px-4 py-2">
                        {msg}
                      </div>
                    </div>
                  ) : <div key={index} className="h-2"></div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {extractedData && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={onClose}>
                {t('common.commands.cancel')}
              </Button>
              <Button onClick={() => onExtractedData(extractedData)}>
                {t('article.use_extracted_data')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExtractFromImageModal;