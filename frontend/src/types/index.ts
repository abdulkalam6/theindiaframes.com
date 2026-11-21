export interface User {
  id: string;
  email: string;
  name: string;
  account_type: "retail" | "wholesale" | "owner";
  wholesale_status?: "none" | "pending" | "approved" | "rejected";
}

export interface MoneyPaise {
  amount_paise: number;
  currency: "INR";
}
