export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid place-items-center py-24 text-center">
      <div className="w-10 h-10 rounded-full border-4 border-white/15 border-t-accent2 animate-spin" />
      <div className="mt-4 text-sm text-white/50">{label}</div>
    </div>
  )
}
