const items = ["SOLSTICE ’26", "DU SOL FRESHERS", "25 OCTOBER", "PUNJABI BAGH", "ONE NIGHT ONLY"];

export default function Ticker() {
  const row = [...items, ...items, ...items];
  return (
    <section className="marquee" data-testid="event-ticker" aria-hidden="true">
      <div className="marquee-track">
        {row.map((item, index) => (
          <span key={index} className={index % 2 ? "outline-word" : ""}>
            {item} <i>✦</i>
          </span>
        ))}
      </div>
    </section>
  );
}
