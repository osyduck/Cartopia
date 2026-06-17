import { Readable } from "node:stream";
import { getSession } from "@/lib/auth/session";
import { getBackupObject } from "@/lib/services/backups";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const obj = await getBackupObject(id);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${obj.filename}"`,
  });
  if (obj.contentLength) {
    headers.set("Content-Length", String(obj.contentLength));
  }

  const web = Readable.toWeb(obj.body) as unknown as ReadableStream;
  return new Response(web, { headers });
}
