import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <div className="font-serif hero-numeral text-[6rem] text-faint leading-none">404</div>
      <h1 className="font-serif text-2xl font-semibold mt-4">No such folio in the ledger</h1>
      <p className="text-[0.85rem] text-muted mt-2 max-w-md mx-auto">
        The entry you asked for is not on the register. It may have been renumbered,
        or the reference was mistyped.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link href="/" className="btn-gold">
          MD Dashboard
        </Link>
        <Link href="/coverage" className="btn-outline">
          Catalogue coverage
        </Link>
      </div>
    </div>
  );
}
