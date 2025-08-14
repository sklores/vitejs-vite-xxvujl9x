// src/lib/sheets.ts
// Minimal Google Sheets reader (no auth flow; uses your API key + public sheet)

export async function getSheetValues(opts: {
  spreadsheetId: string;
  apiKey: string;
  range: string;           // e.g. "Sheet1!A1" or "Mapping!B2"
}): Promise<string[][]> {
  const { spreadsheetId, apiKey, range } = opts;
  const base = "https://sheets.googleapis.com/v4/spreadsheets";
  const url = `${base}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || "Sheets request failed";
    throw new Error(msg);
  }

  return (data.values as string[][]) ?? [[]];
}

/** Convenience: returns the first cell as a string (or empty string). */
export async function getFirstCell(opts: {
  spreadsheetId: string;
  apiKey: string;
  range: string;
}): Promise<string> {
  const rows = await getSheetValues(opts);
  return rows?.[0]?.[0] ?? "";
}