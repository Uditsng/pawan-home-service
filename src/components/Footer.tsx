import Link from "next/link";
import Image from "next/image"

export default function Footer() {
  return (
    <footer className="mx-4">
      <div className="w-full max-w-7xl mx-auto p-4 md:py-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 py-2">
            <Image
              src="/logo.jpg"
              alt="PavanHomeServices Logo"
              className="h-12 md:h-14 w-auto rounded-lg shadow-sm"
              width={40}
              height={40}
            />
            <span className="text-primary self-center text-xl font-bold tracking-tighter whitespace-nowrap">
              Pawan Home Services
            </span>
          </div>
          {/* <Link href="/" className="flex items-center mb-4 sm:mb-0 space-x-3 rtl:space-x-reverse">
            <span className="text-primary self-center text-2xl font-bold tracking-tighter whitespace-nowrap">
              Pawan Home Services
            </span>
          </Link> */}
          <ul className="flex flex-wrap items-center mb-6 text-sm font-medium text-on-surface-variant sm:mb-0">
            <li>
              <Link href="#" className="hover:underline me-4 md:me-6 hover:text-secondary transition-all">
                About us
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:underline me-4 md:me-6 hover:text-secondary transition-all">
                Contact us
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:underline me-4 md:me-6 hover:text-secondary transition-all">
                Term & conditions
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:underline hover:text-secondary transition-all">
                Privacy policy
              </Link>
            </li>
          </ul>
        </div>
        <hr className="my-6 border-outline-variant sm:mx-auto lg:my-8" />
        <span className="block text-sm text-on-surface-variant sm:text-center">
          © {new Date().getFullYear()} <Link href="/" className="hover:underline hover:text-secondary transition-all">Pawan Home Services™</Link>. All Rights Reserved.
        </span>
      </div>
    </footer>
  );
}
