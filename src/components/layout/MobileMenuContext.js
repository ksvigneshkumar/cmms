'use client';

/**
 * Mobile Menu Context Provider
 * 
 * This React Context manages the global state (isOpen) of the responsive mobile Sidebar drawer.
 * It allows the TopNav hamburger button to trigger the Sidebar visibility across the app.
 */
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
