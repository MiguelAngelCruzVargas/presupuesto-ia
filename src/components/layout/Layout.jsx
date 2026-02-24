import React from 'react';
import Sidebar from './Sidebar';
import Toast from '../ui/Toast';
import { useProject } from '../../context/ProjectContext';
import { useSidebar } from '../../context/SidebarContext';
import UsageNotification from '../subscription/UsageNotification';
import PricingModal from '../subscription/PricingModal';
import { usePricingModal } from '../../context/PricingModalContext';
import SupportChat from '../support/SupportChat';
import RateLimitModal from '../ui/RateLimitModal';
import { Menu } from 'lucide-react';

const Layout = ({ children, title }) => {
    const { toast, setToast, rateLimitModal, closeRateLimitModal } = useProject();
    const { isOpen, closePricingModal } = usePricingModal();
    const { isCollapsed } = useSidebar();
    const [isMobile, setIsMobile] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setIsMobileMenuOpen(false); // Close mobile menu when switching to desktop
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Calcular el ancho del sidebar según el estado
    // En mobile es 0px porque es overlay, en desktop depende del estado
    const sidebarWidth = isMobile ? '0px' : (isCollapsed ? '80px' : '256px'); // w-20 = 80px, w-64 = 256px

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors">
            {/* Mobile Overlay */}
            {isMobile && isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <Sidebar mobileOpen={isMobileMenuOpen} setMobileOpen={setIsMobileMenuOpen} />

            <main className="flex-1 p-4 md:p-8 overflow-y-auto scrollbar-hide print:ml-0 print:p-0 transition-all duration-300" style={{ marginLeft: `${sidebarWidth}` }}>
                <div className="flex justify-between items-center mb-8 print:hidden">
                    <div className="flex items-center gap-3">
                        {/* Hamburger Button for Mobile */}
                        <button
                            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            <Menu size={24} />
                        </button>

                        <h2 className="text-xl font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hidden md:block">
                            {title}
                        </h2>
                        {/* Show title on mobile too if hidden above, but user only asked for hamburger. Keeping original title logic partially but allowing it to show if needed. Original Code had it hidden on mobile: `hidden md:block`. I will keep it that way for now unless user wants title on mobile. */}
                        <h2 className="text-lg font-bold text-slate-600 dark:text-slate-300 md:hidden block">
                            {title}
                        </h2>
                    </div>

                    <div className="flex gap-4 ml-auto">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">v2.4.0 Pro</span>
                        </div>
                    </div>
                </div>

                {children}

                {toast && <Toast message={toast.message} type={toast.type} error={toast.error || null} onClose={() => setToast(null)} />}
            </main>

            <UsageNotification />

            <UsageNotification />

            <PricingModal isOpen={isOpen} onClose={closePricingModal} />

            <RateLimitModal
                isOpen={rateLimitModal.isOpen}
                onClose={closeRateLimitModal}
                message={rateLimitModal.message}
                retryAfter={rateLimitModal.retryAfter}
            />

            {/* AI Support Chat Widget */}
            <SupportChat />

            <style>{`
        @media print {
          aside, button, input, select, .no-print { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; width: 100% !important; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .shadow-sm, .shadow-md, .shadow-lg, .shadow-2xl { box-shadow: none !important; }
          table th { background-color: #f1f5f9 !important; color: #000 !important; }
        }
      `}</style>
        </div>
    );
};

export default Layout;
