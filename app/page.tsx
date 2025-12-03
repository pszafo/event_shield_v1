export default function HomePage() {
  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "10px" }}>
        Event Shield – Micro-insurance MVP
      </h1>

      <p style={{ fontSize: "14px", color: "#555" }}>
        This is a demo where organizers can create events and attendees can book
        tickets with an optional <strong> Event protection add-on</strong>.
      </p>

      <div style={{ marginTop: "15px" }}>
        <a
          href="/organizer"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            background: "black",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
            marginRight: "10px",
            fontSize: "14px",
          }}
        >
          Organizer Dashboard
        </a>

        <a
          href="#how"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            border: "1px solid #333",
            borderRadius: "4px",
            textDecoration: "none",
            fontSize: "14px",
            color: "#333",
          }}
        >
          How it Works
        </a>
      </div>

      <h2 id="how" style={{ marginTop: "30px", fontSize: "18px" }}>
        How this MVP Works
      </h2>

      <ol style={{ fontSize: "14px", color: "#555", lineHeight: "22px" }}>
        <li>Organizer creates an event.</li>
        <li>System generates a public event link.</li>
        <li>Organizer shares the link for people to book.</li>
        <li>Attendee selects ticket only OR ticket + event insurance.</li>
        <li>Booking recorded (no real payment in V1).</li>
      </ol>
    </div>
  );
}
