/**
 * Combine plusieurs classes conditionnelles en une seule string
 * Utile pour écrire : cn("btn", isActive && "active")
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Met en majuscule la première lettre d'une string
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formate une date en format local court (fr-FR par défaut)
 */
export function formatDate(date: Date | string, locale = "fr-FR"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Tronque une string à une longueur maximale, en ajoutant "…" si nécessaire
 */
export function truncate(text: string, maxLength = 24): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}
