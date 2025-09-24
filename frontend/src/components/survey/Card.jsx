import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  header = null, 
  padding = 'p-6',
  shadow = 'shadow-sm',
  border = 'border border-gray-200',
  rounded = 'rounded-xl',
  background = 'bg-white'
}) => {
  return (
    <div className={`${background} ${rounded} ${shadow} ${border} ${className}`}>
      {header && (
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          {header}
        </div>
      )}
      <div className={padding}>
        {children}
      </div>
    </div>
  );
};

export default Card;
