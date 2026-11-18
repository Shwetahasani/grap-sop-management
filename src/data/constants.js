export const STORE_KEY = 'grap-sop-react-v1';
export const SESSION_KEY = 'grap-sop-react-user';
export const MAX_MB = 10;

// Demo directory. In production this comes from the SSO token + IDAM role mapping.
export const USERS = {
  'priya.singh@axisbank.com': { name: 'Priya Singh', role: 'Reviewer', unit: 'Nodal Officer desk' },
  'anu.jha@axisbank.com': { name: 'Anu Jha', role: 'Maker', unit: 'CNO desk' },
  'rahul.mehta@axisbank.com': { name: 'Rahul Mehta', role: 'Reviewer', unit: 'PNO desk' },
  'vikram.rao@axisbank.com': { name: 'Vikram Rao', role: null, unit: 'Branch Banking' },
  'sneha.iyer@axisbank.com': { name: 'Sneha Iyer', role: 'Maker', unit: 'Cards Ops' },
  'mohith.kumar@axisbank.com': { name: 'Mohith Kumar', role: 'Maker', unit: 'MD desk' },
};
export const LOGIN_USERS = [
  'anu.jha@axisbank.com',
  'priya.singh@axisbank.com',
  'rahul.mehta@axisbank.com',
  'vikram.rao@axisbank.com',
];

export const CATS = {
  Cards: ['Credit Card Dispute', 'Chargeback', 'Fees & Charges', 'Card Blocking'],
  Payments: ['UPI', 'NEFT/RTGS', 'IMPS'],
  Loans: ['Closure', 'EMI', 'Documents'],
  ATM: ['Cash Shortage', 'Card Retained'],
  'Legal & Statutory': ['Legal Notice', 'Statutory Notice'],
  Deposits: ['Account Closure', 'KYC Update'],
};

export const STATUSES = [
  'Draft',
  'Submitted',
  'Requested Modification',
  'Modification In Progress',
  'Resubmitted',
  'Approved',
  'Rejected',
];
export const REVIEW_STATUSES = ['Submitted', 'Resubmitted'];
export const EDITABLE_STATUSES = ['Draft', 'Modification In Progress'];
