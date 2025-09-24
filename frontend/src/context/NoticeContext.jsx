import React, { createContext, useContext, useState } from 'react';

const NoticeContext = createContext();

export const useNotice = () => {
  const context = useContext(NoticeContext);
  if (!context) {
    throw new Error('useNotice must be used within a NoticeProvider');
  }
  return context;
};

export const NoticeProvider = ({ children }) => {
  const [showNotice, setShowNotice] = useState(true);

  return (
    <NoticeContext.Provider value={{ showNotice, setShowNotice }}>
      {children}
    </NoticeContext.Provider>
  );
};

export default NoticeContext; 