export function buildRepeatHref({
  year,
  subject,
  prompt,
}: {
  year?: string;
  subject?: string;
  prompt?: string;
}) {
  const params = new URLSearchParams();
  if (year) params.set("year", year);
  if (subject) params.set("subject", subject);
  if (prompt) params.set("prompt", prompt);
  const query = params.toString();
  return query ? `/repeat?${query}` : "/repeat";
}
