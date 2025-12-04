import { getEventBySlug, createTicket } from "../../../lib/store";
import { redirect } from "next/navigation";

type Props = {
  params: { slug: string };
  searchParams: { success?: string };
};

async function bookTicketAction(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") || "");
  const event = getEventBySlug(slug);
  if (!event) return;

  createTicket({
    eventId: event.id,
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || ""),
    phone: String(formData.get("phone") || ""),
    hasInsurance: formData.get("hasInsurance") === "on",
  });

  redirect(`/e/${slug}?success=1`);
}

export default function EventPage({ params, searchParams }: Props) {
  const event = getEventBySlug(params.slug);

 if (!event) {
  // Extract event name from slug
  const readableName = params.slug
    .replace(/-/g, " ")         // convert dashes to spaces
    .replace(/\d+$/, "")        // remove trailing numbers
    .replace(/(^\s+|\s+$)/g, "")// trim spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize

  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "10px" }}>
        {readableName}
      </h1>

      <p style={{ fontSize: "14px", color: "#555", marginBottom: "15px" }}>
        This event was just created.  
        Pricing data is not loaded, but you can still book below.
      </p>

      <div
        style={{
          padding: "10px",
          background: "#f7f7f7",
          borderRadius: "6px",
          marginBottom: "20px",
          fontSize: "13px",
        }}
      >
        <strong>Ticket:</strong> ₹499 (demo) <br />
        <strong>Event protection for full refund incase of cancellation:</strong> +₹19 (demo)
      </div>

      {/* FALLBACK BOOKING FORM */}
      <form
        action={bookTicketAction}
        style={{ marginTop: "20px", fontSize: "14px" }}
      >
        <input type="hidden" name="slug" value={params.slug} />

        <label>
          Full Name <br />
          <input
            name="name"
            required
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>

        <br /><br />

        <label>
          Email <br />
          <input
            name="email"
            type="email"
            required
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>

        <br /><br />

        <label>
          Phone (optional) <br />
          <input
            name="phone"
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>

        <br /><br />

        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type="checkbox" name="hasInsurance" />
          Add event protection for ₹11 (demo)
        </label>

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
          Book Ticket
        </button>
      </form>
    </div>
  );
}


  const ticketOnly = event.ticketPrice;
  const withCover = event.ticketPrice + event.insurancePrice;

  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
      <h1 style={{ fontSize: "22px" }}>{event.name}</h1>
      <p style={{ fontSize: "14px", color: "#555" }}>
        {new Date(event.date).toLocaleString()} • {event.location}
      </p>

      {searchParams?.success && (
        <p
          style={{
            background: "#e8ffe8",
            padding: "10px",
            border: "1px solid #b6ffb6",
            marginTop: "15px",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        >
          ✅ Booking confirmed (demo mode).
        </p>
      )}

      <p style={{ marginTop: "15px" }}>
        <strong>Ticket only:</strong> ₹{ticketOnly}
      </p>
      <p>
        <strong>Ticket + rain protection:</strong> ₹{withCover}
      </p>

      <div
        style={{
          marginTop: "15px",
          background: "#f7f7f7",
          padding: "10px",
          borderRadius: "6px",
          fontSize: "13px",
        }}
      >
        <strong>Rain protection?</strong>  
        If the event is cancelled due to rain, you get a full refund.
      </div>

      <form action={bookTicketAction} style={{ marginTop: "20px" }}>
        <input type="hidden" name="slug" value={event.slug} />

        <label>
          Full Name <br />
          <input
            name="name"
            required
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>

        <br />
        <br />

        <label>
          Email <br />
          <input
            name="email"
            type="email"
            required
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>

        <br />
        <br />

        <label>
          Phone (optional) <br />
          <input
            name="phone"
            style={{ width: "100%", padding: "8px", marginTop: "4px" }}
          />
        </label>

        <br />
        <br />

        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type="checkbox" name="hasInsurance" />
          Add rain protection for ₹{event.insurancePrice}
        </label>

        <br />

        <button
          type="submit"
          style={{
            marginTop: "10px",
            padding: "10px 18px",
            background: "black",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Book Ticket (demo)
        </button>
      </form>
    </div>
  );
}
