import { Button } from '@/components/ui/button';
import { EyeOff, Save } from 'lucide-react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';

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
  const [calculatorInput, setCalculatorInput] = useState('');
  const [calculatorResult, setCalculatorResult] = useState('');

  // Calculator logic
  const [display, setDisplay] = useState('0');
  const [firstOperand, setFirstOperand] = useState({"isSet":false,"num":0});
  const [operator, setOperator] = useState("");
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);

  const inputDigit = (digit: number) => {
    if (waitingForSecondOperand) {
      setDisplay(String(digit));
      setWaitingForSecondOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearCalculator = () => {
    setDisplay('0');
    setFirstOperand({"isSet":false,"num":0});
    setOperator("");
    setWaitingForSecondOperand(false);
  };

  const performOperation = (nextOperator: string ) => {
    const inputValue = parseFloat(display);

    if (!firstOperand.isSet) {
      setFirstOperand({"isSet":true,"num":inputValue});
    } else if (operator!="" && nextOperator==="=") {
      const result = calculate(firstOperand.num, inputValue, operator);
      setDisplay(String(result));
      setFirstOperand({"isSet":true,"num":result});
    }

    setWaitingForSecondOperand(true);
    setOperator(nextOperator);
  };

  const calculate = (firstOperand: number, secondOperand: number, operator: string) => {
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
        {/* Calculator UI - masqué en mode inspection */}
        {!isInspectMode  && (
          <div className="w-64 mx-auto mt-10 bg-gray-100 rounded-lg shadow-lg p-4">
            <div className="bg-white h-16 mb-4 flex items-center justify-end px-4 text-3xl font-bold rounded">
              {display}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button onClick={() => inputDigit(7)}>7</Button>
              <Button onClick={() => inputDigit(8)}>8</Button>
              <Button onClick={() => inputDigit(9)}>9</Button>
              <Button onClick={() => performOperation('/')}>/</Button>
              <Button onClick={() => inputDigit(4)}>4</Button>
              <Button onClick={() => inputDigit(5)}>5</Button>
              <Button onClick={() => inputDigit(6)}>6</Button>
              <Button onClick={() => performOperation('*')}>*</Button>
              <Button onClick={() => inputDigit(1)}>1</Button>
              <Button onClick={() => inputDigit(2)}>2</Button>
              <Button onClick={() => inputDigit(3)}>3</Button>
              <Button onClick={() => performOperation('-')}>-</Button>
              <Button onClick={() => inputDigit(0)}>0</Button>
              <Button onClick={inputDecimal}>.</Button>
              <Button onClick={() => performOperation('=')}>=</Button>
              <Button onClick={() => performOperation('+')}>+</Button>
              <Button onClick={clearCalculator} className="col-span-4">Clear</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};