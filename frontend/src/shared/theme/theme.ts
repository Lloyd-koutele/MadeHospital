/**
 * Accès aux couleurs du thème depuis les composants (styles en ligne).
 * Les valeurs réelles sont définies une seule fois dans theme.css : ces constantes ne font
 * que pointer vers les variables CSS, il n'y a donc rien à modifier ici pour changer de couleurs.
 */
export const theme = {
  brand: 'var(--color-brand)',
  accent: 'var(--color-accent)',
  primary: 'var(--color-primary)',
  primaryDark: 'var(--color-primary-dark)',
  primaryDarker: 'var(--color-primary-darker)',
  primarySoft: 'var(--color-primary-soft)',
  primaryLight: 'var(--color-primary-light)',
  onPrimary: 'var(--color-on-primary)',

  background: 'var(--color-background)',
  surface: 'var(--color-surface)',
  surfaceAlt: 'var(--color-surface-alt)',
  text: 'var(--color-text)',
  textMuted: 'var(--color-text-muted)',
  border: 'var(--color-border)',
  borderStrong: 'var(--color-border-strong)',

  examBg: 'var(--color-exam-bg)',
  examBorder: 'var(--color-exam-border)',
  examAccent: 'var(--color-exam-accent)',

  success: 'var(--color-success)',
  successDark: 'var(--color-success-dark)',
  successLight: 'var(--color-success-light)',
  danger: 'var(--color-danger)',
  dangerDark: 'var(--color-danger-dark)',
  dangerLight: 'var(--color-danger-light)',
  warning: 'var(--color-warning)',
  warningDark: 'var(--color-warning-dark)',
  warningLight: 'var(--color-warning-light)',

  shadowSm: 'var(--shadow-sm)',
  shadowMd: 'var(--shadow-md)',
  radius: 'var(--radius)',
} as const;

export type ThemeColor = keyof typeof theme;
