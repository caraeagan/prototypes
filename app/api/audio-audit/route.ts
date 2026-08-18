import crypto from "node:crypto";
import { NextResponse } from "next/server";

// Reads the "Audio content audit" Google Sheet with a read-only service
// account (GOOGLE_SHEETS_SA_KEY = the sheets-import-service key JSON).
// Returns the in-scope tests (Redo? = TRUE) with their column G status.
export const dynamic = "force-dynamic";

const SHEET_ID = "1PcsGqvVzf4ZbJimthnzPOKPCirLw2kTXIaj2lplgKkU";

export async function GET() {
  const raw = process.env.GOOGLE_SHEETS_SA_KEY;
  if (!raw) {
    return NextResponse.json({ error: "GOOGLE_SHEETS_SA_KEY is not set" }, { status: 500 });
  }
  try {
    const key = JSON.parse(raw) as { client_email: string; private_key: string; token_uri: string };

    // Service-account JWT flow with node:crypto — no Google SDK needed.
    const b64 = (b: Buffer) => b.toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const header = b64(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
    const claims = b64(Buffer.from(JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: key.token_uri,
      iat: now,
      exp: now + 3600,
    })));
    const input = `${header}.${claims}`;
    const jwt = `${input}.${b64(crypto.createSign("RSA-SHA256").update(input).sign(key.private_key))}`;

    const tokRes = await fetch(key.token_uri, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    });
    if (!tokRes.ok) throw new Error(`token exchange failed: ${tokRes.status}`);
    const { access_token } = (await tokRes.json()) as { access_token: string };

    const valRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A1:G100`,
      { headers: { Authorization: `Bearer ${access_token}` } },
    );
    if (!valRes.ok) throw new Error(`sheet read failed: ${valRes.status}`);
    const { values } = (await valRes.json()) as { values: string[][] };

    const hdrIdx = values.findIndex((r) => r[0] === "Test");
    if (hdrIdx < 0) throw new Error("header row not found");
    const hdr = values[hdrIdx];
    const redoI = hdr.indexOf("Redo?");
    const statusI = hdr.indexOf("Status");
    const tests = values
      .slice(hdrIdx + 1)
      .filter((r) => r[0] && r[redoI] === "TRUE")
      .map((r) => ({ name: r[0], status: r[statusI] || "Pending" }));

    return NextResponse.json({ tests });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "sheet fetch failed" },
      { status: 500 },
    );
  }
}
