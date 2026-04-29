import { generateShareImage } from "@/lib/marketing/share-image";

export const dynamic = "force-static";

export function GET() {
  return generateShareImage();
}
