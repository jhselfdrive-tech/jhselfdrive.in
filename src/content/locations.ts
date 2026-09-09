import type { CarSlug } from "./site";

// Location landing pages. Copy is deliberately written per town — never templated with the
// city name substituted in, which is what search engines treat as doorway pages.
// TODO(owner): verify every distanceKm / driveTime and confirm the `pickup` arrangement for
// each town before launch. The figures below are estimates from the Ramanathapuram base.

export type LocationFaq = { question: string; answer: string };

export type Location = {
  /** Full URL segment, e.g. "self-drive-cars-in-rameswaram" */
  slug: string;
  city: string;
  distanceKm: number;
  driveTime: string;
  route: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  intro: string[];
  reasons: { title: string; detail: string }[];
  trips: { name: string; detail: string }[];
  localNotes: string[];
  pickup: string;
  faq: LocationFaq[];
  recommendedCar: CarSlug;
  keywords: string[];
  /** Feeds sitemap lastmod. Bump only when the copy actually changes. */
  updatedAt: string;
};

export const locations: Location[] = [
  {
    slug: "self-drive-cars-in-rameswaram",
    city: "Rameswaram",
    distanceKm: 55,
    driveTime: "about 1 hour 15 minutes",
    route: "NH87 east through Mandapam, then across the Pamban road bridge onto the island",
    title: "Self Drive Car Rental for Rameswaram",
    description: "Self-drive cars from Ramanathapuram for Rameswaram trips. Drive the Pamban bridge, reach the temple before dawn and continue to Dhanushkodi at your own pace.",
    h1: "Self-drive cars for your Rameswaram trip",
    lede: "Pick up in Ramanathapuram, cross the Pamban bridge and keep the car for as long as the island holds you.",
    intro: [
      "Rameswaram sits about 55 kilometres east of our Ramanathapuram base — roughly an hour and a quarter of driving, most of it straight and open, finishing with the crossing over the Pamban road bridge. It is one of the few drives in Tamil Nadu where the road itself is part of the reason people go, and it is a very different experience behind your own wheel than it is from the back of a hired taxi.",
      "The case for self-drive here is mostly about time of day. The Ramanathaswamy temple rewards an early arrival, and the twenty-two theerthams inside are far more manageable before the middle of the morning. A car you control means leaving Ramanathapuram at four in the morning without negotiating a night rate, and it means staying for the evening aarti without watching a meter.",
      "It also means Dhanushkodi is genuinely on the table. The sealed road now runs almost all the way to the tip, and the stretch past Kothandaramaswamy temple with water on both shoulders is the single best hour of driving in the district. Most day-trip packages skip it or rush it. On your own schedule you can sit there until the light goes.",
    ],
    reasons: [
      { title: "Temple hours run early and late", detail: "Darshan timings and the evening aarti sit at opposite ends of the day. A car you keep overnight covers both without a second booking." },
      { title: "Dhanushkodi needs its own half-day", detail: "The run out to the tip and back is about 40 km from Rameswaram town. Shared transport turns it into a rushed stop; your own car makes it the point of the trip." },
      { title: "The island is more spread out than it looks", detail: "Agni Theertham, the temple, Villoondi Theertham and the APJ Abdul Kalam memorial are scattered across the island, not walkable from one another." },
    ],
    trips: [
      { name: "Pamban bridge crossing", detail: "Pull over on the Mandapam side for the view back across the strait before you drive it." },
      { name: "Dhanushkodi point", detail: "Sealed road to the viewpoint, sand and sea on both sides for the last several kilometres." },
      { name: "Agni Theertham at sunrise", detail: "Directly behind the temple's east gate — worth the early start from Ramanathapuram." },
      { name: "Kalam memorial, Pei Karumbu", detail: "A short detour on the way back into town, quiet in the late afternoon." },
    ],
    localNotes: [
      "Parking near the temple's east side gets tight from about 7 AM on weekends and during festival days — arriving early solves it.",
      "Fill up in Ramanathapuram or at Mandapam before crossing; fuel on the island is available but the queues are longer.",
      "The Pamban road bridge is open to traffic through the day, but crosswinds on the exposed section deserve a slower speed than the road tempts you into.",
      "The final approach to Dhanushkodi is sealed; driving off the sealed surface onto the sand is not permitted and not worth attempting.",
    ],
    // TODO(owner): confirm whether delivery to Rameswaram is offered, and at what charge; update this line if so.
    pickup: "Collection is from our Ramanathapuram base. If you would rather we bring the car closer to Rameswaram, ask when you enquire and we will confirm what is possible for your dates.",
    faq: [
      { question: "Can I drive a self-drive car across the Pamban bridge to Rameswaram?", answer: "Yes. The Pamban road bridge carries ordinary traffic and every car in our fleet is cleared for the crossing. Tell us Rameswaram is on your route when you enquire so we can note it on the agreement." },
      { question: "How long does the drive from Ramanathapuram to Rameswaram take?", answer: "Around an hour and fifteen minutes for the roughly 55 kilometres, taking NH87 through Mandapam and across the bridge. Allow longer on festival weekends when traffic backs up on the approach to the island." },
      { question: "Can I take the car all the way to Dhanushkodi?", answer: "Yes, the sealed road runs to the Dhanushkodi viewpoint and our cars are fine on it. Driving off the sealed road onto the sand is not allowed — it is restricted, and recovery from soft sand is not covered." },
      { question: "Is it better to do Rameswaram as a day trip or keep the car overnight?", answer: "Most people who want both the sunrise darshan and Dhanushkodi in decent light keep the car for two days. A single day works if you leave Ramanathapuram before 5 AM and skip the far end of the island." },
    ],
    recommendedCar: "compact-suv",
    keywords: ["self drive car rental Rameswaram", "self drive cars Rameswaram", "car rental Rameswaram Tamil Nadu", "Rameswaram Dhanushkodi self drive"],
    updatedAt: "2026-09-09",
  },
  {
    slug: "self-drive-cars-in-paramakudi",
    city: "Paramakudi",
    distanceKm: 35,
    driveTime: "about 45 minutes",
    route: "NH87 north-west along the main Madurai corridor",
    title: "Self Drive Car Rental for Paramakudi",
    description: "Self-drive car hire covering Paramakudi from our Ramanathapuram base. No driver, clear daily rates, and an easy run up the Madurai highway whenever you need it.",
    h1: "Self-drive cars for Paramakudi",
    lede: "Forty-five minutes up the highway from our base — and the natural starting point for anything heading towards Madurai.",
    intro: [
      "Paramakudi lies about 35 kilometres north-west of Ramanathapuram, a straight and quick 45 minutes on the main highway. Unlike the coastal towns in this district, Paramakudi is an inland market and junction town, and the trips people take from it look completely different: less sightseeing, more getting somewhere.",
      "That shapes what a self-drive car is actually for here. A large share of the requests we get from Paramakudi are practical — a hospital appointment in Madurai, a college run, a family function two districts over, a wedding season where three separate households need moving on the same weekend. None of those fit neatly into bus timings, and all of them are cheaper and less stressful in a car you drive yourself than in a taxi held on standby for eight hours.",
      "The other draw is the road. Paramakudi sits on the Madurai corridor, which means the drive north is fast, well-surfaced and genuinely pleasant — around two hours to Madurai itself. From there Thekkady, Kodaikanal and the Western Ghats open up, and having your own car for the last leg of any of those is the difference between a trip and a schedule.",
    ],
    reasons: [
      { title: "Madurai is a comfortable two hours", detail: "Hospital visits, university admissions and airport runs are all same-day trips from Paramakudi with your own car." },
      { title: "Function and wedding season logistics", detail: "Moving relatives between venues over a weekend is the single most common reason people here ask us for a car." },
      { title: "Bus timings do not fit early or late plans", detail: "A car you keep overnight covers a 5 AM departure and a 10 PM return without a second thought." },
    ],
    trips: [
      { name: "Madurai and the Meenakshi temple", detail: "About two hours north on the highway; comfortably a day trip with time to spare." },
      { name: "The weekly market run", detail: "Paramakudi's market days are far easier with a boot than with a bus seat." },
      { name: "Onward to the hills", detail: "Kodaikanal and Thekkady are both realistic multi-day trips staged from here via Madurai." },
    ],
    localNotes: [
      "The highway stretch between Ramanathapuram and Paramakudi is fast and open — good surface, but watch for crossing traffic at the village junctions.",
      "Fuel is easy to find on the highway approach; there is no need to plan around it.",
      "Town-centre parking is tight around market hours in the mornings.",
      "If your route continues past Madurai into the hills, tell us at the enquiry stage so we can confirm the usage area on the agreement.",
    ],
    // TODO(owner): confirm whether delivery to Paramakudi is offered, and at what charge; update this line if so.
    pickup: "Collection is from our Ramanathapuram base. If you would rather pick up nearer Paramakudi, ask when you enquire and we will confirm what is possible for your dates.",
    faq: [
      { question: "How far is Paramakudi from your Ramanathapuram pickup point?", answer: "About 35 kilometres, roughly 45 minutes on the main highway. It is the quickest of the towns we serve to reach from our base." },
      { question: "Can I drive to Madurai and back in one day from Paramakudi?", answer: "Comfortably. Madurai is around two hours north on the highway, so a morning appointment and an evening return sits well inside a single day's rental." },
      { question: "Which car suits a Paramakudi to Madurai run best?", answer: "The City Hatchback is the usual choice — the corridor is well-surfaced and mostly highway, so the extra size of an SUV is not needed unless you are carrying a full family and luggage." },
      { question: "Can I take the car up to Kodaikanal or Thekkady from Paramakudi?", answer: "Usually yes, but hill routes need to be agreed in advance. Mention the destination when you enquire and we will confirm the usage area before booking." },
    ],
    recommendedCar: "city-hatchback",
    keywords: ["self drive car rental Paramakudi", "self drive cars Paramakudi", "car rental Paramakudi", "Paramakudi to Madurai self drive"],
    updatedAt: "2026-09-09",
  },
  {
    slug: "self-drive-cars-in-mandapam",
    city: "Mandapam",
    distanceKm: 40,
    driveTime: "about 55 minutes",
    route: "NH87 east along the coast, stopping short of the Pamban crossing",
    title: "Self Drive Car Rental for Mandapam",
    description: "Self-drive cars from Ramanathapuram covering Mandapam and the Pamban crossing. Rent by the day, drive the coast road and cross to Rameswaram on your own schedule.",
    h1: "Self-drive cars for Mandapam",
    lede: "The last stop on the mainland before Rameswaram — and a good base for the coast in both directions.",
    intro: [
      "Mandapam is roughly 40 kilometres east of Ramanathapuram, about 55 minutes on the coastal highway. It is the point where the mainland runs out: the Pamban bridge starts here, and the town has grown around that crossing and around fishing.",
      "For anyone renting a car, Mandapam's usefulness is its position. You are ten minutes from the bridge, which makes Rameswaram a casual half-day rather than an expedition, and you are on the coast road that runs back west towards Keelakarai and beyond. Very few people come to Mandapam and stay in Mandapam — nearly everyone is using it as a hinge between the island and the mainland, which is exactly the kind of trip that suffers most from fixed transport timings.",
      "There is also the harbour itself. Mandapam's fishing harbour and the marine research work based nearby give the town a working, unpolished character that is worth an hour of anyone's morning. The catch comes in early; if you want to see it, you need a car that leaves when you do.",
    ],
    reasons: [
      { title: "Ten minutes from the Pamban crossing", detail: "Rameswaram becomes an easy half-day instead of a full expedition — go for the evening and come back." },
      { title: "Working harbour on an early clock", detail: "The boats land at first light. No timetable accommodates that except your own." },
      { title: "Coast road runs both ways", detail: "West towards Keelakarai and the fishing villages, east across the bridge. Mandapam is the hinge." },
    ],
    trips: [
      { name: "Mandapam fishing harbour", detail: "Early morning is the only time that matters here." },
      { name: "The Pamban view point", detail: "The mainland-side approach gives the best photograph of the bridge — better than crossing it." },
      { name: "Coast road west to Keelakarai", detail: "An hour of quiet coastal driving through fishing villages, with almost no traffic." },
      { name: "Across to Rameswaram", detail: "Ten minutes to the bridge, another twenty into the temple town." },
    ],
    localNotes: [
      "The coastal stretch of NH87 is exposed; salt spray and crosswinds are normal, and the surface can be sandy at the shoulders after rough weather.",
      "Fill up before you reach Mandapam if you plan to continue across to the island — options thin out past the town.",
      "Harbour-area roads are narrow and busy with loading in the early morning; a smaller car is genuinely easier here.",
      "The bridge crossing is the same for Mandapam customers as for anyone else — mention it when enquiring so it is noted on the agreement.",
    ],
    // TODO(owner): confirm whether delivery to Mandapam is offered, and at what charge; update this line if so.
    pickup: "Collection is from our Ramanathapuram base. If you would rather pick up nearer Mandapam, ask when you enquire and we will confirm what is possible for your dates.",
    faq: [
      { question: "How far is Mandapam from Ramanathapuram by road?", answer: "Around 40 kilometres east along the coastal highway, close to 55 minutes of driving. It is the last mainland town before the Pamban bridge." },
      { question: "Can I use a Mandapam rental to cross into Rameswaram?", answer: "Yes. The bridge is about ten minutes from the town and the crossing is open to ordinary traffic. Let us know the island is on your route at the enquiry stage." },
      { question: "Which car handles the Mandapam harbour roads best?", answer: "The City Hatchback. The roads around the harbour are narrow and busy with loading in the mornings, and the smaller car is noticeably easier to place than an SUV." },
      { question: "Is the coastal road from Ramanathapuram to Mandapam in good condition?", answer: "Generally yes, it is a maintained national highway. It is an exposed coastal stretch, so expect crosswinds and occasional sand at the shoulders after rough weather, and drive the outer edge with a little care." },
    ],
    recommendedCar: "city-hatchback",
    keywords: ["self drive car rental Mandapam", "self drive cars Mandapam", "car rental Mandapam Pamban", "Mandapam to Rameswaram self drive"],
    updatedAt: "2026-09-09",
  },
  {
    slug: "self-drive-cars-in-keelakarai",
    city: "Keelakarai",
    distanceKm: 22,
    driveTime: "about 30 minutes",
    route: "the coastal road south-east from Ramanathapuram towards the Gulf of Mannar",
    title: "Self Drive Car Rental for Keelakarai",
    description: "Self-drive car hire for Keelakarai, thirty minutes from our Ramanathapuram base. Coastal roads, the Ervadi route and family trips without a driver or a fixed schedule.",
    h1: "Self-drive cars for Keelakarai",
    lede: "The closest of the towns we serve — half an hour of coast road from our base.",
    intro: [
      "Keelakarai is about 22 kilometres south-east of Ramanathapuram, half an hour on the coastal road. It is the shortest hop of any town we cover, which changes what people use a car for: this is far more often a same-day rental than an overnight one.",
      "The town is an old port with a long trading history along the Gulf of Mannar, and it still runs on fishing. Its centuries-old mosques are among the more unusual pieces of architecture on this coast, and the town has a rhythm that has very little to do with tourism. It is not a sightseeing checklist so much as a place to drive through slowly.",
      "The other reason people rent for Keelakarai is Ervadi, a short distance further along the coast, which draws visitors from well outside the district throughout the year. Getting there and back on public transport with family is awkward. Getting there in a car you drive yourself, staying as long as you want and leaving when you are ready, is straightforward — and because the distance from our base is so short, it is one of the cheapest useful days of driving available here.",
    ],
    reasons: [
      { title: "Closest town to our base", detail: "Twenty-two kilometres means a single day's rental covers the trip out, the day itself and the return with room to spare." },
      { title: "Ervadi is awkward without a car", detail: "Especially with family or elderly passengers, and especially if you want to choose your own hours." },
      { title: "The coast road rewards going slowly", detail: "Fishing villages, salt flats and open water most of the way — not a road to be rushed through on a timetable." },
    ],
    trips: [
      { name: "Ervadi", detail: "A short continuation along the coast; the main reason many families rent for this direction." },
      { name: "Keelakarai's old mosques", detail: "Some of the oldest on the Coromandel coast, and unlike anything else in the district." },
      { name: "The Gulf of Mannar shoreline", detail: "Quiet stretches of coast with almost no through traffic." },
      { name: "Onward east to Mandapam", detail: "An hour of coastal driving if you want to join the Rameswaram road." },
    ],
    localNotes: [
      "The coastal road is narrow in places and passes through village centres — expect slow sections and give way generously.",
      "Fuel is best taken in Ramanathapuram before you leave; do not plan on topping up along the coast.",
      "Parking near the older parts of town is limited, and the lanes are tighter than they look on a map.",
      "Sea air is hard on cars — we ask that the vehicle is rinsed off or simply returned as it is and noted, rather than left standing salted for days.",
    ],
    // TODO(owner): confirm whether delivery to Keelakarai is offered, and at what charge; update this line if so.
    pickup: "Collection is from our Ramanathapuram base. Given how short the run is, most Keelakarai customers collect here — ask when you enquire if you need something else.",
    faq: [
      { question: "How far is Keelakarai from Ramanathapuram?", answer: "About 22 kilometres south-east on the coastal road, roughly half an hour. It is the shortest run of any town we serve, which makes a single-day rental very workable." },
      { question: "Can I drive to Ervadi from Keelakarai in the same rental?", answer: "Yes, Ervadi is a short continuation along the same coast and is well within a normal day's usage. Mention it when you enquire so the route is noted." },
      { question: "Which car is best for a family trip to Keelakarai?", answer: "The Family MPV if you are seven, otherwise the Compact SUV. Both handle the coastal road comfortably, and the higher seating is easier for elderly passengers on the village sections." },
      { question: "Do I need a full day's rental for such a short distance?", answer: "Our rates are daily, so a Keelakarai trip uses one day. Because the distance is short you will use very little of the included 250 kilometres, which leaves room to continue along the coast if you feel like it." },
    ],
    recommendedCar: "family-mpv",
    keywords: ["self drive car rental Keelakarai", "self drive cars Keelakarai", "car rental Keelakarai Ervadi", "Keelakarai self drive car"],
    updatedAt: "2026-09-09",
  },
];

export const locationSlugs = locations.map((location) => location.slug);

export function findLocation(slug: string) { return locations.find((location) => location.slug === slug); }
