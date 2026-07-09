export function Crosshair() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="relative h-5 w-5 opacity-80 mix-blend-difference">
        <div className="absolute left-1/2 top-0 h-5 w-[2px] -translate-x-1/2 bg-white" />
        <div className="absolute top-1/2 left-0 h-[2px] w-5 -translate-y-1/2 bg-white" />
      </div>
    </div>
  )
}
