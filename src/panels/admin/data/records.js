// Mock records for the Global Admin modules, shaped like API responses.
// Replace with calls in a services/ layer; keep field names in sync with the DRF serializers.

const hoursAgo = (h) => new Date(Date.now() - h * 3600_000).toISOString()
const daysFromNow = (d) => new Date(Date.now() + d * 86400_000).toISOString()

/* ---------- Registration documents ---------- */

export const DOC_TYPES = {
  PAN: 'Owner PAN card',
  AADHAAR: 'Owner Aadhaar',
  FSSAI: 'FSSAI licence',
  GST: 'GST registration certificate',
  SHOP: 'Shop and establishment licence',
  FRANCHISE_AGREEMENT: 'Franchise agreement',
  OUTLET_LIST: 'Outlet addresses list',
}
export const REQUIRED_DOCS = {
  SINGLE: ['PAN', 'AADHAAR', 'FSSAI', 'GST', 'SHOP'],
  FRANCHISE: ['PAN', 'AADHAAR', 'FSSAI', 'GST', 'SHOP', 'FRANCHISE_AGREEMENT', 'OUTLET_LIST'],
}

const docs = (type, missing = []) =>
  REQUIRED_DOCS[type].map((key) => ({
    key,
    name: DOC_TYPES[key],
    file: missing.includes(key) ? null : `${key.toLowerCase()}.pdf`,
    sizeKb: missing.includes(key) ? null : 180 + key.length * 37,
  }))

/* ---------- Registrations (owner self-registration) ---------- */

export const registrations = [
  {
    id: 'REG-1043', restaurant: 'Malnad Mane', owner: 'Pradeep Hegde', email: 'pradeep@malnadmane.in', phone: '+91 98450 11234',
    city: 'Hubballi', address: 'Vidyanagar, Hubballi 580021', type: 'SINGLE', outlets: 1, plan: 'Growth', cuisine: 'South Indian',
    gstin: '29ABCPH1234K1Z5', fssai: '11224999000123', docs: docs('SINGLE'),
    referral: { code: 'DQ-SNEHA24', salesPersonId: 'SP-01' }, submittedAt: hoursAgo(52), status: 'PENDING',
  },
  {
    id: 'REG-1047', restaurant: 'Tiffin Trail', owner: 'Rakesh Patil', email: 'rakesh@tiffintrail.in', phone: '+91 99001 23456',
    city: 'Dharwad', address: 'Saptapur, Dharwad 580001', type: 'FRANCHISE', outlets: 4, plan: 'Enterprise', cuisine: 'Breakfast and tiffin',
    gstin: '29AAKCT5678M1Z2', fssai: '11223999000456', docs: docs('FRANCHISE'),
    referral: { code: 'DQ-IRFAN09', salesPersonId: 'SP-02' }, submittedAt: hoursAgo(30), status: 'UNDER_REVIEW',
  },
  {
    id: 'REG-1049', restaurant: 'Coastal Curry House', owner: 'Meera Shetty', email: 'meera@coastalcurry.in', phone: '+91 97411 88990',
    city: 'Mangaluru', address: 'Kadri, Mangaluru 575002', type: 'SINGLE', outlets: 1, plan: 'Starter', cuisine: 'Coastal seafood',
    gstin: '29BDSPS4321Q1Z8', fssai: '11222999000789', docs: docs('SINGLE', ['SHOP']),
    referral: null, submittedAt: hoursAgo(20), status: 'PENDING',
  },
  {
    id: 'REG-1051', restaurant: 'Brew & Bun', owner: 'Karan Mehta', email: 'karan@brewbun.in', phone: '+91 90080 45612',
    city: 'Belagavi', address: 'Tilakwadi, Belagavi 590006', type: 'SINGLE', outlets: 1, plan: 'Growth', cuisine: 'Cafe',
    gstin: '29AFMPM9876L1Z3', fssai: '11225999000234', docs: docs('SINGLE'),
    referral: { code: 'DQ-SNEHA24', salesPersonId: 'SP-01' }, submittedAt: hoursAgo(6), status: 'PENDING',
  },
  {
    id: 'REG-1052', restaurant: 'Udupi Grand', owner: 'Shreyas Rao', email: 'shreyas@udupigrand.in', phone: '+91 98860 77001',
    city: 'Bengaluru', address: 'Jayanagar 4th Block, Bengaluru 560011', type: 'FRANCHISE', outlets: 2, plan: 'Enterprise', cuisine: 'Udupi vegetarian',
    gstin: '29AACCU2468P1Z6', fssai: '11221999000567', docs: docs('FRANCHISE', ['OUTLET_LIST']),
    referral: { code: 'DQ-VIKRAM11', salesPersonId: 'SP-03' }, submittedAt: hoursAgo(2), status: 'PENDING',
  },
  {
    id: 'REG-1038', restaurant: 'Spice Route', owner: 'Farhan Mulla', email: 'farhan@spiceroute.in', phone: '+91 96320 55441',
    city: 'Hubballi', address: 'Keshwapur, Hubballi 580023', type: 'SINGLE', outlets: 1, plan: 'Growth', cuisine: 'North Indian',
    gstin: '29AGFPM1357H1Z9', fssai: '11226999000345', docs: docs('SINGLE'),
    referral: { code: 'DQ-AYESHA03', salesPersonId: 'SP-04' }, submittedAt: hoursAgo(60), status: 'APPROVED', decidedAt: hoursAgo(0.4), decidedBy: 'Ankit Desai',
  },
  {
    id: 'REG-1035', restaurant: 'Food Point', owner: 'Santosh Hiremath', email: 'santosh@foodpoint.in', phone: '+91 94480 33112',
    city: 'Gadag', address: 'Station Road, Gadag 582101', type: 'SINGLE', outlets: 1, plan: 'Starter', cuisine: 'Multi-cuisine',
    gstin: '29AHKPH8642R1Z1', fssai: '11227999000678', docs: docs('SINGLE'),
    referral: { code: 'DQ-VIKRAM11', salesPersonId: 'SP-03' }, submittedAt: hoursAgo(80), status: 'REJECTED', decidedAt: hoursAgo(7), decidedBy: 'Ankit Desai',
    rejectionReason: 'GSTIN on the certificate does not match the GSTIN entered in the form.',
  },
]

/* ---------- Restaurants and franchises ---------- */

export const restaurants = [
  { id: 'RST-0412', name: 'Spice Route', owner: 'Farhan Mulla', city: 'Hubballi', type: 'SINGLE', outlets: 1, plan: 'Growth', status: 'ACTIVE', renewsOn: daysFromNow(29), ordersThisMonth: 1840, joinedOn: '2026-10-10' },
  { id: 'RST-0398', name: 'Hotel Annapurna', owner: 'Gururaj Kulkarni', city: 'Hubballi', type: 'FRANCHISE', franchiseId: 'FRN-012', outlets: 5, plan: 'Enterprise', status: 'ACTIVE', renewsOn: daysFromNow(12), ordersThisMonth: 9620, joinedOn: '2025-08-14' },
  { id: 'RST-0377', name: 'Basavaraj Khanavali', owner: 'Basavaraj Angadi', city: 'Dharwad', type: 'SINGLE', outlets: 1, plan: 'Starter', status: 'ACTIVE', renewsOn: daysFromNow(4), ordersThisMonth: 760, joinedOn: '2025-11-02' },
  { id: 'RST-0365', name: 'The Chai Katte', owner: 'Nikhil Joshi', city: 'Belagavi', type: 'FRANCHISE', franchiseId: 'FRN-009', outlets: 8, plan: 'Enterprise', status: 'ACTIVE', renewsOn: daysFromNow(40), ordersThisMonth: 14210, joinedOn: '2025-06-21' },
  { id: 'RST-0351', name: 'Kamat Bhojan', owner: 'Vinay Kamat', city: 'Karwar', type: 'SINGLE', outlets: 1, plan: 'Growth', status: 'EXPIRED', renewsOn: daysFromNow(-6), ordersThisMonth: 0, joinedOn: '2025-04-11' },
  { id: 'RST-0344', name: 'Biryani Junction', owner: 'Imran Bagwan', city: 'Vijayapura', type: 'FRANCHISE', franchiseId: 'FRN-007', outlets: 3, plan: 'Growth', status: 'ACTIVE', renewsOn: daysFromNow(18), ordersThisMonth: 5370, joinedOn: '2025-03-30' },
  { id: 'RST-0329', name: 'Green Leaf Veg', owner: 'Ramesh Bhat', city: 'Mysuru', type: 'SINGLE', outlets: 1, plan: 'Starter', status: 'SUSPENDED', renewsOn: daysFromNow(22), ordersThisMonth: 0, joinedOn: '2025-02-17', suspendReason: 'Repeated chargebacks reported by payment gateway.' },
  { id: 'RST-0318', name: 'Mangalore Pearl', owner: 'Deepa Pai', city: 'Mangaluru', type: 'SINGLE', outlets: 1, plan: 'Growth', status: 'ACTIVE', renewsOn: daysFromNow(9), ordersThisMonth: 2110, joinedOn: '2025-01-26' },
  { id: 'RST-0302', name: 'Shetty Lunch Home', owner: 'Prakash Shetty', city: 'Udupi', type: 'SINGLE', outlets: 1, plan: 'Starter', status: 'ACTIVE', renewsOn: daysFromNow(2), ordersThisMonth: 940, joinedOn: '2024-12-09' },
  { id: 'RST-0291', name: 'Bun Maska Co.', owner: 'Aditi Kulkarni', city: 'Bengaluru', type: 'FRANCHISE', franchiseId: 'FRN-004', outlets: 6, plan: 'Enterprise', status: 'ACTIVE', renewsOn: daysFromNow(55), ordersThisMonth: 11980, joinedOn: '2024-11-15' },
  { id: 'RST-0276', name: 'Dosa Corner', owner: 'Manjunath Gowda', city: 'Davanagere', type: 'SINGLE', outlets: 1, plan: 'Starter', status: 'ACTIVE', renewsOn: daysFromNow(16), ordersThisMonth: 1320, joinedOn: '2024-10-03' },
  { id: 'RST-0263', name: 'Royal Darbar', owner: 'Salim Khan', city: 'Kalaburagi', type: 'SINGLE', outlets: 1, plan: 'Growth', status: 'ACTIVE', renewsOn: daysFromNow(27), ordersThisMonth: 1675, joinedOn: '2024-09-12' },
]

export const franchises = [
  {
    id: 'FRN-012', brand: 'Hotel Annapurna', owner: 'Gururaj Kulkarni', partner: 'Sunita Kulkarni', hq: 'Hubballi', plan: 'Enterprise', status: 'ACTIVE',
    outlets: [
      { id: 'OUT-1', name: 'Annapurna, Gokul Road', city: 'Hubballi', manager: 'Raghu N', status: 'ACTIVE', salesToday: 48200 },
      { id: 'OUT-2', name: 'Annapurna, Vidyanagar', city: 'Hubballi', manager: 'Shilpa K', status: 'ACTIVE', salesToday: 39150 },
      { id: 'OUT-3', name: 'Annapurna, Old Hubli', city: 'Hubballi', manager: 'Mahesh P', status: 'SUSPENDED', salesToday: 0 },
      { id: 'OUT-4', name: 'Annapurna, Jubilee Circle', city: 'Dharwad', manager: 'Prashant B', status: 'ACTIVE', salesToday: 31480 },
      { id: 'OUT-5', name: 'Annapurna, Hosur', city: 'Hubballi', manager: 'Kavya R', status: 'ACTIVE', salesToday: 27640 },
    ],
  },
  {
    id: 'FRN-009', brand: 'The Chai Katte', owner: 'Nikhil Joshi', partner: null, hq: 'Belagavi', plan: 'Enterprise', status: 'ACTIVE',
    outlets: [
      { id: 'OUT-6', name: 'Chai Katte, Tilakwadi', city: 'Belagavi', manager: 'Omkar S', status: 'ACTIVE', salesToday: 18400 },
      { id: 'OUT-7', name: 'Chai Katte, Camp', city: 'Belagavi', manager: 'Pooja D', status: 'ACTIVE', salesToday: 15230 },
      { id: 'OUT-8', name: 'Chai Katte, Shahapur', city: 'Belagavi', manager: 'Rohit M', status: 'ACTIVE', salesToday: 12790 },
      { id: 'OUT-9', name: 'Chai Katte, Club Road', city: 'Belagavi', manager: 'Sana P', status: 'ACTIVE', salesToday: 16810 },
      { id: 'OUT-10', name: 'Chai Katte, Gokak', city: 'Gokak', manager: 'Anil H', status: 'ACTIVE', salesToday: 9950 },
      { id: 'OUT-11', name: 'Chai Katte, Nipani', city: 'Nipani', manager: 'Vaishali T', status: 'ACTIVE', salesToday: 8720 },
      { id: 'OUT-12', name: 'Chai Katte, Athani', city: 'Athani', manager: 'Sachin K', status: 'ACTIVE', salesToday: 7680 },
      { id: 'OUT-13', name: 'Chai Katte, Chikodi', city: 'Chikodi', manager: 'Megha J', status: 'ACTIVE', salesToday: 6410 },
    ],
  },
  {
    id: 'FRN-007', brand: 'Biryani Junction', owner: 'Imran Bagwan', partner: 'Asif Bagwan', hq: 'Vijayapura', plan: 'Growth', status: 'ACTIVE',
    outlets: [
      { id: 'OUT-14', name: 'Biryani Junction, Station Road', city: 'Vijayapura', manager: 'Javed S', status: 'ACTIVE', salesToday: 42100 },
      { id: 'OUT-15', name: 'Biryani Junction, Solapur Road', city: 'Vijayapura', manager: 'Tanveer M', status: 'ACTIVE', salesToday: 36880 },
      { id: 'OUT-16', name: 'Biryani Junction, Bagalkot', city: 'Bagalkot', manager: 'Nadeem K', status: 'ACTIVE', salesToday: 22450 },
    ],
  },
  {
    id: 'FRN-004', brand: 'Bun Maska Co.', owner: 'Aditi Kulkarni', partner: 'Rahul Kulkarni', hq: 'Bengaluru', plan: 'Enterprise', status: 'ACTIVE',
    outlets: [
      { id: 'OUT-17', name: 'Bun Maska, Indiranagar', city: 'Bengaluru', manager: 'Tejas R', status: 'ACTIVE', salesToday: 26300 },
      { id: 'OUT-18', name: 'Bun Maska, Koramangala', city: 'Bengaluru', manager: 'Nisha V', status: 'ACTIVE', salesToday: 29840 },
      { id: 'OUT-19', name: 'Bun Maska, HSR Layout', city: 'Bengaluru', manager: 'Arjun S', status: 'ACTIVE', salesToday: 21170 },
      { id: 'OUT-20', name: 'Bun Maska, Jayanagar', city: 'Bengaluru', manager: 'Lavanya G', status: 'ACTIVE', salesToday: 18620 },
      { id: 'OUT-21', name: 'Bun Maska, Whitefield', city: 'Bengaluru', manager: 'Kiran B', status: 'ACTIVE', salesToday: 15900 },
      { id: 'OUT-22', name: 'Bun Maska, Malleshwaram', city: 'Bengaluru', manager: 'Divya H', status: 'ACTIVE', salesToday: 17460 },
    ],
  },
]

/* ---------- Users ---------- */

export const ADMIN_TEAM_ROLES = ['Super Admin', 'Operations', 'Support', 'Finance']

export const users = [
  { id: 'U-001', name: 'Ankit Desai', email: 'admin@dimequest.in', phone: '+91 98450 00001', role: 'GLOBAL_ADMIN', teamRole: 'Super Admin', org: 'Dime Quest', status: 'ACTIVE', lastActive: hoursAgo(0.1) },
  { id: 'U-002', name: 'Priya Nair', email: 'priya@dimequest.in', phone: '+91 98450 00002', role: 'GLOBAL_ADMIN', teamRole: 'Operations', org: 'Dime Quest', status: 'ACTIVE', lastActive: hoursAgo(3) },
  { id: 'U-003', name: 'Rohan Kale', email: 'rohan@dimequest.in', phone: '+91 98450 00003', role: 'GLOBAL_ADMIN', teamRole: 'Support', org: 'Dime Quest', status: 'ACTIVE', lastActive: hoursAgo(1) },
  { id: 'U-004', name: 'Swati Inamdar', email: 'swati@dimequest.in', phone: '+91 98450 00004', role: 'GLOBAL_ADMIN', teamRole: 'Finance', org: 'Dime Quest', status: 'INVITED', lastActive: null },
  { id: 'U-011', name: 'Gururaj Kulkarni', email: 'gururaj@annapurna.in', phone: '+91 94481 22001', role: 'OWNER_ADMIN', org: 'Hotel Annapurna', status: 'ACTIVE', lastActive: hoursAgo(2) },
  { id: 'U-012', name: 'Sunita Kulkarni', email: 'sunita@annapurna.in', phone: '+91 94481 22002', role: 'OWNER_PARTNER', org: 'Hotel Annapurna', status: 'ACTIVE', lastActive: hoursAgo(9) },
  { id: 'U-013', name: 'Raghu N', email: 'raghu@annapurna.in', phone: '+91 94481 22010', role: 'RMS_STAFF', staffType: 'MANAGER', org: 'Hotel Annapurna, Gokul Road', status: 'ACTIVE', lastActive: hoursAgo(0.5) },
  { id: 'U-014', name: 'Lata S', email: 'lata@annapurna.in', phone: '+91 94481 22011', role: 'RMS_STAFF', staffType: 'BILLER', org: 'Hotel Annapurna, Gokul Road', status: 'ACTIVE', lastActive: hoursAgo(0.2) },
  { id: 'U-015', name: 'Chef Venkatesh', email: 'venkatesh@annapurna.in', phone: '+91 94481 22012', role: 'RMS_STAFF', staffType: 'CHEF', org: 'Hotel Annapurna, Gokul Road', status: 'ACTIVE', lastActive: hoursAgo(0.3) },
  { id: 'U-021', name: 'Nikhil Joshi', email: 'nikhil@chaikatte.in', phone: '+91 90190 44001', role: 'OWNER_ADMIN', org: 'The Chai Katte', status: 'ACTIVE', lastActive: hoursAgo(5) },
  { id: 'U-022', name: 'Ramesh Bhat', email: 'ramesh@greenleaf.in', phone: '+91 90190 44020', role: 'OWNER_ADMIN', org: 'Green Leaf Veg', status: 'SUSPENDED', lastActive: hoursAgo(240) },
  { id: 'U-031', name: 'Sneha Kulkarni', email: 'sneha.k@gmail.com', phone: '+91 97400 11001', role: 'SALES_PERSON', org: 'Independent', status: 'ACTIVE', lastActive: hoursAgo(4) },
  { id: 'U-032', name: 'Irfan Shaikh', email: 'irfan.s@gmail.com', phone: '+91 97400 11002', role: 'SALES_PERSON', org: 'Independent', status: 'ACTIVE', lastActive: hoursAgo(26) },
  { id: 'U-041', name: 'Ananya Rao', email: 'ananya.r@gmail.com', phone: '+91 99860 22001', role: 'CUSTOMER', org: 'Customer app', status: 'ACTIVE', lastActive: hoursAgo(1) },
  { id: 'U-042', name: 'Mohit Jain', email: 'mohit.j@gmail.com', phone: '+91 99860 22002', role: 'CUSTOMER', org: 'Customer app', status: 'ACTIVE', lastActive: hoursAgo(30) },
]

/* ---------- Sales people, referrals, incentives ---------- */

export const salesPeople = [
  { id: 'SP-01', name: 'Sneha Kulkarni', code: 'DQ-SNEHA24', phone: '+91 97400 11001', email: 'sneha.k@gmail.com', city: 'Hubballi', joinedOn: '2025-09-04', status: 'ACTIVE',
    payout: { method: 'UPI', upi: 'snehakulkarni@oksbi', holder: 'Sneha Kulkarni', pan: 'BKZPK4821M' } },
  { id: 'SP-02', name: 'Irfan Shaikh', code: 'DQ-IRFAN09', phone: '+91 97400 11002', email: 'irfan.s@gmail.com', city: 'Dharwad', joinedOn: '2025-10-17', status: 'ACTIVE',
    payout: { method: 'BANK', account: '50100234567812', ifsc: 'HDFC000123', holder: 'Irfan Shaikh', pan: 'CQRPS7710K' } },
  { id: 'SP-03', name: 'Vikram Joshi', code: 'DQ-VIKRAM11', phone: '+91 97400 11003', email: 'vikram.j@gmail.com', city: 'Bengaluru', joinedOn: '2026-01-22', status: 'ACTIVE',
    payout: { method: 'UPI', upi: 'vikramjoshi@okicici', holder: 'Vikram Joshi', pan: 'AMTPJ3390Q' } },
  { id: 'SP-04', name: 'Ayesha Nadaf', code: 'DQ-AYESHA03', phone: '+91 97400 11004', email: 'ayesha.n@gmail.com', city: 'Belagavi', joinedOn: '2026-05-08', status: 'ACTIVE', payout: null },
  { id: 'SP-05', name: 'Harish Gowda', code: 'DQ-HARISH17', phone: '+91 97400 11005', email: 'harish.g@gmail.com', city: 'Mysuru', joinedOn: '2026-09-29', status: 'ACTIVE', payout: null },
]

/** Settled history before this session; live referrals come from `registrations`. */
export const pastReferrals = [
  { id: 'REF-0201', salesPersonId: 'SP-01', restaurant: 'Hotel Annapurna', owner: 'Gururaj Kulkarni', registration: 'APPROVED', incentive: 'PAID', amount: 2500, at: '2025-08-14' },
  { id: 'REF-0207', salesPersonId: 'SP-01', restaurant: 'The Chai Katte', owner: 'Nikhil Joshi', registration: 'APPROVED', incentive: 'PAID', amount: 4000, at: '2025-06-21' },
  { id: 'REF-0208', salesPersonId: 'SP-01', restaurant: 'Shetty Lunch Home', owner: 'Prakash Shetty', registration: 'APPROVED', incentive: 'PAID', amount: 500, at: '2024-12-09' },
  { id: 'REF-0209', salesPersonId: 'SP-01', restaurant: 'Spice Garden', owner: 'Rahul Kamat', registration: 'APPROVED', incentive: 'APPROVED', amount: 500, at: '2026-09-02' },
  { id: 'REF-0202', salesPersonId: 'SP-01', restaurant: 'Mangalore Pearl', owner: 'Deepa Pai', registration: 'APPROVED', incentive: 'PAID', amount: 500, at: '2025-01-26' },
  { id: 'REF-0203', salesPersonId: 'SP-02', restaurant: 'Biryani Junction', owner: 'Imran Bagwan', registration: 'APPROVED', incentive: 'PAID', amount: 1500, at: '2025-03-30' },
  { id: 'REF-0204', salesPersonId: 'SP-02', restaurant: 'Dosa Corner', owner: 'Manjunath Gowda', registration: 'APPROVED', incentive: 'APPROVED', amount: 500, at: '2024-10-03' },
  { id: 'REF-0205', salesPersonId: 'SP-03', restaurant: 'Bun Maska Co.', owner: 'Aditi Kulkarni', registration: 'APPROVED', incentive: 'PENDING', amount: 3000, at: '2024-11-15' },
  { id: 'REF-0206', salesPersonId: 'SP-03', restaurant: 'Royal Darbar', owner: 'Salim Khan', registration: 'APPROVED', incentive: 'PENDING', amount: 500, at: '2024-09-12' },
]

/** Incentive per approved referral: base amount per outlet, capped. */
export const incentiveRule = { perOutlet: 500, maxPerReferral: 5000, payoutDay: 5, holdDays: 15 }

/* ---------- Plans ---------- */

export const plans = [
  { id: 'starter', name: 'Starter', monthly: 1499, yearly: 14990, outletLimit: 1, staffLimit: 5, status: 'ACTIVE', subscribers: 168 },
  { id: 'growth', name: 'Growth', monthly: 3999, yearly: 39990, outletLimit: 3, staffLimit: 20, status: 'ACTIVE', subscribers: 197 },
  { id: 'enterprise', name: 'Enterprise', monthly: 9999, yearly: 99990, outletLimit: null, staffLimit: null, status: 'ACTIVE', subscribers: 47 },
]

/* ---------- Integrations ---------- */

export const gateways = [
  { id: 'razorpay', name: 'Razorpay', use: 'Subscription billing and restaurant UPI/card payments', enabled: true, mode: 'LIVE', keyId: 'rzp_live_8Jd…Q2', lastEvent: hoursAgo(0.2) },
  { id: 'phonepe', name: 'PhonePe PG', use: 'UPI payments at the counter and in the customer app', enabled: true, mode: 'LIVE', keyId: 'M22…X7', lastEvent: hoursAgo(1) },
  { id: 'cashfree', name: 'Cashfree Payouts', use: 'Sales person incentive payouts', enabled: true, mode: 'LIVE', keyId: 'CF_…91A', lastEvent: hoursAgo(1.5) },
  { id: 'paytm', name: 'Paytm', use: 'Alternative UPI and wallet payments', enabled: false, mode: 'TEST', keyId: '', lastEvent: null },
]

export const thirdParty = [
  { id: 'swiggy', name: 'Swiggy', category: 'Online orders', description: 'Pull Swiggy orders into the biller panel and push menu availability back.', status: 'CONNECTED', restaurants: 138, lastSync: hoursAgo(0.05) },
  { id: 'zomato', name: 'Zomato', category: 'Online orders', description: 'Pull Zomato orders into the biller panel and push menu availability back.', status: 'CONNECTED', restaurants: 152, lastSync: hoursAgo(0.05) },
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Messaging', description: 'Order updates, bills and booking confirmations to customers.', status: 'CONNECTED', restaurants: 301, lastSync: hoursAgo(0.3) },
  { id: 'msg91', name: 'MSG91', category: 'Messaging', description: 'OTP and transactional SMS for logins and registrations.', status: 'CONNECTED', restaurants: null, lastSync: hoursAgo(0.1) },
  { id: 'ses', name: 'Amazon SES', category: 'Messaging', description: 'Login credentials, invoices and report emails.', status: 'CONNECTED', restaurants: null, lastSync: hoursAgo(0.4) },
  { id: 'fcm', name: 'Firebase Cloud Messaging', category: 'Apps', description: 'Push alerts to the chef and customer apps.', status: 'CONNECTED', restaurants: null, lastSync: hoursAgo(0.02) },
  { id: 'maps', name: 'Google Maps Platform', category: 'Apps', description: 'Restaurant locations and directions in the customer app.', status: 'ERROR', restaurants: null, lastSync: hoursAgo(5), error: 'API key quota exceeded at 11:02.' },
  { id: 'tally', name: 'Tally Prime', category: 'Accounting', description: 'Export daily sales and GST registers for the restaurant’s accountant.', status: 'NOT_CONNECTED', restaurants: null, lastSync: null },
]

export const gstRates = [
  { id: 'g1', label: 'Restaurant service (standalone)', rate: 5, itc: false, appliesTo: 'Default for restaurants', isDefault: true },
  { id: 'g2', label: 'Restaurant in hotel, room tariff above ₹7,500', rate: 18, itc: true, appliesTo: 'Chosen per outlet', isDefault: false },
  { id: 'g3', label: 'Outdoor catering', rate: 18, itc: true, appliesTo: 'Chosen per order type', isDefault: false },
  { id: 'g4', label: 'Packaged items (MRP goods)', rate: 0, itc: false, appliesTo: 'Set on menu item', isDefault: false },
]

/* ---------- Notifications ---------- */

export const broadcasts = [
  { id: 'N-118', title: 'Scheduled maintenance on 12 Oct, 2 to 3 AM', audience: 'All restaurants', channels: ['In-app', 'Email'], sentAt: hoursAgo(5), reach: 412, status: 'SENT' },
  { id: 'N-117', title: 'New: Inventory low-stock alerts on Growth plan', audience: 'Growth plan owners', channels: ['In-app', 'WhatsApp'], sentAt: hoursAgo(28), reach: 197, status: 'SENT' },
  { id: 'N-116', title: 'Diwali offer: 2 months free on yearly plans', audience: 'Starter plan owners', channels: ['In-app', 'Email', 'WhatsApp'], sentAt: daysFromNow(6), reach: 168, status: 'SCHEDULED' },
  { id: 'N-115', title: 'Incentive payouts for September processed', audience: 'Sales people', channels: ['SMS', 'In-app'], sentAt: hoursAgo(130), reach: 5, status: 'SENT' },
]

export const automatedAlerts = [
  { id: 'a1', event: 'New owner registration submitted', to: 'Admin team', channels: 'In-app, email', enabled: true },
  { id: 'a2', event: 'Registration approved, send login credentials', to: 'Restaurant owner', channels: 'Email, SMS', enabled: true },
  { id: 'a3', event: 'Registration rejected, send reason', to: 'Restaurant owner', channels: 'Email', enabled: true },
  { id: 'a4', event: 'Plan expires in 7 days', to: 'Restaurant owner', channels: 'In-app, WhatsApp', enabled: true },
  { id: 'a5', event: 'Referral approved, incentive now eligible', to: 'Sales person', channels: 'In-app, SMS', enabled: true },
  { id: 'a6', event: 'Payout or payment gateway failure', to: 'Finance team', channels: 'In-app, email', enabled: true },
  { id: 'a7', event: 'Integration disconnected or erroring', to: 'Admin team', channels: 'In-app', enabled: false },
]

/* ---------- Support chatbot ---------- */

export const conversations = [
  {
    id: 'C-3021', from: 'Ananya Rao', kind: 'Customer', restaurant: 'Malnad Mane', topic: 'Table booking not confirmed', status: 'NEEDS_AGENT', updatedAt: hoursAgo(0.1),
    messages: [
      { by: 'user', text: 'I booked a table for 4 at Malnad Mane for 8 PM tonight but it still shows pending.', at: hoursAgo(0.4) },
      { by: 'bot', text: 'Bookings are confirmed by the restaurant. Malnad Mane usually confirms within 15 minutes. Do you want me to remind them?', at: hoursAgo(0.39) },
      { by: 'user', text: 'It has been 40 minutes already. Please connect me to someone.', at: hoursAgo(0.1) },
      { by: 'bot', text: 'I’ve passed this to our support team. Someone will reply here shortly.', at: hoursAgo(0.1) },
    ],
  },
  {
    id: 'C-3019', from: 'Gururaj Kulkarni', kind: 'Owner', restaurant: 'Hotel Annapurna', topic: 'Printer not printing KOT', status: 'NEEDS_AGENT', updatedAt: hoursAgo(0.6),
    messages: [
      { by: 'user', text: 'KOT is not printing at the Gokul Road outlet since morning.', at: hoursAgo(0.9) },
      { by: 'bot', text: 'Please check Settings > Printers in the owner panel and make sure the kitchen printer shows Online. Is it online?', at: hoursAgo(0.89) },
      { by: 'user', text: 'It shows online but nothing prints.', at: hoursAgo(0.6) },
    ],
  },
  {
    id: 'C-3016', from: 'Mohit Jain', kind: 'Customer', restaurant: 'Bun Maska Co.', topic: 'Refund for cancelled order', status: 'BOT', updatedAt: hoursAgo(2),
    messages: [
      { by: 'user', text: 'My order was cancelled by the restaurant. When will I get the refund?', at: hoursAgo(2.1) },
      { by: 'bot', text: 'Refunds for cancelled orders go back to your original payment method in 5 to 7 working days. Your refund of ₹348 was started today.', at: hoursAgo(2) },
    ],
  },
  {
    id: 'C-3012', from: 'Sneha Kulkarni', kind: 'Sales person', restaurant: null, topic: 'Incentive not shown for Malnad Mane', status: 'RESOLVED', updatedAt: hoursAgo(20),
    messages: [
      { by: 'user', text: 'I referred Malnad Mane but I don’t see the incentive.', at: hoursAgo(21) },
      { by: 'agent', text: 'Hi Sneha, the incentive becomes eligible once their registration is approved. It is still under review, you’ll get an SMS as soon as it’s approved.', at: hoursAgo(20), agent: 'Rohan Kale' },
    ],
  },
]

export const botAnswers = [
  { id: 'f1', intent: 'Refund timelines', example: 'When will I get my refund?', answer: 'Refunds go back to the original payment method in 5 to 7 working days.', enabled: true, hits: 412 },
  { id: 'f2', intent: 'Booking status', example: 'Is my table booking confirmed?', answer: 'Bookings are confirmed by the restaurant, usually within 15 minutes.', enabled: true, hits: 268 },
  { id: 'f3', intent: 'Printer setup', example: 'KOT is not printing', answer: 'Check Settings > Printers in the owner panel and make sure the printer shows Online.', enabled: true, hits: 97 },
  { id: 'f4', intent: 'Referral incentive', example: 'When do I get my incentive?', answer: 'Incentives become eligible once the referred restaurant is approved and are paid on the 5th of each month.', enabled: true, hits: 64 },
  { id: 'f5', intent: 'Change plan', example: 'How do I upgrade my plan?', answer: 'Owners can change plans from Settings > Billing. The new plan applies immediately.', enabled: false, hits: 0 },
]

/* ---------- Audit log ---------- */

export const auditLog = [
  { id: 'AL-9921', at: hoursAgo(0.4), actor: 'Ankit Desai', module: 'Approvals', action: 'Approved registration', target: 'Spice Route (REG-1038)', ip: '103.211.18.40', changes: { status: ['UNDER_REVIEW', 'APPROVED'] } },
  { id: 'AL-9920', at: hoursAgo(1.5), actor: 'System', module: 'Referrals', action: 'Payout failed', target: 'Irfan Shaikh, ₹1,500', ip: null, changes: { payout: ['PROCESSING', 'FAILED'], reason: [null, 'Beneficiary IFSC invalid'] } },
  { id: 'AL-9919', at: hoursAgo(3), actor: 'Priya Nair', module: 'Plans', action: 'Changed plan features', target: 'Growth plan', ip: '49.37.152.9', changes: { 'owner.inventory': [false, true] } },
  { id: 'AL-9918', at: hoursAgo(5), actor: 'Priya Nair', module: 'Notifications', action: 'Sent broadcast', target: 'Scheduled maintenance on 12 Oct (N-118)', ip: '49.37.152.9', changes: { reach: [null, 412] } },
  { id: 'AL-9917', at: hoursAgo(7), actor: 'Ankit Desai', module: 'Approvals', action: 'Rejected registration', target: 'Food Point (REG-1035)', ip: '103.211.18.40', changes: { status: ['PENDING', 'REJECTED'], reason: [null, 'GSTIN mismatch'] } },
  { id: 'AL-9916', at: hoursAgo(9), actor: 'Rohan Kale', module: 'Support', action: 'Resolved conversation', target: 'C-3012', ip: '117.98.4.221', changes: { status: ['NEEDS_AGENT', 'RESOLVED'] } },
  { id: 'AL-9915', at: hoursAgo(26), actor: 'Priya Nair', module: 'RMS', action: 'Suspended outlet', target: 'Hotel Annapurna, Old Hubli', ip: '49.37.152.9', changes: { status: ['ACTIVE', 'SUSPENDED'] } },
  { id: 'AL-9914', at: hoursAgo(31), actor: 'Ankit Desai', module: 'Users', action: 'Invited admin user', target: 'Swati Inamdar (Finance)', ip: '103.211.18.40', changes: { status: [null, 'INVITED'] } },
  { id: 'AL-9913', at: hoursAgo(50), actor: 'Ankit Desai', module: 'Settings', action: 'Changed approval target', target: 'Registration settings', ip: '103.211.18.40', changes: { slaHours: [72, 48] } },
  { id: 'AL-9912', at: hoursAgo(74), actor: 'Swati Inamdar', module: 'Payments', action: 'Switched gateway to live', target: 'Cashfree Payouts', ip: '106.51.77.12', changes: { mode: ['TEST', 'LIVE'] } },
  { id: 'AL-9911', at: hoursAgo(98), actor: 'Priya Nair', module: 'Roles', action: 'Changed role defaults', target: 'Biller', ip: '49.37.152.9', changes: { 'pos.reports': [true, false] } },
  { id: 'AL-9910', at: hoursAgo(120), actor: 'System', module: 'RMS', action: 'Subscription expired', target: 'Kamat Bhojan', ip: null, changes: { status: ['ACTIVE', 'EXPIRED'] } },
]
