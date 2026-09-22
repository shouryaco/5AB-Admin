export type BookingStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ACCEPTED"
  | "ARRIVED"
  | "STARTED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export const bookingStatusClasses: Record<BookingStatus, string> = {
  // Waiting / not accepted
  PENDING: "border-slate-300 bg-slate-100 text-slate-700",

  // Driver allocated but driver has not accepted
  ASSIGNED: "border-slate-300 bg-slate-100 text-slate-700",

  // Driver is on the road to pickup
  ACCEPTED: "border-red-300 bg-red-100 text-red-700",

  // Driver has reached pickup / waiting
  ARRIVED: "border-purple-300 bg-purple-100 text-purple-700",

  // Passenger is on board
  STARTED: "border-yellow-300 bg-yellow-100 text-yellow-800",

  // Journey completed
  COMPLETED: "border-green-300 bg-green-100 text-green-700",

  REJECTED: "border-slate-300 bg-slate-100 text-slate-600",

  CANCELLED: "border-slate-300 bg-slate-100 text-slate-500",
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Not Accepted",
  ACCEPTED: "On Road",
  ARRIVED: "Arrived",
  STARTED: "Passenger On Board",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function getBookingStatusClass(status: BookingStatus) {
  return bookingStatusClasses[status];
}

export function getBookingStatusLabel(status: BookingStatus) {
  return bookingStatusLabels[status];
}

export function getBookingCardClass(status: BookingStatus) {
  switch (status) {
    // Not accepted
    case "PENDING":
    case "ASSIGNED":
      return "border-slate-300 bg-slate-100";

    // On road
    case "ACCEPTED":
      return "border-red-300 bg-red-100";

    // Arrived / waiting
    case "ARRIVED":
      return "border-purple-300 bg-purple-100";

    // Passenger on board
    case "STARTED":
      return "border-yellow-300 bg-yellow-100";

    // Completed
    case "COMPLETED":
      return "border-green-300 bg-green-100";

    case "REJECTED":
    case "CANCELLED":
      return "border-slate-300 bg-slate-100";

    default:
      return "border-slate-200 bg-white";
  }
}
