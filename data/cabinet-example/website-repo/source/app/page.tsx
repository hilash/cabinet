const featuredFlavors = [
  {
    name: "Moonbeam Meltdrops",
    note: "Silver-sugar caramels that sparkle the moment they hit moonlight.",
  },
  {
    name: "Patronus Pop Rocks",
    note: "Citrus-bright crystals that crackle like tiny protective charms.",
  },
  {
    name: "Canary Cream Supremes",
    note: "Vanilla-gold sweets with exactly the right amount of theatrical risk.",
  },
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.75), transparent 28%), linear-gradient(180deg, #12091f 0%, #2b1555 52%, #ff8b43 100%)",
        color: "#fff7ef",
        fontFamily: "Avenir Next, Trebuchet MS, sans-serif",
        padding: "64px 24px",
      }}
    >
      <section style={{ maxWidth: 960, margin: "0 auto" }}>
        <p style={{ letterSpacing: "0.22em", textTransform: "uppercase", fontSize: 12, opacity: 0.78 }}>
          Weasleys' Wizard Wheezes
        </p>
        <h1 style={{ fontSize: 64, lineHeight: 1, margin: "16px 0 20px" }}>
          Mischief, sweets, and merchandise for very memorable afternoons.
        </h1>
        <p style={{ maxWidth: 620, fontSize: 20, lineHeight: 1.5, color: "rgba(255,247,239,0.85)" }}>
          Fred and George Weasley make magical sweets and delightfully unnecessary chaos for
          Hogwarts visitors, Hogsmeade regulars, and anyone with excellent taste in bad ideas.
        </p>

        <div
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            marginTop: 40,
          }}
        >
          {featuredFlavors.map((flavor) => (
            <article
              key={flavor.name}
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 24,
                padding: 24,
                boxShadow: "0 18px 40px rgba(10, 4, 22, 0.25)",
                backdropFilter: "blur(14px)",
              }}
            >
              <h2 style={{ margin: 0, fontSize: 24 }}>{flavor.name}</h2>
              <p style={{ margin: "12px 0 0", lineHeight: 1.5, color: "rgba(255,247,239,0.82)" }}>
                {flavor.note}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
