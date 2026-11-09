import Link from "next/link";
import Logo from "./Logo";

export default function Nav() {
  return (
    <header className="nav">
      <div className="shell nav-in">
        <Link href="/" className="brand" aria-label="Escrow Agent home">
          <Logo size={34} />
          Escrow Agent
        </Link>
        <span className="testpill"><i /> Test mode · no real money</span>
      </div>
    </header>
  );
}
