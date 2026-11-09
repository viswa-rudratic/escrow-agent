import Link from "next/link";
import Icon from "./Icon";

export default function Nav() {
  return (
    <header className="nav">
      <div className="shell nav-in">
        <Link href="/" className="brand">
          <span className="logo"><Icon name="shield" size={20} /></span>
          Escrow Agent
        </Link>
        <span className="testpill"><i /> Test mode · no real money</span>
      </div>
    </header>
  );
}
