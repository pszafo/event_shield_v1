import { createEvent, listEvents, listTicketsForEvent } from "../../lib/store";

async function createEventAction(formData: FormData) {
  "use server";

  createEvent({
    name: String(formData.get("name") || ""),
    description: String(formData.get("description") || ""),
    date: String(formData.get("date") || ""),
    location: String(formData.get("location") || ""),
    ticketPrice: Number(formData.get("ticketPrice") || 0),
    insurancePrice: Number(formData.get("insurancePrice") || 0),
  });
}

export default async function OrganizerPage() {
  const events = listEvents();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
      {/* CREATE EVENT */}
      <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "20px" }}>Create New Event</h2>

        <form action={createEventAction} style={{ marginTop: "15px", fontSize: "14px" }}>
          <label>
            Event name <br />
            <input name="name" required style={{ width: "100%", padding: "8px" }} />
          </label>

          <br />
          <br />

          <label>
            Description <br />
            <textarea
              name="description"
              style={{ width: "100%", padding: "8px", height: "80px" }}
            ></textarea>
          </label>

          <br />
          <br />

          <label>
            Date & time <br />
            <input
              type="datetime-local"
              name="date"
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </label>

          <br />
          <br />

          <label>
            Location <br />
            <input name="location" required style={{ width: "100%", padding: "8px" }} />
          </label>

          <br />
          <br />

          <label>
            Ticket price (₹) <br />
            <input
              name="ticketPrice"
              type="number"
              required
              style={{ width: "100%", padding: "8px" }}
            />
          </label>

          <br />
          <br />

          <label>
            Rain cover price (₹) <br />
            <input
              name="insurancePrice"
              type="number"
              defaultValue={99}
              style={{ width: "100%", padding: "8px" }}
            />
          </label>

          <br />
          <br />

          <button
            type="submit"
            style={{
              padding: "10px 18px",
              background: "black",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Create Event
          </button>
        </form>
      </div>

      {/* EVENTS LIST */}
      <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
        <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Your Events</h2>

        {events.length === 0 && <p>No events created yet.</p>}

        {events.map((event) => {
          const tickets = listTicketsForEvent(event.id);
          const insured = tickets.filter((t) => t.hasInsurance).length;

          return (
            <div
              key={event.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                marginBottom: "15px",
              }}
            >
              <h3>{event.name}</h3>
              <p style={{ fontSize: "13px", color: "#555" }}>
                {new Date(event.date).toLocaleString()} • {event.location}
              </p>

              <p style={{ fontSize: "13px" }}>
                Ticket: ₹{event.ticketPrice} | Rain cover: ₹{event.insurancePrice}
              </p>

              <p style={{ fontSize: "13px" }}>
                Bookings: {tickets.length} total • {insured} with protection
              </p>

              <a
                href={`/e/${event.slug}`}
                target="_blank"
                style={{ display: "inline-block", marginTop: "8px", fontSize: "13px" }}
              >
                Open public link →
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
