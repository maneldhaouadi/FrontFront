import { Button } from '@/components/ui/button';
import { EyeOff, Save, Delete } from 'lucide-react'; // Ajout de l'icône Delete
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';

interface ExpensePaymentControlSectionProps {
  className?: string;
  isDataAltered?: boolean;
  handleSubmit?: () => void;
  reset: () => void;
  loading?: boolean;
  isCreateMode?: boolean;
  isInspectMode?: boolean;
}

export const ExpensePaymentControlSection = ({
  className,
  isDataAltered,
  handleSubmit,
  reset,
  loading,
  isCreateMode = false,
  isInspectMode = false,
}: ExpensePaymentControlSectionProps) => {
  const router = useRouter();
  const { t: tCommon } = useTranslation('common');
  
  // Calculator state
  const [display, setDisplay] = useState('0');
  const [displayFontSize, setDisplayFontSize] = useState('text-4xl');
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);
const [calculatorHasFocus, setCalculatorHasFocus] = useState(false);
  // Add keyboard event listener
  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ne traiter les touches que si la calculatrice a le focus
    if (!calculatorHasFocus) return;
    
    // Prevent default behavior for calculator keys
    if (/[0-9\.+\-*/=]|Enter|Backspace|Escape/.test(e.key)) {
      e.preventDefault();
    }

    switch (e.key) {
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        inputDigit(parseInt(e.key));
        break;
      case '.':
        inputDecimal();
        break;
      case '+':
      case '-':
      case '*':
      case '/':
        handleOperator(e.key);
        break;
      case '=':
      case 'Enter':
        handleEquals();
        break;
      case 'Backspace':
        handleBackspace();
        break;
      case 'Escape':
        clearCalculator();
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [display, firstOperand, operator, waitingForSecondOperand, calculatorHasFocus]);
  // Fonction pour supprimer un seul chiffre
  const handleBackspace = () => {
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  // Adjust font size based on display length
  useEffect(() => {
    if (display.length > 12) {
      setDisplayFontSize('text-xl');
    } else if (display.length > 8) {
      setDisplayFontSize('text-2xl');
    } else {
      setDisplayFontSize('text-4xl');
    }
  }, [display]);

  const handleCalculatorFocus = () => {
  setCalculatorHasFocus(true);
};

const handleCalculatorBlur = () => {
  setCalculatorHasFocus(false);
};

  // Enhanced input handling with max length
  const inputDigit = (digit: number) => {
    if (display.length >= 15) return; // Prevent overflow
    
    if (waitingForSecondOperand) {
      setDisplay(String(digit));
      setWaitingForSecondOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDecimal = () => {
    if (display.length >= 15) return; // Prevent overflow
    
    if (waitingForSecondOperand) {
      setDisplay('0.');
      setWaitingForSecondOperand(false);
      return;
    }

    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearCalculator = () => {
    setDisplay('0');
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(false);
    setDisplayFontSize('text-4xl');
  };

  const handleOperator = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (firstOperand === null) {
      setFirstOperand(inputValue);
    } else if (operator) {
      const result = calculate(firstOperand, inputValue, operator);
      setDisplay(String(result));
      setFirstOperand(result);
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (firstOperand: number, secondOperand: number, operator: string): number => {
    switch (operator) {
      case '+':
        return firstOperand + secondOperand;
      case '-':
        return firstOperand - secondOperand;
      case '*':
        return firstOperand * secondOperand;
      case '/':
        return firstOperand / secondOperand;
      default:
        return secondOperand;
    }
  };

  const handleEquals = () => {
    if (firstOperand === null || operator === null) return;

    const inputValue = parseFloat(display);
    const result = calculate(firstOperand, inputValue, operator);
    
    // Format result to avoid long decimals
    const formattedResult = String(result).length > 15 
      ? result.toExponential(6) 
      : String(result);
    
    setDisplay(formattedResult);
    setFirstOperand(null);
    setOperator(null);
    setWaitingForSecondOperand(true);
  };

  return (
    <div className={className}>
      <div className="flex flex-col w-full gap-2">
        {isInspectMode ? (
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => router.back()}
          >
            <EyeOff className="h-5 w-5" />
            <span>{tCommon('inspect_mode')}</span>
          </Button>
        ) : (
          <>
            <Button 
              className="flex items-center gap-2" 
              onClick={handleSubmit}
              disabled={loading}
            >
              <Save className="h-5 w-5" />
              <span>{tCommon('commands.save')}</span>
            </Button>
            {!isCreateMode && (
              <Button 
                className="flex items-center gap-2" 
                variant={'outline'} 
                onClick={reset}
                disabled={loading}
              >
                <Save className="h-5 w-5" />
                <span>{tCommon('commands.initialize')}</span>
              </Button>
            )}
          </>
        )}
        
        {/* Enhanced Calculator UI */}
        {!isInspectMode && (
<div 
  className="w-80 mx-auto mt-10 bg-white rounded-xl shadow-lg p-6 border border-gray-200"
  tabIndex={0} // Permet à l'élément de recevoir le focus
  onFocus={handleCalculatorFocus}
  onBlur={handleCalculatorBlur}
>            <div className={`bg-gray-50 h-20 mb-6 flex items-center justify-end px-6 ${displayFontSize} font-bold rounded-lg border border-gray-300 overflow-hidden`}>
              <div className="truncate w-full text-right">{display}</div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {/* Boutons numériques */}
              <Button 
                variant="outline"
                onClick={() => inputDigit(7)} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                7
              </Button>
              <Button 
                variant="outline"
                onClick={() => inputDigit(8)} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                8
              </Button>
              <Button 
                variant="outline"
                onClick={() => inputDigit(9)} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                9
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleOperator('/')} 
                className="h-14 text-xl bg-gray-100 hover:bg-gray-200 border-gray-300 font-medium"
              >
                ÷
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => inputDigit(4)} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                4
              </Button>
              <Button 
                variant="outline"
                onClick={() => inputDigit(5)} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                5
              </Button>
              <Button 
                variant="outline"
                onClick={() => inputDigit(6)} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                6
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleOperator('*')} 
                className="h-14 text-xl bg-gray-100 hover:bg-gray-200 border-gray-300 font-medium"
              >
                ×
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => inputDigit(1)} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                1
              </Button>
              <Button 
                variant="outline"
                onClick={() => inputDigit(2)} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                2
              </Button>
              <Button 
                variant="outline"
                onClick={() => inputDigit(3)} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                3
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleOperator('-')} 
                className="h-14 text-xl bg-gray-100 hover:bg-gray-200 border-gray-300 font-medium"
              >
                -
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => inputDigit(0)} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                0
              </Button>
              <Button 
                variant="outline"
                onClick={inputDecimal} 
                className="h-14 text-xl bg-white hover:bg-gray-50 border-gray-300"
              >
                .
              </Button>
              <Button 
                variant="outline"
                onClick={handleBackspace} // Bouton backspace
                className="h-14 text-xl bg-gray-100 hover:bg-gray-200 border-gray-300"
              >
                <Delete className="h-5 w-5" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => handleOperator('+')} 
                className="h-14 text-xl bg-gray-100 hover:bg-gray-200 border-gray-300 font-medium"
              >
                +
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleEquals} 
                className="h-14 text-xl bg-gray-800 hover:bg-gray-900 text-white font-medium"
              >
                =
              </Button>
              <Button 
                variant="outline"
                onClick={clearCalculator} 
                className="col-span-3 h-14 text-lg bg-gray-100 hover:bg-gray-200 border-gray-300 font-medium"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};