
/**
 * SecurityUtils
 * Universal Encryption/Decryption using Web Crypto API (Node.js 19+ / Modern Browsers)
 */

export class SecurityUtils {
    // Get the master key from env
    static getMasterKey() {
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_APP_SECRET_KEY) {
            return import.meta.env.VITE_APP_SECRET_KEY;
        }
        if (typeof process !== 'undefined' && process.env && process.env.VITE_APP_SECRET_KEY) {
            return process.env.VITE_APP_SECRET_KEY;
        }
        console.error('CRITICAL: VITE_APP_SECRET_KEY is missing. Encryption will fail.');
        return null;
    }

    /**
     * Encrypts a string value
     * @param {string} text - The plain text to encrypt
     * @returns {Promise<Object>} - The encrypted data { ciphertext, iv, salt } (all base64)
     */
    static async encrypt(text) {
        if (!text) return null;
        const password = this.getMasterKey();
        if (!password) throw new Error('Encryption key missing');

        const crypto = await this.getCryptoSubtle();
        const encoder = new TextEncoder();

        // 1. Generate random salt
        const salt = this.getRandomValues(new Uint8Array(16));

        // 2. Import password
        const keyMaterial = await crypto.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        // 3. Derive key
        const key = await crypto.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        // 4. Generate IV
        const iv = this.getRandomValues(new Uint8Array(12));

        // 5. Encrypt
        const encodedData = encoder.encode(text);
        const encryptedBuffer = await crypto.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encodedData
        );

        // 6. Return as Base64
        return {
            ciphertext: this.arrayBufferToBase64(encryptedBuffer),
            iv: this.arrayBufferToBase64(iv),
            salt: this.arrayBufferToBase64(salt),
            v: 1 // version
        };
    }

    /**
     * Decrypts an encrypted object
     * @param {Object} encryptedData - { ciphertext, iv, salt }
     * @returns {Promise<string>} - The decrypted text
     */
    static async decrypt(encryptedData) {
        if (!encryptedData || !encryptedData.ciphertext || !encryptedData.iv || !encryptedData.salt) {
            return null;
        }

        const password = this.getMasterKey();
        if (!password) throw new Error('Encryption key missing');

        const crypto = await this.getCryptoSubtle();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        // 1. Convert Base64 back to buffers
        const salt = this.base64ToArrayBuffer(encryptedData.salt);
        const iv = this.base64ToArrayBuffer(encryptedData.iv);
        const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);

        // 2. Import password
        const keyMaterial = await crypto.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        // 3. Derive key (must match encryption)
        const key = await crypto.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );

        // 4. Decrypt
        try {
            const decryptedBuffer = await crypto.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );
            return decoder.decode(decryptedBuffer);
        } catch (e) {
            console.error('Decryption failed. Wrong key or corrupted data.', e);
            return null;
        }
    }

    // --- Helpers ---

    static async getCryptoSubtle() {
        if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
            return globalThis.crypto.subtle;
        }
        // Node.js fallback for older versions (though Node 19+ has global crypto)
        try {
            // Dynamic import for Node environment
            const cryptoModule = await import('node:crypto');
            return cryptoModule.webcrypto.subtle;
        } catch (e) {
            throw new Error('Web Crypto API not supported in this environment');
        }
    }

    static getRandomValues(typedArray) {
        if (typeof globalThis !== 'undefined' && globalThis.crypto) {
            return globalThis.crypto.getRandomValues(typedArray);
        }
        // Very basic node fallback if global crypto missing but required logic runs there
        // Note: This shouldn't be reached in valid Node environments
        return typedArray;
    }

    static arrayBufferToBase64(buffer) {
        if (typeof window !== 'undefined') {
            // Browser
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        } else {
            // Node
            return Buffer.from(buffer).toString('base64');
        }
    }

    static base64ToArrayBuffer(base64) {
        if (typeof window !== 'undefined') {
            // Browser
            const binary_string = window.atob(base64);
            const len = binary_string.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary_string.charCodeAt(i);
            }
            return bytes.buffer;
        } else {
            // Node
            const buf = Buffer.from(base64, 'base64');
            return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
        }
    }
}
