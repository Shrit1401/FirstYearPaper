export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-8 text-center text-sm text-muted-foreground sm:gap-3">
        <span>
          Made by <span className="font-medium text-foreground">shrit</span>
        </span>
        <span>
          First year question papers: shoutout to super382946, mymaster2006
        </span>
        <span className="text-xs">
          This project is independent and is not affiliated with or endorsed by MAHE.
        </span>
      </div>
    </footer>
  );
}
