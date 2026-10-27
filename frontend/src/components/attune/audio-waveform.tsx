const BAR_COUNT = 48

const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
  const envelope = Math.sin((i / (BAR_COUNT - 1)) * Math.PI)
  return {
    height: 20 + envelope * 80,
    delay: ((i * 37) % 11) / 10,
    duration: 0.8 + ((i * 53) % 7) / 10,
  }
})

export function AudioWaveform({ active }: { active: boolean }) {
  return (
    <div
      className="flex h-10 items-center gap-[3px]"
      role="img"
      aria-label={active ? 'Live audio input active' : 'Audio input paused'}
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          className="w-full origin-center rounded-full bg-gradient-to-t from-cyan-500/60 to-cyan-300 animate-wave"
          style={{
            height: `${bar.height}%`,
            animationDelay: `${bar.delay}s`,
            animationDuration: `${bar.duration}s`,
            animationPlayState: active ? 'running' : 'paused',
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  )
}
