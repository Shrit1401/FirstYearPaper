export function formatSupabaseError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = Reflect.get(error, "message");
    const maybeCode = Reflect.get(error, "code");
    const maybeDetails = Reflect.get(error, "details");

    return [maybeCode, maybeMessage, maybeDetails]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join(" | ") || JSON.stringify(error);
  }

  return String(error);
}

export function isMissingUsersTableError(error: unknown) {
  const message = formatSupabaseError(error).toLowerCase();
  return (
    message.includes('relation "public.users" does not exist') ||
    message.includes('relation "users" does not exist') ||
    message.includes("could not find the table") ||
    message.includes("42p01")
  );
}
