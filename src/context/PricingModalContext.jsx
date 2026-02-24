import React, { createContext, useState, useContext } from 'react';

const PricingModalContext = createContext();

export const usePricingModal = () => {
    const context = useContext(PricingModalContext);
    if (!context) {
        throw new Error('usePricingModal must be used within PricingModalProvider');
    }
    return context;
};

export const PricingModalProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);

    const openPricingModal = () => setIsOpen(true);
    const closePricingModal = () => setIsOpen(false);

    return (
        <PricingModalContext.Provider value={{ isOpen, openPricingModal, closePricingModal }}>
            {children}
        </PricingModalContext.Provider>
    );
};

