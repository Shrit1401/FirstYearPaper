export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-6 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <span>
          Made by <span className="font-medium text-foreground">shrit</span>
          <span className="text-muted-foreground">1401</span>
        </span>
        <span>
          First year question papers: shoutout to super382946, mymaster2006
        </span>
      </div>
    </footer>
  );
}
