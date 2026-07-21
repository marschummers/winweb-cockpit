// Generischer CSV-Parser mit korrekter Anführungszeichen-Behandlung (RFC4180-artig): anders
// als die einfache BWA-Datei (lib/importDatev.ts, dort reicht split(';')) enthält das
// Aktivitätenjournal in Anführungszeichen gesetzte Felder mit doppelten Anführungszeichen
// als Escape (""), teils auch mit eingebetteten Zeilenumbrüchen - ein naives split(';')
// würde solche Felder mitten im Text zerreißen.
export function parseCsv(text: string, delimiter = ';'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  // Führendes BOM (kommt bei manchen Windows-Exporten vor) überspringen.
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Letzte Zeile hat keinen abschließenden Zeilenumbruch.
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

// Wandelt Zeilen in Objekte um, geschlüsselt nach der (getrimmten) Kopfzeile - die Export-
// Header haben oft ein Leerzeichen am Ende ("Kunden-Nr. "), das hier entfernt wird, damit man
// im Code mit sauberen Schlüsselnamen arbeiten kann.
export function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = (row[index] ?? '').trim();
    });
    return obj;
  });
}

// Gleiche Kodierungs-Heuristik wie beim BWA-Import: erst UTF-8 versuchen, bei Anzeichen von
// Fehlkodierung (Replacement-Zeichen oder fehlender erwarteter Header) auf Windows-1252
// zurückfallen.
export async function decodeCsvFileGeneric(file: File, expectedHeaderToken: string): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!utf8.includes('�') && utf8.includes(expectedHeaderToken)) return utf8;
  return new TextDecoder('windows-1252').decode(buffer);
}
