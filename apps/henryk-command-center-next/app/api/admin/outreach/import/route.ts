import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../../lib/server/auth";
import { parseCsvRows } from "../../../../../lib/server/csv";
import { getCollection, writeAuditLog } from "../../../../../lib/server/database";

const maxFileSize = 2 * 1024 * 1024;
const maxRows = 1_000;

function cellValue(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String(value.text);
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value);
}

function rowsToLeads(rows: string[][], source: string) {
  const [rawHeaders = [], ...dataRows] = rows;
  const headers = rawHeaders.map((header) => header.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const records = [];
  const errors: string[] = [];
  for (const [index, values] of dataRows.slice(0, maxRows).entries()) {
    const row = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
    const companyName = String(row.company_name ?? row.company ?? row.name ?? "").trim();
    const email = String(row.email ?? "").trim().toLowerCase();
    if (!companyName || companyName.length > 160 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      errors.push(`Wiersz ${index + 2}: brak nazwy firmy lub nieprawidłowy e-mail.`);
      continue;
    }
    records.push({
      name: companyName,
      companyName,
      website: String(row.website ?? "").trim().slice(0, 2_000),
      email,
      phone: String(row.phone ?? "").trim().slice(0, 40),
      source,
      status: "NEW",
      notes: String(row.notes ?? "").trim().slice(0, 2_000),
      categories: String(row.categories ?? "").split(/[;,]/).map((value) => value.trim()).filter(Boolean).slice(0, 30),
      marketingConsent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  return { records, errors };
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.name) {
    const companyName = String(form.get("companyName") ?? "").trim();
    const rawWebsite = String(form.get("website") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const phone = String(form.get("phone") ?? "").trim();
    let website = "";
    if (rawWebsite) {
      try {
        const parsed = new URL(rawWebsite);
        if (parsed.protocol !== "https:" || !parsed.hostname.includes(".")) throw new Error("invalid");
        website = parsed.toString();
      } catch {
        return NextResponse.json({ error: "Strona WWW musi być prawidłowym adresem HTTPS." }, { status: 400 });
      }
    }
    if (
      !companyName || companyName.length > 160 ||
      (!email && !website) ||
      (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      email.length > 254 || phone.length > 40
    ) {
      return NextResponse.json({ error: "Podaj nazwę firmy oraz poprawny e-mail lub stronę HTTPS." }, { status: 400 });
    }
    const leads = await getCollection("leads");
    const match = await leads.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(website ? [{ website }] : []),
      ],
    }, { projection: { _id: 1 } });
    if (match) return NextResponse.json({ imported: 0, rejected: 1, duplicate: true });
    await leads.insertOne({
      name: companyName,
      companyName,
      website,
      email,
      phone,
      source: email ? "email_import" : "website_import",
      status: "NEW",
      notes: "",
      categories: [],
      marketingConsent: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await writeAuditLog({
      actorId: auth.user._id,
      action: "supplier.outreach.lead.create",
      entity: "leads",
    });
    return NextResponse.json({ imported: 1, rejected: 0 }, { status: 201 });
  }
  if (file.size < 1 || file.size > maxFileSize) {
    return NextResponse.json({ error: "Plik musi mieć maksymalnie 2 MB." }, { status: 413 });
  }

  let rows: string[][];
  let source: string;
  const extension = file.name.toLowerCase().split(".").pop();
  try {
    if (extension === "csv") {
      rows = parseCsvRows(await file.text());
      source = "csv_import";
    } else if (extension === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const buffer = Buffer.from(await file.arrayBuffer());
      await workbook.xlsx.read(Readable.from([buffer]));
      const sheet = workbook.worksheets[0];
      if (!sheet) return NextResponse.json({ error: "Plik nie zawiera arkusza." }, { status: 400 });
      rows = [];
      sheet.eachRow({ includeEmpty: false }, (row) => {
        const values: string[] = [];
        for (let column = 1; column <= row.cellCount; column += 1) {
          values.push(cellValue(row.getCell(column).value));
        }
        rows.push(values);
      });
      source = "xlsx_import";
    } else {
      return NextResponse.json({ error: "Obsługiwane formaty: CSV i XLSX." }, { status: 415 });
    }
  } catch (error) {
    console.error("Supplier lead import parsing failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Nie udało się odczytać pliku." }, { status: 400 });
  }
  if (rows.length < 2) return NextResponse.json({ error: "Plik nie zawiera rekordów." }, { status: 400 });
  if (rows.length - 1 > maxRows) {
    return NextResponse.json({ error: "Plik może zawierać maksymalnie 1000 rekordów." }, { status: 413 });
  }

  const { records, errors } = rowsToLeads(rows, source);
  if (!records.length) {
    return NextResponse.json({ error: "Nie znaleziono poprawnych rekordów.", rowErrors: errors.slice(0, 20) }, { status: 400 });
  }
  const leads = await getCollection("leads");
  const identifiers = new Set<string>();
  const candidateEmails = records.map((record) => record.email).filter(Boolean);
  const candidateWebsites = records.map((record) => record.website).filter(Boolean);
  const existing = await leads.find({
    $or: [
      ...(candidateEmails.length ? [{ email: { $in: candidateEmails } }] : []),
      ...(candidateWebsites.length ? [{ website: { $in: candidateWebsites } }] : []),
    ],
  }, { projection: { email: 1, website: 1 } }).toArray();
  for (const record of existing) {
    if (typeof record.email === "string") identifiers.add(`email:${record.email.toLowerCase()}`);
    if (typeof record.website === "string" && record.website) identifiers.add(`website:${record.website}`);
  }
  const toInsert = records.filter((record) => {
    const keys = [
      ...(record.email ? [`email:${record.email}`] : []),
      ...(record.website ? [`website:${record.website}`] : []),
    ];
    if (keys.some((key) => identifiers.has(key))) return false;
    keys.forEach((key) => identifiers.add(key));
    return true;
  });
  if (!toInsert.length) {
    return NextResponse.json({ imported: 0, rejected: records.length + errors.length, rowErrors: errors.slice(0, 20) });
  }
  const result = await leads.insertMany(toInsert);
  await writeAuditLog({
    actorId: auth.user._id,
    action: "supplier.outreach.leads.import",
    entity: "leads",
    entityId: source,
  });
  return NextResponse.json(
    { imported: result.insertedCount, rejected: errors.length + records.length - toInsert.length, rowErrors: errors.slice(0, 20) },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
