export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden className="grid size-7 grid-cols-2 gap-0.5 rounded-lg bg-ink p-1.5">
        <span className="rounded-[2px] bg-surface" />
        <span className="rounded-[2px] bg-surface/50" />
        <span className="rounded-[2px] bg-surface/50" />
        <span className="rounded-[2px] bg-accent" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        Cellix <span className="font-normal text-ink-3">Admin</span>
      </span>
    </span>
  );
}
