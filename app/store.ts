import { randomUUID } from "crypto";

export type Event = {
  id: string;
  slug: string;
  name: string;
  description: string;
  date: string;
  location: string;
  ticketPrice: number;
  insurancePrice: number;
};

export type Ticket = {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  hasInsurance: boolean;
  createdAt: string;
};

const events: Event[] = [];
const tickets: Ticket[] = [];

// turn event name into slug
function toSlug(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.floor(Math.random() * 10000)
  );
}

export function createEvent(entry: {
  name: string;
  description: string;
  date: string;
  location: string;
  ticketPrice: number;
  insurancePrice: number;
}): Event {
  const event: Event = {
    id: randomUUID(),
    slug: toSlug(entry.name),
    ...entry,
  };
  events.push(event);
  return event;
}

export function listEvents(): Event[] {
  return [...events].reverse();
}

export function getEventBySlug(slug: string): Event | undefined {
  return events.find((e) => e.slug === slug);
}

export function createTicket(entry: {
  eventId: string;
  name: string;
  email: string;
  phone: string;
  hasInsurance: boolean;
}): Ticket {
  const ticket: Ticket = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...entry,
  };
  tickets.push(ticket);
  return ticket;
}

export function listTicketsForEvent(eventId: string): Ticket[] {
  return tickets.filter((t) => t.eventId === eventId);
}
