import fs from "node:fs/promises";
import path from "node:path";

const folder = process.env.KAFE_PREVIEW_OUTPUT;
if (!folder) throw new Error("Set KAFE_PREVIEW_OUTPUT to the generated preview folder.");
const previews = JSON.parse(await fs.readFile(path.join(folder, "index.json"), "utf8"));
if (previews.length !== 19 || new Set(previews.map((p) => p.key)).size !== 19)
  throw new Error("Expected exactly 19 distinct preview templates.");
const send = process.argv.includes("--send");
const recipient = "gwada.web.studio@gmail.com";
if (send && (!process.env.RESEND_API_KEY || !process.env.KAFE_EMAIL_FROM))
  throw new Error("Missing server-side Resend configuration.");
const results = [];
for (const preview of previews) {
  if (!/^[a-z0-9-]+$/.test(preview.key)) throw new Error("Invalid preview key.");
  const html = (await fs.readFile(path.join(folder, `${preview.key}.html`), "utf8")).replace(
    /<body([^>]*)>/,
    '<body$1><p style="padding:12px;font:14px Arial;color:#302525;background:#fff">TEST POUR LOUIS : données fictives, aucune réservation ni carte utilisable. Les liens de réservation de cet exemple ne correspondent pas à un dossier réel.</p>',
  );
  const attachments = [];
  for (const name of preview.attachments ?? []) {
    if (path.basename(name) !== name || !name.startsWith(`${preview.key}-`))
      throw new Error("Invalid preview attachment path.");
    attachments.push({
      filename: name.slice(preview.key.length + 1),
      content: (await fs.readFile(path.join(folder, name))).toString("base64"),
    });
  }
  const mail = {
    from: process.env.KAFE_EMAIL_FROM,
    to: [recipient],
    subject: `[TEST Kafé · ${preview.key}] ${preview.subject}`,
    html,
    ...(attachments.length ? { attachments } : {}),
    ...(process.env.KAFE_REPLY_TO ? { reply_to: process.env.KAFE_REPLY_TO } : {}),
  };
  if (!send) {
    console.log(
      JSON.stringify({
        key: preview.key,
        recipient,
        attachments: attachments.length,
        mode: "dry-run",
      }),
    );
    continue;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `kafe-preview-20260908-v1-${preview.key}`,
    },
    body: JSON.stringify(mail),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  const result = {
    key: preview.key,
    recipient,
    accepted: response.ok,
    http: response.status,
    id: data.id ?? null,
  };
  results.push(result);
  await fs.writeFile(path.join(folder, "send-results.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(result));
  if (!response.ok)
    throw new Error(
      `Resend did not accept ${preview.key}: ${response.status} ${data.name ?? ""}. Stop; do not create a new idempotency key.`,
    );
  await new Promise((resolve) => setTimeout(resolve, 1100));
}
