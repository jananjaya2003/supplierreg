export const STATUSES = ["Complete", "Pending", "In Progress", "Rejected"] as const;
export type Status = (typeof STATUSES)[number];

export interface Registration {
  id: string;
  no: number;
  institute: string;
  payments_closing_date: string | null;
  applications_closing_date: string | null;
  application_mode: string | null;
  method_of_payment: string | null;
  registration_fee: number;
  other_charges: number;
  application_sent_date: string | null;
  remarks: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
}

/** Fields the user can write. id/no/timestamps are owned by the database. */
export type RegistrationInput = Omit<Registration, "id" | "no" | "created_at" | "updated_at">;

export const TABLE = "supplier_registrations";
