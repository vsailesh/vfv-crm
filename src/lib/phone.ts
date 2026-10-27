// Phone normalization shared by dedupe checks — "+91 98765 43210" and "9876543210" match.
export const normPhone = (p: string): string => p.replace(/\D/g, "").slice(-10);
