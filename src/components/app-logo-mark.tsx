import Image from "next/image";
import Link from "next/link";

import darkLogo from "@/app/unburden-logo.png";
import lightLogo from "@/app/unburden-logo-light.png";

interface AppLogoMarkProps {
  href?: string;
}

export function AppLogoMark({ href = "/" }: AppLogoMarkProps) {
  return (
    <Link
      href={href}
      aria-label="Unburden home"
      className="theme-logo-mark inline-flex items-center justify-center rounded-lg px-2 py-1"
    >
      <Image
        src={darkLogo}
        alt="Unburden"
        width={36}
        height={36}
        priority
        className="theme-logo-image-dark h-9 w-9 object-contain"
      />
      <Image
        src={lightLogo}
        alt=""
        width={36}
        height={36}
        priority
        aria-hidden="true"
        className="theme-logo-image-light hidden h-9 w-9 object-contain"
      />
    </Link>
  );
}
