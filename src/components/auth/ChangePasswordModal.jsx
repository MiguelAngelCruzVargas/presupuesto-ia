import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const { updatePassword } = useAuth();
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Validación de contraseña segura
    const validatePassword = (password) => {
        const validations = {
            length: password.length >= 12,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };

        const strength = Object.values(validations).filter(Boolean).length;
        const strengthLevel = strength <= 2 ? 'débil' : strength <= 4 ? 'media' : 'fuerte';

        return {
            valid: validations.length && validations.uppercase && validations.lowercase && validations.number,
            validations,
            strength,
            strengthLevel
        };
    };

    const passwordValidation = formData.newPassword ? validatePassword(formData.newPassword) : null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validaciones
        if (!formData.currentPassword) {
            setError('Ingresa tu contraseña actual');
            return;
        }

        if (!formData.newPassword) {
            setError('Ingresa una nueva contraseña');
            return;
        }

        if (!passwordValidation?.valid) {
            setError('La nueva contraseña no cumple con los requisitos de seguridad');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (formData.currentPassword === formData.newPassword) {
            setError('La nueva contraseña debe ser diferente a la actual');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await updatePassword(formData.newPassword);
            
            if (updateError) {
                // Si el error es de autenticación, puede ser que necesite reautenticarse
                if (updateError.message.includes('password') || updateError.message.includes('auth')) {
                    setError('Error al actualizar la contraseña. Asegúrate de que tu contraseña actual sea correcta.');
                } else {
                    setError(updateError.message || 'Error al actualizar la contraseña');
                }
                setLoading(false);
                return;
            }

            setSuccess(true);
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            
            // Cerrar modal después de 2 segundos
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 2000);
        } catch (err) {
            setError('Error inesperado al actualizar la contraseña');
            console.error('Error updating password:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setError('');
        setSuccess(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <h3 className="font-bold text-lg flex items-center">
                        <Lock className="mr-2" size={20} /> Cambiar Contraseña
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-white/60 hover:text-white hover:bg-white/10 p-1 rounded-full transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {success ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                            <CheckCircle className="text-emerald-600" size={20} />
                            <div>
                                <p className="font-bold text-emerald-800">Contraseña actualizada exitosamente</p>
                                <p className="text-sm text-emerald-600">El modal se cerrará automáticamente...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                                    <AlertCircle className="text-red-600" size={18} />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Contraseña Actual */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                    Contraseña Actual
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.current ? 'text' : 'password'}
                                        value={formData.currentPassword}
                                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                        className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Ingresa tu contraseña actual"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Nueva Contraseña */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                    Nueva Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.new ? 'text' : 'password'}
                                        value={formData.newPassword}
                                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                        className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Ingresa tu nueva contraseña"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {/* Indicador de Fortaleza */}
                                {formData.newPassword && passwordValidation && (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Fortaleza:</span>
                                            <span className={`font-bold ${
                                                passwordValidation.strengthLevel === 'fuerte' ? 'text-emerald-600' :
                                                passwordValidation.strengthLevel === 'media' ? 'text-amber-600' :
                                                'text-red-600'
                                            }`}>
                                                {passwordValidation.strengthLevel.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${
                                                    passwordValidation.strength <= 2 ? 'bg-red-500' :
                                                    passwordValidation.strength <= 4 ? 'bg-amber-500' :
                                                    'bg-emerald-500'
                                                }`}
                                                style={{ width: `${(passwordValidation.strength / 5) * 100}%` }}
                                            />
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            <div className={`flex items-center gap-2 ${passwordValidation.validations.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {passwordValidation.validations.length ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                <span>Mínimo 12 caracteres</span>
                                            </div>
                                            <div className={`flex items-center gap-2 ${passwordValidation.validations.uppercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {passwordValidation.validations.uppercase ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                <span>Al menos una mayúscula</span>
                                            </div>
                                            <div className={`flex items-center gap-2 ${passwordValidation.validations.lowercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {passwordValidation.validations.lowercase ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                <span>Al menos una minúscula</span>
                                            </div>
                                            <div className={`flex items-center gap-2 ${passwordValidation.validations.number ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {passwordValidation.validations.number ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                <span>Al menos un número</span>
                                            </div>
                                            <div className={`flex items-center gap-2 ${passwordValidation.validations.special ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {passwordValidation.validations.special ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                <span>Al menos un carácter especial (opcional)</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Confirmar Contraseña */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                                    Confirmar Nueva Contraseña
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.confirm ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                                            formData.confirmPassword && formData.newPassword !== formData.confirmPassword
                                                ? 'border-red-300 focus:border-red-500'
                                                : formData.confirmPassword && formData.newPassword === formData.confirmPassword
                                                ? 'border-emerald-300 focus:border-emerald-500'
                                                : 'border-slate-200 focus:border-blue-500'
                                        }`}
                                        placeholder="Confirma tu nueva contraseña"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                                    <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                                        <CheckCircle size={12} /> Las contraseñas coinciden
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !passwordValidation?.valid || formData.newPassword !== formData.confirmPassword}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold transition shadow-lg shadow-blue-900/20"
                                >
                                    {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;

