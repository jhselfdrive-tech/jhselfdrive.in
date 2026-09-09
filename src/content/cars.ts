import type { CarSlug } from "./site";
import type { LocationFaq } from "./locations";

// Long-form copy for the /cars/[slug] pages. Specs (day rate, seats, fuel, transmission)
// deliberately stay in site.fleet — that is the single source the enquiry action and admin read.

export type CarContent = {
  title: string;
  description: string;
  h1: string;
  lede: string;
  intro: string[];
  bestFor: string[];
  highlights: { title: string; detail: string }[];
  /** Stated plainly on the page. Being honest about fit prevents the wrong booking. */
  notIdealFor: string;
  faq: LocationFaq[];
  keywords: string[];
  updatedAt: string;
};

export const carContent: Record<CarSlug, CarContent> = {
  "city-hatchback": {
    title: "City Hatchback Self Drive Rental",
    description: "Rent a self-drive City Hatchback in Ramanathapuram from ₹1,800 a day. Easy to park, light on fuel and the sensible pick for town driving and highway runs.",
    h1: "City Hatchback",
    lede: "The one to take when the driving matters more than the luggage.",
    intro: [
      "The hatchback is the car we hand over most often for trips that stay on sealed roads and involve four people or fewer. It is small enough to place easily in the narrow lanes around Keelakarai's older quarters or the harbour roads at Mandapam, and light enough that a full day of highway driving to Madurai and back barely registers on the fuel bill.",
      "Nothing about it is exciting, and that is the point. If your day is a hospital appointment, a college run, a market trip or a straight highway drive with a couple of bags, this is the car that does it for the least money and the least fuss.",
    ],
    bestFor: [
      "Two to four passengers with light luggage",
      "Town driving and tight parking",
      "Highway runs to Madurai and back in a day",
      "Keeping the daily cost as low as possible",
    ],
    highlights: [
      { title: "Easiest to park", detail: "Genuinely useful in Keelakarai's older streets and around the Mandapam harbour in the mornings." },
      { title: "Lowest running cost", detail: "The cheapest daily rate in the fleet and the lightest on fuel over a long highway day." },
      { title: "Straightforward to drive", detail: "If you have not driven for a while or are not used to a larger car, start here." },
    ],
    notIdealFor: "Five adults with luggage, or anyone carrying a full family's bags to Rameswaram for two nights — the boot runs out before the seats do.",
    faq: [
      { question: "How many bags fit in the City Hatchback?", answer: "Comfortably two medium suitcases and a couple of soft bags with four people aboard. With five people you are down to hand luggage — take the SUV or MPV instead." },
      { question: "Is the hatchback comfortable on the highway to Madurai?", answer: "Yes. The Madurai corridor is well-surfaced and mostly straight, and this is the car most people take for that run. It is around two hours each way from Paramakudi." },
      { question: "Is the City Hatchback automatic or manual?", answer: "Manual. The whole fleet is currently manual — if you need an automatic, tell us when you enquire and we will say honestly whether we can arrange one for your dates." },
    ],
    keywords: ["hatchback self drive Ramanathapuram", "cheap self drive car rental Ramanathapuram", "Swift self drive rental"],
    updatedAt: "2026-09-09",
  },
  "compact-suv": {
    title: "Compact SUV Self Drive Rental",
    description: "Rent a self-drive Compact SUV in Ramanathapuram from ₹2,500 a day. Higher seating, real boot space and the most-requested car for Rameswaram and Dhanushkodi trips.",
    h1: "Compact SUV",
    lede: "Our most requested car, and the one we suggest for anything involving the island.",
    intro: [
      "The compact SUV is the middle of the fleet and the car most people end up choosing. The extra ride height is worth having on the coastal stretches where the shoulders get sandy after rough weather, and the boot actually holds a family's bags for a two-night trip rather than making you choose between them.",
      "It is also the car we recommend for Rameswaram. The drive out is long enough that the more settled ride matters, the Pamban crossing is exposed enough that a heavier car feels better in a crosswind, and the run down to Dhanushkodi is the kind of road where sitting a little higher genuinely improves the day.",
    ],
    bestFor: [
      "Rameswaram and Dhanushkodi trips",
      "Four or five adults with real luggage",
      "Coastal roads with sandy shoulders",
      "Long days where ride comfort matters",
    ],
    highlights: [
      { title: "Best for the island run", detail: "The extra weight and height suit the Pamban crossing and the Dhanushkodi road better than the hatchback." },
      { title: "Boot that holds a family trip", detail: "Four or five people with proper luggage for two nights, without stacking bags on laps." },
      { title: "Better view of the road", detail: "The higher seating position makes the narrow village sections of the coast road easier to judge." },
    ],
    notIdealFor: "Seven passengers — that is what the Family MPV exists for. And it is more car than a short town errand needs.",
    faq: [
      { question: "Is the Compact SUV suitable for the Dhanushkodi road?", answer: "Yes, and it is what we would suggest. The road to the Dhanushkodi viewpoint is sealed the whole way, and the SUV's extra height makes the sandy shoulders and the exposed crossing more comfortable. Driving off the sealed surface onto the sand is not permitted in any of our cars." },
      { question: "How much more does the Compact SUV cost than the hatchback?", answer: "₹700 more per day at our starting rates — ₹2,500 against ₹1,800 — plus a slightly higher per-kilometre rate beyond the included distance. Final pricing is confirmed with availability before you book." },
      { question: "Does the Compact SUV seat five adults comfortably?", answer: "Five adults fit, with the middle rear seat being the least comfortable on a long day, as in any car this size. Five adults plus luggage for several nights is where you should look at the Family MPV." },
    ],
    keywords: ["compact SUV self drive Ramanathapuram", "SUV rental Rameswaram", "Brezza self drive rental Ramanathapuram"],
    updatedAt: "2026-09-09",
  },
  "family-mpv": {
    title: "Family MPV Self Drive Rental",
    description: "Rent a self-drive 7-seater Family MPV in Ramanathapuram from ₹3,200 a day. Room for the whole family plus luggage — built for temple trips and function weekends.",
    h1: "Family MPV",
    lede: "Seven seats, and enough boot left over to make them worth using.",
    intro: [
      "The MPV is the car for when the group is the whole point. Seven seats mean nobody is left behind or split across two vehicles, and unlike most seven-seaters at this size there is still usable boot space with the third row up — which is what actually decides whether a family trip works.",
      "In practice it goes out for two things: temple trips where three generations are travelling together, and function weekends where the same car is doing airport runs, venue shuttles and a grocery trip on the same day. Both are cases where a taxi held on standby costs more over a weekend than the car does, and neither fits around a bus timetable.",
    ],
    bestFor: [
      "Six or seven passengers travelling together",
      "Multi-generation temple trips",
      "Wedding and function weekends",
      "Groups who would otherwise need two cars",
    ],
    highlights: [
      { title: "Genuine seven seats", detail: "Not a five-seater with a bench added — the third row is usable for adults on a normal trip." },
      { title: "Boot space with the third row up", detail: "The thing most seven-seaters get wrong, and the reason family trips actually work in this one." },
      { title: "Cheaper than two cars", detail: "For six or seven people, one MPV for a weekend costs less than two smaller cars and is far easier to coordinate." },
    ],
    notIdealFor: "Solo or two-person trips, and the tighter lanes of older town centres, where its size is a liability rather than a feature.",
    faq: [
      { question: "Does the Family MPV really seat seven with luggage?", answer: "Yes — seven seated with usable boot space behind the third row, which is what separates it from most cars this size. Seven people with a full week's luggage each is still a stretch; tell us the group size and trip length when you enquire." },
      { question: "Is the MPV a good choice for a Rameswaram temple trip?", answer: "It is the right choice if you are six or seven. For four or five, the Compact SUV is more comfortable on the long drive and cheaper per day. The MPV earns its rate on group size, not on the route." },
      { question: "Can I use the MPV for a wedding weekend with multiple pickups?", answer: "That is one of the most common reasons it goes out. Our rates are daily, so a two- or three-day booking covers repeated runs between venues without any per-trip charge — you cover fuel and stay within the agreed usage area." },
    ],
    keywords: ["7 seater self drive Ramanathapuram", "MPV self drive rental Ramanathapuram", "Ertiga self drive rental", "family car rental Ramanathapuram"],
    updatedAt: "2026-09-09",
  },
};
