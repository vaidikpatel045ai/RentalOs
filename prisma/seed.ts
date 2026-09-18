import { PrismaClient, Prisma, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addHours, subDays } from "date-fns";
import { snapshotMeasurement } from "../lib/measurements";

const db = new PrismaClient();

const DEMO_PASSWORD = "Password123!";

const TABLES = [
  "branches",
  "branch_settings",
  "users",
  "staff_profiles",
  "customers",
  "customer_measurements",
  "garments",
  "garment_images",
  "garment_status_history",
  "garment_locations",
  "garment_condition_reports",
  "garment_repairs",
  "garment_cleaning_jobs",
  "tailoring_jobs",
  "tailoring_notes",
  "appointments",
  "fitting_sessions",
  "fitting_session_garments",
  "bookings",
  "booking_items",
  "booking_events",
  "payments",
  "deposits",
  "refunds",
  "damage_charges",
  "delivery_jobs",
  "notifications",
  "message_templates",
  "messages",
  "staff_tasks",
  "packages",
  "package_items",
  "suppliers",
  "documents",
  "audit_logs",
  "inventory_transfers",
];

async function resetDatabase() {
  const quoted = TABLES.map((t) => `"${t}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
}

async function main() {
  console.log("Resetting database…");
  await resetDatabase();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── Branches ────────────────────────────────────────────────────────────
  const dubai = await db.branch.create({
    data: {
      name: "Bridal Rental OS — Dubai",
      code: "DXB",
      country: "AE",
      currency: "AED",
      timezone: "Asia/Dubai",
      locale: "en-AE",
      taxLabel: "VAT",
      taxRate: 5,
      city: "Dubai",
      stateOrRegion: "Dubai",
      addressLine1: "Boutique Level 2, Jumeirah Beach Road",
      phone: "+97144001234",
      email: "dubai@bridalrentalos.ae",
      settings: {
        create: {
          inspectionBufferHours: 2,
          cleaningBufferHours: 8,
          repairBufferHours: 6,
          qualityCheckBufferHours: 1,
          tightThresholdHours: 24,
        },
      },
    },
  });

  const abuDhabi = await db.branch.create({
    data: {
      name: "Bridal Rental OS — Abu Dhabi",
      code: "AUH",
      country: "AE",
      currency: "AED",
      timezone: "Asia/Dubai",
      locale: "en-AE",
      taxLabel: "VAT",
      taxRate: 5,
      city: "Abu Dhabi",
      stateOrRegion: "Abu Dhabi",
      addressLine1: "Corniche Boutique Row",
      phone: "+97124005678",
      email: "abudhabi@bridalrentalos.ae",
      settings: { create: {} },
    },
  });

  const sharjah = await db.branch.create({
    data: {
      name: "Bridal Rental OS — Sharjah",
      code: "SHJ",
      country: "AE",
      currency: "AED",
      timezone: "Asia/Dubai",
      locale: "en-AE",
      taxLabel: "VAT",
      taxRate: 5,
      city: "Sharjah",
      stateOrRegion: "Sharjah",
      addressLine1: "Al Majaz Boutique Plaza",
      phone: "+97165009876",
      email: "sharjah@bridalrentalos.ae",
      settings: { create: {} },
    },
  });

  console.log("Branches created.");

  // ── Staff / Users ───────────────────────────────────────────────────────
  async function createUser(opts: {
    name: string;
    email: string;
    role: Role;
    branchId?: string;
    employeeCode?: string;
    title?: string;
  }) {
    return db.user.create({
      data: {
        name: opts.name,
        email: opts.email,
        passwordHash,
        role: opts.role,
        branchId: opts.branchId,
        staffProfile: opts.employeeCode
          ? { create: { employeeCode: opts.employeeCode, title: opts.title } }
          : undefined,
      },
    });
  }

  const owner = await createUser({
    name: "Layla Al Farsi",
    email: "owner@bridalrentalos.ae",
    role: "OWNER",
    employeeCode: "EMP-001",
    title: "Founder & CEO",
  });

  await createUser({
    name: "Fatima Al Mazrouei",
    email: "manager.dxb@bridalrentalos.ae",
    role: "MANAGER",
    branchId: dubai.id,
    employeeCode: "EMP-002",
    title: "Store Manager, Dubai",
  });
  await createUser({
    name: "Huda Al Nahyan",
    email: "manager.auh@bridalrentalos.ae",
    role: "MANAGER",
    branchId: abuDhabi.id,
    employeeCode: "EMP-003",
    title: "Store Manager, Abu Dhabi",
  });

  const salesDxb = await createUser({
    name: "Mariam Khalil",
    email: "sales.dxb@bridalrentalos.ae",
    role: "SALES",
    branchId: dubai.id,
    employeeCode: "EMP-004",
    title: "Front Desk",
  });
  await createUser({
    name: "Noor Abdullah",
    email: "sales.shj@bridalrentalos.ae",
    role: "SALES",
    branchId: sharjah.id,
    employeeCode: "EMP-005",
    title: "Front Desk",
  });

  const stylistDxb = await createUser({
    name: "Aisha Rahman",
    email: "stylist.dxb@bridalrentalos.ae",
    role: "STYLIST",
    branchId: dubai.id,
    employeeCode: "EMP-006",
    title: "Bridal Stylist",
  });

  const tailorDxb = await createUser({
    name: "Maria Santos",
    email: "tailor.dxb@bridalrentalos.ae",
    role: "TAILOR",
    branchId: dubai.id,
    employeeCode: "EMP-007",
    title: "Senior Seamstress",
  });

  const cleanerDxb = await createUser({
    name: "Grace Mendoza",
    email: "cleaner.dxb@bridalrentalos.ae",
    role: "CLEANER",
    branchId: dubai.id,
    employeeCode: "EMP-008",
    title: "Garment Care Specialist",
  });

  const deliveryDxb = await createUser({
    name: "Ahmed Youssef",
    email: "delivery.dxb@bridalrentalos.ae",
    role: "DELIVERY",
    branchId: dubai.id,
    employeeCode: "EMP-009",
    title: "Delivery Coordinator",
  });

  console.log("Staff created.");

  // ── Customers ───────────────────────────────────────────────────────────
  const now = new Date();

  const sarahUser = await createUser({
    name: "Sarah Ahmed",
    email: "sarah.ahmed@example.com",
    role: "CUSTOMER",
    branchId: dubai.id,
  });

  const sarah = await db.customer.create({
    data: {
      branchId: dubai.id,
      userId: sarahUser.id,
      firstName: "Sarah",
      lastName: "Ahmed",
      phone: "+971501234567",
      whatsapp: "+971501234567",
      email: "sarah.ahmed@example.com",
      nationality: "Emirati",
      preferredLanguage: "EN",
      weddingDate: addDays(now, 10),
      weddingVenue: "Jumeirah Zabeel Saray",
      eventType: "Wedding Reception",
      favoriteDesigners: ["Rami Al Ali", "Elie Saab"],
      stylePreferences: "Classic mermaid silhouette, minimal embellishment, ivory tones.",
    },
  });

  async function createCustomer(data: {
    firstName: string;
    lastName: string;
    phone: string;
    branchId: string;
    weddingDate?: Date;
    nationality?: string;
    eventType?: string;
  }) {
    return db.customer.create({
      data: {
        branchId: data.branchId,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@example.com`,
        nationality: data.nationality,
        preferredLanguage: "EN",
        weddingDate: data.weddingDate,
        eventType: data.eventType ?? "Wedding",
      },
    });
  }

  const otherCustomers = await Promise.all([
    createCustomer({ firstName: "Fatima", lastName: "Al Nuaimi", phone: "+971502223344", branchId: dubai.id, nationality: "Emirati", weddingDate: addDays(now, 40) }),
    createCustomer({ firstName: "Noora", lastName: "Al Shamsi", phone: "+971503334455", branchId: dubai.id, nationality: "Emirati", weddingDate: addDays(now, 65) }),
    createCustomer({ firstName: "Priyanka", lastName: "Sharma", phone: "+971504445566", branchId: dubai.id, nationality: "Indian", weddingDate: addDays(now, 25) }),
    createCustomer({ firstName: "Elena", lastName: "Petrova", phone: "+971505556677", branchId: dubai.id, nationality: "Russian", weddingDate: addDays(now, 90) }),
    createCustomer({ firstName: "Aaliyah", lastName: "Khan", phone: "+971506667788", branchId: dubai.id, nationality: "Pakistani", weddingDate: addDays(now, 15) }),
    createCustomer({ firstName: "Mei", lastName: "Lin", phone: "+971507778899", branchId: dubai.id, nationality: "Chinese", weddingDate: addDays(now, 120) }),
    createCustomer({ firstName: "Hessa", lastName: "Al Kaabi", phone: "+971508889900", branchId: dubai.id, nationality: "Emirati", weddingDate: subDays(now, 20) }),
    createCustomer({ firstName: "Lucia", lastName: "Fernandez", phone: "+971509990011", branchId: dubai.id, nationality: "Spanish", weddingDate: addDays(now, 55) }),
    createCustomer({ firstName: "Yasmin", lastName: "Haddad", phone: "+971501110022", branchId: dubai.id, nationality: "Lebanese", weddingDate: addDays(now, 30) }),
    createCustomer({ firstName: "Farah", lastName: "Idris", phone: "+971502220033", branchId: dubai.id, nationality: "Sudanese", weddingDate: subDays(now, 5) }),
    createCustomer({ firstName: "Zainab", lastName: "Malik", phone: "+971503330044", branchId: abuDhabi.id, nationality: "Pakistani", weddingDate: addDays(now, 45) }),
    createCustomer({ firstName: "Amira", lastName: "El-Sayed", phone: "+971504440055", branchId: abuDhabi.id, nationality: "Egyptian", weddingDate: addDays(now, 70) }),
    createCustomer({ firstName: "Layla", lastName: "Mansour", phone: "+971505550066", branchId: abuDhabi.id, nationality: "Jordanian", weddingDate: addDays(now, 12) }),
    createCustomer({ firstName: "Sofia", lastName: "Rossi", phone: "+971506660077", branchId: sharjah.id, nationality: "Italian", weddingDate: addDays(now, 80) }),
    createCustomer({ firstName: "Reem", lastName: "Al Qasimi", phone: "+971507770088", branchId: sharjah.id, nationality: "Emirati", weddingDate: addDays(now, 20) }),
    createCustomer({ firstName: "Chloe", lastName: "Dubois", phone: "+971508880099", branchId: sharjah.id, nationality: "French", weddingDate: addDays(now, 100) }),
  ]);

  console.log("Customers created.");

  // ── Garments ────────────────────────────────────────────────────────────
  interface GarmentSeed {
    sku: string;
    name: string;
    category: Parameters<typeof db.garment.create>[0]["data"]["category"];
    designer?: string;
    color?: string;
    fabric?: string;
    size?: string;
    rentalPrice: number;
    salePrice?: number;
    securityDeposit: number;
    purchaseCost: number;
    replacementValue: number;
    branchId: string;
    rentalCount?: number;
    totalRentalRevenue?: number;
    conditionScore?: number;
  }

  const garmentSeeds: GarmentSeed[] = [
    { sku: "BR-101", name: "Champagne Lace Ballgown", category: "BRIDAL_GOWN", designer: "Elie Saab", color: "Champagne", fabric: "Lace / Tulle", size: "M", rentalPrice: 12000, securityDeposit: 6000, purchaseCost: 28000, replacementValue: 32000, branchId: dubai.id, rentalCount: 14, totalRentalRevenue: 142000 },
    { sku: "BR-102", name: "Ivory Silk Mermaid Gown", category: "BRIDAL_GOWN", designer: "Rami Al Ali", color: "Ivory", fabric: "Silk Mikado", size: "S", rentalPrice: 8000, securityDeposit: 5000, purchaseCost: 26000, replacementValue: 30000, branchId: dubai.id, rentalCount: 23, totalRentalRevenue: 276000, conditionScore: 9.2 },
    { sku: "BR-103", name: "Blush Off-Shoulder Gown", category: "BRIDAL_GOWN", designer: "Tony Ward", color: "Blush", fabric: "Organza", size: "M", rentalPrice: 9500, securityDeposit: 5000, purchaseCost: 24000, replacementValue: 27000, branchId: dubai.id, rentalCount: 9, totalRentalRevenue: 85500 },
    { sku: "BR-104", name: "White Cathedral Train Gown", category: "BRIDAL_GOWN", designer: "Zuhair Murad", color: "White", fabric: "Silk / Crystal Embroidery", size: "L", rentalPrice: 18000, securityDeposit: 8000, purchaseCost: 42000, replacementValue: 48000, branchId: dubai.id, rentalCount: 6, totalRentalRevenue: 108000 },
    { sku: "BR-105", name: "Ivory Beaded A-Line Gown", category: "BRIDAL_GOWN", designer: "Reem Acra", color: "Ivory", fabric: "Tulle / Beading", size: "M", rentalPrice: 11000, securityDeposit: 5500, purchaseCost: 25000, replacementValue: 29000, branchId: dubai.id, rentalCount: 11, totalRentalRevenue: 121000 },
    { sku: "BR-106", name: "Pearl Embellished Princess Gown", category: "BRIDAL_GOWN", designer: "Rami Kadi", color: "Pearl White", fabric: "Satin", size: "S", rentalPrice: 15000, securityDeposit: 7000, purchaseCost: 35000, replacementValue: 40000, branchId: dubai.id, rentalCount: 4, totalRentalRevenue: 60000 },
    { sku: "BR-107", name: "Modern Minimalist Crepe Gown", category: "BRIDAL_GOWN", designer: "Rasha Kahil", color: "Ivory", fabric: "Crepe", size: "M", rentalPrice: 7000, securityDeposit: 4000, purchaseCost: 18000, replacementValue: 21000, branchId: dubai.id, rentalCount: 8, totalRentalRevenue: 56000 },
    { sku: "BR-108", name: "Vintage Lace Long-Sleeve Gown", category: "BRIDAL_GOWN", designer: "Elie Saab", color: "Ivory", fabric: "Chantilly Lace", size: "M", rentalPrice: 13500, securityDeposit: 6000, purchaseCost: 30000, replacementValue: 34000, branchId: dubai.id, rentalCount: 7, totalRentalRevenue: 94500 },
    { sku: "BR-109", name: "Sculpted Satin Ballgown", category: "BRIDAL_GOWN", designer: "Tony Ward", color: "White", fabric: "Satin", size: "L", rentalPrice: 16000, securityDeposit: 7500, purchaseCost: 38000, replacementValue: 43000, branchId: abuDhabi.id, rentalCount: 5, totalRentalRevenue: 80000 },
    { sku: "BR-110", name: "Embroidered Tulle Fit-and-Flare", category: "BRIDAL_GOWN", designer: "Rami Al Ali", color: "Ivory", fabric: "Tulle", size: "S", rentalPrice: 10500, securityDeposit: 5000, purchaseCost: 24000, replacementValue: 27000, branchId: abuDhabi.id, rentalCount: 10, totalRentalRevenue: 105000 },
    { sku: "BR-221", name: "Draped Silk Column Gown", category: "BRIDAL_GOWN", designer: "Reem Acra", color: "Ivory", fabric: "Silk Charmeuse", size: "M", rentalPrice: 14000, securityDeposit: 6500, purchaseCost: 32000, replacementValue: 36000, branchId: dubai.id, rentalCount: 18, totalRentalRevenue: 198000 },
    { sku: "BR-875", name: "Structured Ballgown with Cape", category: "BRIDAL_GOWN", designer: "Rami Kadi", color: "Ivory", fabric: "Satin / Tulle", size: "XS", rentalPrice: 17000, securityDeposit: 8000, purchaseCost: 30000, replacementValue: 34000, branchId: sharjah.id, rentalCount: 2, totalRentalRevenue: 7000, conditionScore: 8.5 },

    { sku: "EV-201", name: "Midnight Sequin Evening Gown", category: "EVENING_GOWN", designer: "Yousef Aljasmi", color: "Black", fabric: "Sequin Mesh", size: "M", rentalPrice: 4500, securityDeposit: 2500, purchaseCost: 10000, replacementValue: 12000, branchId: dubai.id, rentalCount: 12, totalRentalRevenue: 54000 },
    { sku: "EV-202", name: "Emerald Silk Evening Gown", category: "EVENING_GOWN", designer: "Zuhair Murad", color: "Emerald", fabric: "Silk", size: "S", rentalPrice: 5200, securityDeposit: 2500, purchaseCost: 11000, replacementValue: 13000, branchId: dubai.id, rentalCount: 9, totalRentalRevenue: 46800 },
    { sku: "EV-203", name: "Gold Metallic Draped Gown", category: "EVENING_GOWN", designer: "Michael Cinco", color: "Gold", fabric: "Metallic Jersey", size: "M", rentalPrice: 6000, securityDeposit: 3000, purchaseCost: 13000, replacementValue: 15000, branchId: dubai.id, rentalCount: 6, totalRentalRevenue: 36000 },
    { sku: "EV-204", name: "Ruby Off-Shoulder Gown", category: "EVENING_GOWN", designer: "Tony Ward", color: "Ruby Red", fabric: "Satin", size: "L", rentalPrice: 4800, securityDeposit: 2500, purchaseCost: 10500, replacementValue: 12500, branchId: abuDhabi.id, rentalCount: 7, totalRentalRevenue: 33600 },
    { sku: "EV-205", name: "Silver Beaded Column Gown", category: "EVENING_GOWN", designer: "Rami Kadi", color: "Silver", fabric: "Beaded Tulle", size: "S", rentalPrice: 5500, securityDeposit: 2800, purchaseCost: 12000, replacementValue: 14000, branchId: sharjah.id, rentalCount: 5, totalRentalRevenue: 27500 },
    { sku: "EV-206", name: "Navy Velvet Evening Gown", category: "EVENING_GOWN", designer: "Elie Saab", color: "Navy", fabric: "Velvet", size: "M", rentalPrice: 5000, securityDeposit: 2500, purchaseCost: 11000, replacementValue: 13000, branchId: dubai.id, rentalCount: 8, totalRentalRevenue: 40000 },

    { sku: "AB-301", name: "Embellished Black Abaya", category: "ABAYA", designer: "Dima Ayad", color: "Black", fabric: "Crepe", size: "M", rentalPrice: 2200, securityDeposit: 1200, purchaseCost: 5000, replacementValue: 6000, branchId: dubai.id, rentalCount: 15, totalRentalRevenue: 33000 },
    { sku: "AB-302", name: "Ivory Occasion Abaya", category: "ABAYA", designer: "Al Ostoura", color: "Ivory", fabric: "Silk Crepe", size: "S", rentalPrice: 2500, securityDeposit: 1200, purchaseCost: 5500, replacementValue: 6500, branchId: dubai.id, rentalCount: 10, totalRentalRevenue: 25000 },
    { sku: "AB-303", name: "Emerald Embroidered Abaya", category: "ABAYA", designer: "Dima Ayad", color: "Emerald", fabric: "Crepe", size: "M", rentalPrice: 2400, securityDeposit: 1200, purchaseCost: 5200, replacementValue: 6200, branchId: abuDhabi.id, rentalCount: 6, totalRentalRevenue: 14400 },
    { sku: "AB-304", name: "Rose Gold Beaded Abaya", category: "ABAYA", designer: "Al Ostoura", color: "Rose Gold", fabric: "Silk", size: "L", rentalPrice: 2800, securityDeposit: 1400, purchaseCost: 6000, replacementValue: 7000, branchId: sharjah.id, rentalCount: 4, totalRentalRevenue: 11200 },

    { sku: "VL-401", name: "Cathedral Lace-Trim Veil", category: "VEIL", color: "Ivory", fabric: "Tulle", rentalPrice: 800, securityDeposit: 400, purchaseCost: 1500, replacementValue: 1800, branchId: dubai.id, rentalCount: 20, totalRentalRevenue: 16000 },
    { sku: "VL-402", name: "Chapel Length Plain Veil", category: "VEIL", color: "Ivory", fabric: "Tulle", rentalPrice: 500, securityDeposit: 250, purchaseCost: 900, replacementValue: 1100, branchId: dubai.id, rentalCount: 16, totalRentalRevenue: 8000 },
    { sku: "VL-403", name: "Crystal Edge Blusher Veil", category: "VEIL", color: "White", fabric: "Tulle / Crystal", rentalPrice: 650, securityDeposit: 300, purchaseCost: 1200, replacementValue: 1400, branchId: abuDhabi.id, rentalCount: 9, totalRentalRevenue: 5850 },

    { sku: "JW-501", name: "Crystal Bridal Necklace Set", category: "JEWELLERY", color: "Silver", rentalPrice: 1200, securityDeposit: 2000, purchaseCost: 4000, replacementValue: 5000, branchId: dubai.id, rentalCount: 18, totalRentalRevenue: 21600 },
    { sku: "JW-502", name: "Gold Statement Earrings", category: "JEWELLERY", color: "Gold", rentalPrice: 600, securityDeposit: 1000, purchaseCost: 2000, replacementValue: 2500, branchId: dubai.id, rentalCount: 14, totalRentalRevenue: 8400 },
    { sku: "JW-503", name: "Pearl Drop Tiara", category: "JEWELLERY", color: "Silver", rentalPrice: 900, securityDeposit: 1500, purchaseCost: 3000, replacementValue: 3800, branchId: sharjah.id, rentalCount: 7, totalRentalRevenue: 6300 },

    { sku: "BM-601", name: "Dusty Rose Bridesmaid Dress", category: "BRIDESMAID", color: "Dusty Rose", fabric: "Chiffon", size: "M", rentalPrice: 1500, securityDeposit: 800, purchaseCost: 3500, replacementValue: 4200, branchId: dubai.id, rentalCount: 11, totalRentalRevenue: 16500 },
    { sku: "BM-602", name: "Sage Green Bridesmaid Dress", category: "BRIDESMAID", color: "Sage Green", fabric: "Satin", size: "S", rentalPrice: 1500, securityDeposit: 800, purchaseCost: 3500, replacementValue: 4200, branchId: abuDhabi.id, rentalCount: 8, totalRentalRevenue: 12000 },
  ];

  const garments = new Map<string, Awaited<ReturnType<typeof db.garment.create>>>();
  for (const seed of garmentSeeds) {
    const garment = await db.garment.create({
      data: {
        sku: seed.sku,
        branchId: seed.branchId,
        name: seed.name,
        category: seed.category,
        designer: seed.designer,
        color: seed.color,
        fabric: seed.fabric,
        size: seed.size,
        rentalPrice: seed.rentalPrice,
        salePrice: seed.salePrice,
        securityDeposit: seed.securityDeposit,
        purchaseCost: seed.purchaseCost,
        replacementValue: seed.replacementValue,
        qrCodeValue: `garment:${seed.sku}`,
        currentStatus: "AVAILABLE",
        conditionScore: seed.conditionScore ?? 9.5,
        rentalCount: seed.rentalCount ?? 0,
        totalRentalRevenue: seed.totalRentalRevenue ?? 0,
      },
    });
    garments.set(seed.sku, garment);
    await db.garmentStatusHistory.create({
      data: { garmentId: garment.id, toStatus: "AVAILABLE", notes: "Added to inventory" },
    });
  }

  console.log(`${garments.size} garments created.`);

  // ── Hero workflow: Sarah Ahmed / BR-102 (spec section 36) ─────────────────
  const br102 = garments.get("BR-102")!;

  const sarahBookingNumber = `BK-${now.getFullYear()}-0001`;
  const rentalStart = addDays(now, 5);
  const pickupDate = addDays(now, 9);
  const returnDate = addDays(now, 12);

  const sarahBooking = await db.booking.create({
    data: {
      bookingNumber: sarahBookingNumber,
      branchId: dubai.id,
      customerId: sarah.id,
      status: "CONFIRMED",
      paymentStatus: "PARTIALLY_PAID",
      rentalStart,
      rentalEnd: returnDate,
      weddingDate: sarah.weddingDate,
      pickupDate,
      returnDate,
      fittingDate: addDays(now, 1),
      deliveryMethod: "STORE_PICKUP",
      returnMethod: "STORE_RETURN",
      rentalFee: 8000,
      discount: 0,
      taxAmount: 400,
      depositAmount: 5000,
      deliveryFee: 0,
      totalAmount: 8400,
      paidAmount: 8000,
      balanceDue: 400,
      assignedStaffId: salesDxb.id,
      notes: "Bride requested minor hem adjustment and bust take-in.",
      items: { create: [{ garmentId: br102.id, priceAtBooking: 8000, depositAtBooking: 5000 }] },
      events: {
        create: [
          { eventType: "CREATED", description: "Booking created", actorUserId: salesDxb.id, actorRole: "SALES" },
          { eventType: "PAYMENT_RECEIVED", description: "Deposit of AED 5,000 received via card", actorUserId: salesDxb.id, actorRole: "SALES" },
          { eventType: "PAYMENT_RECEIVED", description: "Rental payment of AED 3,000 received via card", actorUserId: salesDxb.id, actorRole: "SALES" },
          { eventType: "TAILORING_ASSIGNED", description: "Alterations assigned to Maria Santos", actorUserId: stylistDxb.id, actorRole: "STYLIST" },
          { eventType: "TAILORING_COMPLETED", description: "Alterations completed — ready for final fitting", actorUserId: tailorDxb.id, actorRole: "TAILOR" },
        ],
      },
    },
  });

  await db.deposit.create({ data: { bookingId: sarahBooking.id, amount: 5000, status: "HELD" } });
  await db.payment.create({ data: { bookingId: sarahBooking.id, type: "DEPOSIT", amount: 5000, method: "CARD", receivedByUserId: salesDxb.id } });
  await db.payment.create({ data: { bookingId: sarahBooking.id, type: "RENTAL_FEE", amount: 3000, method: "CARD", receivedByUserId: salesDxb.id } });

  // Measurements
  const sarahMeasurement = await db.customerMeasurement.create({
    data: {
      customerId: sarah.id,
      version: 1,
      isLatest: true,
      verified: true,
      unit: "cm",
      bust: 86,
      waist: 66,
      hip: 94,
      shoulder: 38,
      hollowToHem: 152,
      height: 168,
      takenByUserId: stylistDxb.id,
    },
  });

  // Consultation + final fitting appointments
  await db.appointment.create({
    data: {
      branchId: dubai.id,
      customerId: sarah.id,
      bookingId: sarahBooking.id,
      type: "NEW_CONSULTATION",
      status: "COMPLETED",
      scheduledAt: subDays(now, 14),
      assignedStaffId: stylistDxb.id,
      notes: "Selected BR-102 after trying 4 gowns.",
    },
  });
  await db.appointment.create({
    data: {
      branchId: dubai.id,
      customerId: sarah.id,
      bookingId: sarahBooking.id,
      type: "FINAL_FITTING",
      status: "SCHEDULED",
      scheduledAt: addDays(now, 1),
      assignedStaffId: stylistDxb.id,
      room: "Fitting Suite 1",
    },
  });

  // Tailoring job — completed, drives BR-102's current status
  await db.tailoringJob.create({
    data: {
      garmentId: br102.id,
      bookingId: sarahBooking.id,
      customerId: sarah.id,
      assignedToUserId: tailorDxb.id,
      status: "COMPLETED",
      priority: "HIGH",
      instructions: { hem: "-1.5in", bust: "+0.5in", straps: "-0.5in" },
      beforeMeasurements: snapshotMeasurement(sarahMeasurement) as unknown as Prisma.InputJsonValue,
      dueAt: subDays(now, 1),
      startedAt: subDays(now, 3),
      completedAt: subDays(now, 1),
      notes: "Bride happy with final fit at second try-on.",
    },
  });

  // BR-102 status trail: BOOKED -> WITH_TAILOR -> READY_FOR_FITTING
  await db.garment.update({ where: { id: br102.id }, data: { currentStatus: "READY_FOR_FITTING" } });
  await db.garmentStatusHistory.createMany({
    data: [
      { garmentId: br102.id, fromStatus: "AVAILABLE", toStatus: "BOOKED", changedByUserId: salesDxb.id, changedByRole: "SALES", notes: `Booked on ${sarahBookingNumber}`, createdAt: subDays(now, 6) },
      { garmentId: br102.id, fromStatus: "BOOKED", toStatus: "WITH_TAILOR", changedByUserId: stylistDxb.id, changedByRole: "STYLIST", notes: "Sent for alterations", createdAt: subDays(now, 3) },
      { garmentId: br102.id, fromStatus: "WITH_TAILOR", toStatus: "READY_FOR_FITTING", changedByUserId: tailorDxb.id, changedByRole: "TAILOR", notes: "Tailoring completed", createdAt: subDays(now, 1) },
    ],
  });

  console.log("Hero workflow (Sarah Ahmed / BR-102) created.");

  // ── Additional active tailoring / cleaning / delivery jobs (portal demo) ──
  await db.tailoringJob.create({
    data: {
      garmentId: garments.get("EV-203")!.id,
      customerId: otherCustomers[3].id,
      assignedToUserId: tailorDxb.id,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      instructions: { hem: "-1in", straps: "adjust" },
      dueAt: addDays(now, 2),
      startedAt: now,
    },
  });

  const br105 = garments.get("BR-105")!;
  await db.garment.update({ where: { id: br105.id }, data: { currentStatus: "CLEANING" } });
  await db.garmentCleaningJob.create({
    data: {
      garmentId: br105.id,
      cleaningType: "DELICATE_CARE",
      status: "CLEANING",
      priority: "HIGH",
      stainNotes: "Light makeup stain near neckline",
      instructions: "Handle beading with care — spot clean only.",
      assignedToUserId: cleanerDxb.id,
      dueAt: addDays(now, 1),
      startedAt: now,
    },
  });

  // A COMPLETED cleaning job earlier this week, to seed a real cleaning turnaround KPI.
  await db.garmentCleaningJob.create({
    data: {
      garmentId: garments.get("EV-201")!.id,
      cleaningType: "STEAM",
      status: "COMPLETED",
      priority: "MEDIUM",
      assignedToUserId: cleanerDxb.id,
      startedAt: subDays(now, 4),
      completedAt: subDays(now, 3),
      cost: 150,
    },
  });
  await db.tailoringJob.create({
    data: {
      garmentId: garments.get("BR-107")!.id,
      assignedToUserId: tailorDxb.id,
      status: "COMPLETED",
      priority: "LOW",
      startedAt: subDays(now, 6),
      completedAt: subDays(now, 5),
    },
  });

  // ── Tight-turnaround "At Risk" scenario on BR-108 ──────────────────────────
  const br108 = garments.get("BR-108")!;
  const riskCustomerA = otherCustomers[6];
  const riskCustomerB = otherCustomers[7];

  const riskBookingA = await db.booking.create({
    data: {
      bookingNumber: `BK-${now.getFullYear()}-0002`,
      branchId: dubai.id,
      customerId: riskCustomerA.id,
      status: "IN_PROGRESS",
      paymentStatus: "PAID",
      rentalStart: subDays(now, 3),
      rentalEnd: addDays(now, 1),
      returnDate: addDays(now, 1),
      rentalFee: 13500,
      taxAmount: 675,
      depositAmount: 6000,
      totalAmount: 14175,
      paidAmount: 14175,
      balanceDue: 0,
      assignedStaffId: salesDxb.id,
      items: { create: [{ garmentId: br108.id, priceAtBooking: 13500, depositAtBooking: 6000 }] },
      events: { create: [{ eventType: "CREATED", description: "Booking created", actorUserId: salesDxb.id, actorRole: "SALES" }] },
    },
  });
  await db.garment.update({ where: { id: br108.id }, data: { currentStatus: "WITH_CUSTOMER" } });

  await db.booking.create({
    data: {
      bookingNumber: `BK-${now.getFullYear()}-0003`,
      branchId: dubai.id,
      customerId: riskCustomerB.id,
      status: "CONFIRMED",
      paymentStatus: "PARTIALLY_PAID",
      rentalStart: addHours(addDays(now, 1), 18),
      rentalEnd: addDays(now, 4),
      pickupDate: addHours(addDays(now, 1), 18),
      rentalFee: 13500,
      taxAmount: 675,
      depositAmount: 6000,
      totalAmount: 14175,
      paidAmount: 6000,
      balanceDue: 8175,
      assignedStaffId: salesDxb.id,
      items: { create: [{ garmentId: br108.id, priceAtBooking: 13500, depositAtBooking: 6000 }] },
      events: { create: [{ eventType: "CREATED", description: "Booking created", actorUserId: salesDxb.id, actorRole: "SALES" }] },
    },
  });

  console.log("At-risk turnaround scenario (BR-108) created.");

  // ── Delivery job demo ───────────────────────────────────────────────────
  await db.deliveryJob.create({
    data: {
      bookingId: riskBookingA.id,
      jobNumber: "DL-102",
      type: "HOME_DELIVERY",
      status: "ASSIGNED",
      assignedDriverId: deliveryDxb.id,
      address: "Dubai Marina, Building 12, Apt 803",
      phone: riskCustomerA.phone,
      scheduledDate: addDays(now, 3),
      windowStart: addHours(addDays(now, 3), 18),
      windowEnd: addHours(addDays(now, 3), 19),
    },
  });

  // ── General spread of bookings for dashboard realism ───────────────────
  const bookingTemplates: {
    customer: (typeof otherCustomers)[number];
    garmentSku: string;
    status: "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
    startOffset: number;
    endOffset: number;
    branchId: string;
  }[] = [
    { customer: otherCustomers[0], garmentSku: "BR-101", status: "CONFIRMED", paymentStatus: "PARTIALLY_PAID", startOffset: 20, endOffset: 24, branchId: dubai.id },
    { customer: otherCustomers[1], garmentSku: "BR-103", status: "CONFIRMED", paymentStatus: "UNPAID", startOffset: 45, endOffset: 48, branchId: dubai.id },
    { customer: otherCustomers[2], garmentSku: "BR-104", status: "CONFIRMED", paymentStatus: "PAID", startOffset: 12, endOffset: 16, branchId: dubai.id },
    { customer: otherCustomers[3], garmentSku: "EV-203", status: "IN_PROGRESS", paymentStatus: "PAID", startOffset: -2, endOffset: 2, branchId: dubai.id },
    { customer: otherCustomers[4], garmentSku: "BR-106", status: "CONFIRMED", paymentStatus: "PARTIALLY_PAID", startOffset: 8, endOffset: 12, branchId: dubai.id },
    { customer: otherCustomers[5], garmentSku: "EV-202", status: "CONFIRMED", paymentStatus: "UNPAID", startOffset: 60, endOffset: 62, branchId: dubai.id },
    { customer: otherCustomers[8], garmentSku: "AB-301", status: "COMPLETED", paymentStatus: "PAID", startOffset: -18, endOffset: -15, branchId: dubai.id },
    { customer: otherCustomers[9], garmentSku: "BR-107", status: "COMPLETED", paymentStatus: "PAID", startOffset: -10, endOffset: -7, branchId: dubai.id },
    { customer: otherCustomers[9], garmentSku: "VL-401", status: "COMPLETED", paymentStatus: "PAID", startOffset: -10, endOffset: -7, branchId: dubai.id },
    { customer: otherCustomers[10], garmentSku: "BR-109", status: "CONFIRMED", paymentStatus: "PARTIALLY_PAID", startOffset: 30, endOffset: 34, branchId: abuDhabi.id },
    { customer: otherCustomers[11], garmentSku: "EV-204", status: "CONFIRMED", paymentStatus: "UNPAID", startOffset: 55, endOffset: 57, branchId: abuDhabi.id },
    { customer: otherCustomers[12], garmentSku: "BR-110", status: "IN_PROGRESS", paymentStatus: "PAID", startOffset: -1, endOffset: 3, branchId: abuDhabi.id },
    { customer: otherCustomers[13], garmentSku: "EV-205", status: "CONFIRMED", paymentStatus: "PARTIALLY_PAID", startOffset: 70, endOffset: 72, branchId: sharjah.id },
    { customer: otherCustomers[14], garmentSku: "BR-875", status: "COMPLETED", paymentStatus: "PAID", startOffset: -95, endOffset: -92, branchId: sharjah.id },
    { customer: otherCustomers[15], garmentSku: "AB-304", status: "CANCELLED", paymentStatus: "UNPAID", startOffset: 15, endOffset: 17, branchId: sharjah.id },
    { customer: otherCustomers[0], garmentSku: "JW-501", status: "CONFIRMED", paymentStatus: "PAID", startOffset: 20, endOffset: 24, branchId: dubai.id },
  ];

  let counter = 4;
  for (const t of bookingTemplates) {
    const garment = garments.get(t.garmentSku);
    if (!garment) continue;
    const start = addDays(now, t.startOffset);
    const end = addDays(now, t.endOffset);
    const rentalFee = Number(garment.rentalPrice);
    const deposit = Number(garment.securityDeposit);
    const tax = rentalFee * 0.05;
    const total = rentalFee + tax;
    const paid = t.paymentStatus === "PAID" ? total : t.paymentStatus === "PARTIALLY_PAID" ? total / 2 : 0;

    const booking = await db.booking.create({
      data: {
        bookingNumber: `BK-${now.getFullYear()}-${String(counter).padStart(4, "0")}`,
        branchId: t.branchId,
        customerId: t.customer.id,
        status: t.status,
        paymentStatus: t.paymentStatus,
        rentalStart: start,
        rentalEnd: end,
        pickupDate: start,
        returnDate: end,
        rentalFee,
        taxAmount: tax,
        depositAmount: deposit,
        totalAmount: total,
        paidAmount: paid,
        balanceDue: Math.max(0, total - paid),
        assignedStaffId: salesDxb.id,
        items: { create: [{ garmentId: garment.id, priceAtBooking: rentalFee, depositAtBooking: deposit }] },
        events: { create: [{ eventType: "CREATED", description: "Booking created", actorUserId: salesDxb.id, actorRole: "SALES" }] },
      },
    });

    if (paid > 0) {
      await db.payment.create({ data: { bookingId: booking.id, type: "RENTAL_FEE", amount: paid, method: "CARD", receivedByUserId: salesDxb.id, paidAt: start } });
    }
    if (deposit > 0 && t.status !== "CANCELLED") {
      await db.deposit.create({ data: { bookingId: booking.id, amount: deposit, status: t.status === "COMPLETED" ? "REFUNDED" : "HELD", refundedAmount: t.status === "COMPLETED" ? deposit : 0 } });
    }

    if (t.status === "IN_PROGRESS" || t.status === "COMPLETED") {
      await db.garment.update({ where: { id: garment.id }, data: { currentStatus: t.status === "COMPLETED" ? "AVAILABLE" : "WITH_CUSTOMER" } });
    } else if (t.status === "CONFIRMED") {
      await db.garment.update({ where: { id: garment.id }, data: { currentStatus: "BOOKED" } });
    }

    counter += 1;
  }

  console.log(`${bookingTemplates.length} additional bookings created.`);

  // ── Appointments spread across the coming days ─────────────────────────
  const appointmentTypes = ["DRESS_SELECTION", "FITTING", "ALTERATION_FITTING", "STYLING", "CUSTOMER_SERVICE"] as const;
  for (let i = 0; i < 12; i++) {
    const customer = otherCustomers[i % otherCustomers.length];
    await db.appointment.create({
      data: {
        branchId: customer.branchId,
        customerId: customer.id,
        type: appointmentTypes[i % appointmentTypes.length],
        status: i % 5 === 0 ? "COMPLETED" : "SCHEDULED",
        scheduledAt: addHours(addDays(now, Math.floor(i / 2)), 10 + (i % 6)),
        assignedStaffId: stylistDxb.id,
        durationMinutes: 45,
      },
    });
  }

  console.log("Appointments created.");

  // ── Message templates (WhatsApp/email placeholders — section 18) ───────
  const templates: { name: string; type: string; body: string }[] = [
    { name: "Booking Confirmation", type: "BOOKING_CONFIRMATION", body: "Hi {{customer_name}}, your booking for {{garment_name}} is confirmed for {{appointment_date}}. — Bridal Rental OS" },
    { name: "Appointment Reminder", type: "APPOINTMENT_REMINDER", body: "Reminder: your appointment is on {{appointment_date}}. See you soon, {{customer_name}}!" },
    { name: "Payment Reminder", type: "PAYMENT_REMINDER", body: "Hi {{customer_name}}, a balance of {{amount}} is due for your booking. Please settle at your earliest convenience." },
    { name: "Garment Ready", type: "GARMENT_READY", body: "Great news {{customer_name}} — {{garment_name}} is ready for pickup on {{pickup_date}}!" },
    { name: "Return Reminder", type: "RETURN_REMINDER", body: "Hi {{customer_name}}, a reminder that {{garment_name}} is due for return on {{return_date}}." },
  ];
  for (const t of templates) {
    await db.messageTemplate.create({ data: { branchId: dubai.id, name: t.name, type: t.type, language: "EN", body: t.body } });
  }

  console.log("Message templates created.");

  // ── Audit log sample entries ────────────────────────────────────────────
  await db.auditLog.create({
    data: {
      userId: owner.id,
      userRole: "OWNER",
      action: "SEED",
      entityType: "System",
      entityId: "seed",
      notes: "Demo data seeded.",
    },
  });

  console.log("\nSeed complete.");
  console.log("\nDemo logins (all use password: Password123!):");
  console.log("  Owner:      owner@bridalrentalos.ae");
  console.log("  Manager:    manager.dxb@bridalrentalos.ae");
  console.log("  Sales:      sales.dxb@bridalrentalos.ae");
  console.log("  Stylist:    stylist.dxb@bridalrentalos.ae");
  console.log("  Tailor:     tailor.dxb@bridalrentalos.ae");
  console.log("  Cleaner:    cleaner.dxb@bridalrentalos.ae");
  console.log("  Delivery:   delivery.dxb@bridalrentalos.ae");
  console.log("  Customer:   sarah.ahmed@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
