import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import { r2, R2_CONFIGURED, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/r2";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
// A standard 48MP HEIC/JPEG photo (e.g. from an iPhone 17 Pro Max in normal
// Photo mode, not ProRAW) typically runs 4.5-8MB. 20MB gives comfortable
// headroom above that without allowing multi-hundred-MB ProRAW/RAW files,
// which are unnecessary for a web listing photo anyway.
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

// Returns a short-lived presigned URL the browser can PUT the file to
// directly — the file bytes never pass through our server.
export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user.role !== "HOST" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only hosts can upload photos" }, { status: 403 });
  }

  if (!R2_CONFIGURED) {
    return NextResponse.json(
      { error: "Photo upload isn't set up yet. Paste an image URL instead for now." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const contentType = body?.contentType as string | undefined;
  const size = body?.size as number | undefined;

  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (typeof size === "number" && size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image is too large (20MB max)" }, { status: 400 });
  }

  const extension = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
  const key = `listings/${session.user.id}/${randomUUID()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  return NextResponse.json({ uploadUrl, publicUrl });
}
