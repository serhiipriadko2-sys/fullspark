/**
 * SECURITY SERVICE - Guardrails for User Safety and Privacy
 *
 * Implements PII sanitization and Prompt Injection detection
 * to protect both the user (Data Sovereignty) and the system (Integrity).
 */

const PII_PATTERNS = [
    // Email
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    // Phone (Simple Russian/International format)
    /(?:\+7|8)[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g,
    // Credit Card (Basic Luhn-like pattern 16 digits)
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    // IP Address
    /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
];

const INJECTION_PATTERNS = [
    /ignore previous instructions/i,
    /забудь всё что было/i,
    /новые правила/i,
    /ты теперь/i,
    /системный промпт/i,
    /system prompt/i
];

const DANGEROUS_TOPICS = [
    'взлом', 'вред', 'самоповреждение', 'суицид', 'наркотики', 'терроризм', 'бомба'
];

export interface SecurityCheckResult {
    safe: boolean;
    sanitizedText: string;
    reason?: string;
    action?: 'PROCEED' | 'REJECT' | 'REDIRECT';
}

class SecurityService {
    /**
     * Masks PII in the input text.
     */
    public sanitizeInput(text: string): string {
        let sanitized = text;
        for (const pattern of PII_PATTERNS) {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        }
        return sanitized;
    }

    /**
     * Checks for prompt injection attempts.
     */
    public checkInjection(text: string): boolean {
        return INJECTION_PATTERNS.some(pattern => pattern.test(text));
    }

    /**
     * Checks for dangerous topics.
     */
    public checkDanger(text: string): string | null {
        const lower = text.toLowerCase();
        const found = DANGEROUS_TOPICS.find(topic => lower.includes(topic));
        return found || null;
    }

    /**
     * Comprehensive security check.
     */
    public validate(text: string): SecurityCheckResult {
        // 1. Injection Check
        if (this.checkInjection(text)) {
            return {
                safe: false,
                sanitizedText: text,
                reason: 'Prompt Injection Detected',
                action: 'REJECT'
            };
        }

        // 2. Danger Check
        const danger = this.checkDanger(text);
        if (danger) {
            return {
                safe: false, // Flag as unsafe context, but usually we allow with redirect
                sanitizedText: text,
                reason: `Dangerous Topic: ${danger}`,
                action: 'REDIRECT'
            };
        }

        // 3. PII Sanitization
        const sanitized = this.sanitizeInput(text);

        return {
            safe: true,
            sanitizedText: sanitized,
            action: 'PROCEED'
        };
    }
}

export const securityService = new SecurityService();
