import Link from "next/link";
import Image from "next/image"

export default function Footer() {
  return (
    <footer className="mx-4">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 py-2">
            <Image
              src="/PHS.png"
              alt="PavanHomeServices Logo"
              className="h-12 md:h-14 w-auto"
              width={40}
              height={40}
            />
            <span className="text-primary self-center text-xl font-bold tracking-tighter whitespace-nowrap">
              Pavan Home Solutions
            </span>
          </div>

          <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-on-surface-variant sm:mb-0">
            <li>
              <Link href="/about" className="hover:underline me-4 md:me-6 hover:text-secondary transition-all">
                About us
              </Link>
            </li>
            <li>
              <Link href="/help" className="hover:underline me-4 md:me-6 hover:text-secondary transition-all">
                Contact us
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:underline me-4 md:me-6 hover:text-secondary transition-all">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/terms-conditions" className="hover:underline me-4 md:me-6 hover:text-secondary transition-all">
                Term & conditions
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:underline hover:text-secondary transition-all">
                Privacy policy
              </Link>
            </li>

          </ul>
        </div>
        <hr className="my-6 border-outline-variant sm:mx-auto lg:my-8" />
        <span className="block text-sm text-on-surface-variant sm:text-center">
          © {new Date().getFullYear()} <Link href="/" className="hover:underline hover:text-secondary transition-all">Pavan Home Solutions™</Link>. All Rights Reserved.
        </span>
      </div>
    </footer>
  );
}
