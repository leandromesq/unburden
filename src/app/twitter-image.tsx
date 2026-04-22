import {
  generateShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from "@/lib/marketing/share-image";

export const alt = shareImageAlt;
export const size = shareImageSize;
export const contentType = shareImageContentType;

export default function TwitterImage() {
  return generateShareImage();
}
