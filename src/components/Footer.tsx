import Link from "next/link";
import Image from "next/image"

export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest/40 border-t border-outline-variant/10 mt-auto">
      <div className="w-full max-w-7xl mx-auto px-6 md:px-8 py-8 md:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between md:gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <Image
              src="/PHS.png"
              alt="PHS Cleaning Company Logo"
              className="h-12 w-auto"
              width={40}
              height={40}
            />
            <span className="text-primary text-xl font-bold tracking-tighter whitespace-nowrap">
              PHS Cleaning Company
            </span>
          </div>

          {/* Navigation Links */}
          <ul className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-sm font-semibold text-on-surface-variant">
            <li>
              <Link href="/about" className="hover:underline hover:text-secondary transition-all">
                About us
              </Link>
            </li>
            <li>
              <Link href="/help" className="hover:underline hover:text-secondary transition-all">
                Contact us
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:underline hover:text-secondary transition-all">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/terms-conditions" className="hover:underline hover:text-secondary transition-all">
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

        {/* Divider */}
        <hr className="my-6 border-outline-variant/20" />

        {/* Copyright */}
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between text-xs md:text-sm text-on-surface-variant/80 pb-8 md:pb-0">
          <span className="text-center md:text-left">
            © {new Date().getFullYear()} <Link href="/" className="hover:underline hover:text-secondary transition-all font-semibold">PHS Cleaning Company™</Link>. All Rights Reserved.
          </span>
          <span className="text-center md:text-right hidden md:inline">
            Premium Home Services at Your Doorstep
          </span>
        </div>

      </div>
    </footer>
  );
}
