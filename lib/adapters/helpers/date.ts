export function localizedPlainDateToUTC(date: Date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
}

export function localizedPlainDateToISOString(date: Date) {
  return localizedPlainDateToUTC(date).toISOString().split("T")[0];
}
