/** Escrow Agent mark: a chat bubble with a keyhole (a locked conversation). */
export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Escrow Agent logo" style={{ flex: "none" }}>
      <rect width="64" height="64" rx="16" fill="var(--brand)" />
      <path
        fill="var(--brand-ink)"
        d="M22 14H42A10 10 0 0 1 52 24V34A10 10 0 0 1 42 44H31L20 53L22 44A10 10 0 0 1 12 34V24A10 10 0 0 1 22 14Z"
      />
      <circle cx="32" cy="26.6" r="4.3" fill="var(--brand)" />
      <path fill="var(--brand)" d="M29.9 29.2H34.1L35.7 36.4H28.3Z" />
    </svg>
  );
}
