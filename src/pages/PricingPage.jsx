import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../context/SubscriptionContext';
import { usePricingModal } from '../context/PricingModalContext';
import PricingModal from '../components/subscription/PricingModal';

const PricingPage = () => {
    const navigate = useNavigate();
    const { openPricingModal, closePricingModal, isOpen } = usePricingModal();

    // Abrir el modal automáticamente cuando se accede a esta página
    useEffect(() => {
        openPricingModal();
    }, [openPricingModal]);

    const handleClose = () => {
        closePricingModal();
        // Si se cierra el modal y estamos en la ruta /pricing, volver atrás
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <PricingModal isOpen={isOpen} onClose={handleClose} />
        </div>
    );
};

export default PricingPage;

