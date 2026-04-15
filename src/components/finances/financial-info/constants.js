export const ASSET_DYNAMIC_TYPES = ['Property', 'Automobile', 'Others']

export const INVESTMENT_TYPES_CORE = ['Exchange Traded Funds (ETF)', 'Stocks & Shares', 'Unit Trusts', 'Bonds']
export const INVESTMENT_TYPES_OPTIONAL = ['Fixed Deposits', 'Foreign Exchange', 'Money Market', 'Cryptocurrency', 'Others']
export const INVESTMENT_TYPES = [...INVESTMENT_TYPES_CORE, ...INVESTMENT_TYPES_OPTIONAL]

export const INVESTMENT_DEFAULT_RETURN = {
  'Exchange Traded Funds (ETF)': 7.5,
  'Stocks & Shares': 8.0,
  'Unit Trusts': 6.5,
  Bonds: 4.0,
  'Fixed Deposits': 3.7,
  'Foreign Exchange': 3.0,
  'Money Market': 3.5,
  Cryptocurrency: 15.0,
  Others: 5.0,
}

export const PAYMENT_MODES = ['Monthly', 'Yearly', 'Quarterly', 'Semi-annually', 'Lump Sum']
export const LIABILITY_TYPES = ['Home Loan', 'Car Loan', 'Study Loan', 'Personal Loan', 'Credit Card', 'Business Loan', 'Other']
export const INCOME_DYNAMIC_TYPES = ['Rental', 'Business', 'Dividends', 'Insurance Payout', 'Other Income']

export const EXPENSE_TYPES_CORE = ['All - Personal', 'All - Transport', 'All - Household', 'All - Dependents', 'All - Miscellaneous', 'Vacation/Travel']
export const EXPENSE_TYPES_OPTIONAL = ['Dependent Allowances', 'Parent Allowance', 'Medical Cost', 'Rental Expenses', 'Others']
export const EXPENSE_TYPES = [...EXPENSE_TYPES_CORE, ...EXPENSE_TYPES_OPTIONAL]
export const FREQUENCIES = ['Monthly', 'Yearly', 'Quarterly', 'Semi-annually', 'One-Time']

export const TABS = [
  { key: 'assets', label: 'Assets' },
  { key: 'investments', label: 'Investments' },
  { key: 'liabilities', label: 'Liabilities' },
  { key: 'income', label: 'Income' },
  { key: 'expenses', label: 'Expenses' },
]
