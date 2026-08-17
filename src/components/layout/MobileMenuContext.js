'use client';

import React, { createContext, useContext, useState } from 'react';

const MobileMenuContext = createContext({
  isOpen: false,
  setIsOpen: () => {},
});

export function MobileMenuProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MobileMenuContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu() {
  const context = useContext(MobileMenuContext);
  if (!context) {
    throw new Error('useMobileMenu must be used within a MobileMenuProvider');
  }
  return context;
}
