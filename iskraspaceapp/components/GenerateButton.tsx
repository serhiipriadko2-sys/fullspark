import React from 'react';
import Loader from './Loader';

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, isLoading, children, className = '', disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`button-primary flex items-center justify-center w-full !py-3 text-md transition-opacity ${className}`}
    >
      {isLoading ? <Loader /> : children}
    </button>
  );
};

export default GenerateButton;
