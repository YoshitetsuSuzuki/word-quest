interface Props {
  ratio: number // 0..1
  className?: string
  barClassName?: string
  height?: number
}

/** 汎用プログレスバー（XP・レイドゲージ等で使用） */
export function ProgressBar({ ratio, className = '', barClassName = 'bg-accent2', height = 10 }: Props) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-black/40 ${className}`}
      style={{ height }}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${barClassName}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
