import Icon from "./Icon";

export default function HeroVisual() {
  return (
    <div className="hv" aria-hidden="true">
      <div className="hv-chat card">
        <div className="hv-bub l"><b>Priya</b>$90 total. Half on drafts, the rest on the final files.</div>
        <div className="hv-bub r"><b>Rahul</b>OK. Coffee themed, PNG and SVG both.</div>
        <div className="hv-bub l"><b>Priya</b>Done. Drafts in 2 days.</div>
      </div>

      <div className="hv-deal card">
        <div className="hv-top">
          <div>
            <p className="hv-eyebrow">Protected deal</p>
            <p className="hv-title">Bean There logo design</p>
          </div>
          <span className="pill funded">Money held</span>
        </div>
        <p className="hv-amount">$90.00</p>
        <div className="seg"><i style={{ flex: 1, background: "var(--brand)" }} /><i style={{ flex: 1, background: "var(--line-2)" }} /></div>

        <ul className="hv-rows">
          <li>
            <span className="node ok"><Icon name="check" size={13} /></span>
            <span>First drafts</span><em>$45.00</em><span className="pill released">Paid out</span>
          </li>
          <li>
            <span className="node now" />
            <span>Final files</span><em>$45.00</em><span className="pill funded">In progress</span>
          </li>
        </ul>

        <div className="hv-ai">
          <Icon name="spark" size={16} />
          <span><b>AI check:</b> three concepts, coffee theme visible in the image. Work accepted.</span>
        </div>
      </div>
    </div>
  );
}
