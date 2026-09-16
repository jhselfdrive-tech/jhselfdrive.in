export const site = {
  name: "JH Self Drive",
  shortName: "JH",
  tagline: "Your road. Your time.",
  description: "Clean, reliable self-drive cars in Ramanathapuram. Book directly in a minute with zero upfront online payment and continue on WhatsApp.",
  phoneDisplay: "+91 93602 24137",
  phoneE164: "+919360224137",
  whatsappNumber: "919360224137",
  email: "hello@jhselfdrive.in",
  address: "Ramanathapuram, Tamil Nadu 623501",
  hours: "Open daily · 7:00 AM–10:00 PM",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://jhselfdrive.in",
  serviceAreas: ["Ramanathapuram", "Rameswaram", "Paramakudi", "Mandapam", "Keelakarai"],
  fleet: [
    { slug: "city-hatchback", name: "City Hatchback", example: "Swift or similar", transmission: "Manual", seats: 5, fuel: "Petrol", dayRate: 1800, kmRate: 12, accent: "coral" },
    { slug: "compact-suv", name: "Compact SUV", example: "Brezza or similar", transmission: "Manual", seats: 5, fuel: "Petrol", dayRate: 2500, kmRate: 15, accent: "teal", popular: true },
    { slug: "family-mpv", name: "Family MPV", example: "Ertiga or similar", transmission: "Manual", seats: 7, fuel: "Petrol", dayRate: 3200, kmRate: 18, accent: "sand" },
  ],
  pricing: { deposit: "From ₹5,000", includedKm: "250 km/day", extraKm: "Varies by car", fuel: "Return at the same level" },
  requirements: [
    { title: "Valid driving licence", detail: "Original licence held for at least 1 year" },
    { title: "Aadhaar or passport", detail: "For identity and address verification" },
    { title: "Refundable deposit", detail: "Amount confirmed before you book" },
  ],
  faq: [
    { question: "How do I book a self-drive car?", answer: "Select your dates and preferred car on our fleet booking form. Your reservation is submitted directly, and you can confirm with our team instantly on WhatsApp." },
    { question: "Do I need to make an advance payment online?", answer: "No online payment is required. You pay the rental and refundable security deposit via UPI or cash during vehicle pickup in Ramanathapuram." },
    { question: "Is fuel included in the rental price?", answer: "Fuel is not included. You receive the car at a recorded fuel level and return it at the same level." },
    { question: "Can I take the car outside Ramanathapuram?", answer: "Yes, subject to the agreed usage area. Mention your route when booking so our team can confirm any route recommendations." },
    { question: "What documents do I need for vehicle handover?", answer: "You need an original valid driving licence and Aadhaar or passport. Verification takes only 2 minutes at pickup." },
    { question: "Can someone else drive the car?", answer: "Only verified drivers named in the rental agreement may drive. You can add an additional driver during pickup." },
  ],
} as const;

export type CarSlug = (typeof site.fleet)[number]["slug"];
