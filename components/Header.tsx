import Image from "next/image";
import Link from "next/link";
import logo from "../public/logo.svg";

export default function Header() {
  return (
    <header className="relative mx-auto mt-5 flex w-full justify-center px-2 pb-7 sm:px-4">
      <Link href="/" className="flex items-center gap-4">
        <Image alt="NexaForge logo" src={logo} className="h-12 w-12 sm:h-14 sm:w-14" />
        <h1 className="text-3xl sm:text-4xl tracking-tight text-white font-bold">
          <span className="text-blue-500">Nexa</span>Forge
        </h1>
      </Link>
    </header>
  );
}