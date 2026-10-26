export type PayMethod = {
  id: string;
  name: string;
  qr: string;
  accountName: string;
  accountNumber?: string;
};

/**
 * Where people can pay. Put each QR image in public/payment-qr/ (the file names below) and edit the account details.
 * Remove a method you do not accept. Methods whose image is missing show a "not set up" note instead of a QR.
 */
export const PAY_METHODS: PayMethod[] = [
  {
    id: "gcash",
    name: "GCash",
    qr: "/payment-qr/gcash.JPG",
    accountName: "Your account name",
    accountNumber: "09XX XXX XXXX",
  },
  {
    id: "maya",
    name: "Maya",
    qr: "/payment-qr/maya.png",
    accountName: "Your account name",
    accountNumber: "09XX XXX XXXX",
  },
  {
    id: "bank",
    name: "Bank transfer (QR Ph)",
    qr: "/payment-qr/bank.png",
    accountName: "Your account name",
    accountNumber: "Bank name and account number",
  },
];
