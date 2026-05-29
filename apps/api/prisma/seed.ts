import { PrismaClient, type EventCategory, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type CreatedFacility = {
  id: string;
  name: string;
  city: string;
  seated: boolean;
  managerId: string;
};

type CreatedShow = {
  id: string;
  eventTitle: string;
  startsAt: Date;
  seated: boolean;
  ticketTypes: { id: string; name: string; priceCents: number; maxPerOrder: number }[];
  availableSeatIds: string[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function futureDate(dayOffset: number, hour: number, min = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.seat.deleteMany(),
    prisma.bookingItem.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.ticketType.deleteMany(),
    prisma.show.deleteMany(),
    prisma.event.deleteMany(),
    prisma.facilitySeatTemplate.deleteMany(),
    prisma.facility.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seedUsers(passwordHash: string) {
  const admin = await prisma.user.create({
    data: {
      email: "admin@localbms.com",
      passwordHash,
      name: "Rhea Fernandes",
      role: "ADMIN",
      phone: "+919867530001",
    },
  });

  const managerNames = [
    "Aarav Naik",
    "Mira D'Souza",
    "Neil Velho",
    "Kiara Kamat",
    "Rohan Borkar",
    "Tanya Lobo",
  ];

  const managers: { id: string }[] = [];
  for (let idx = 0; idx < managerNames.length; idx += 1) {
    const name = managerNames[idx];
    const manager = await prisma.user.create({
      data: {
        email: `manager${idx + 1}@localbms.com`,
        passwordHash,
        name,
        phone: `+9198${randInt(10000000, 99999999)}`,
        role: "EVENT_MANAGER",
      },
    });
    managers.push({ id: manager.id });
  }

  const attendeeNames = [
    "Samar Nair",
    "Diya Gaitonde",
    "Kabir Shetty",
    "Ananya Nadkarni",
    "Ritvik Salgaonkar",
    "Pooja Shirodkar",
    "Aditya Prabhu",
    "Meera Keni",
    "Vikram Parsekar",
    "Sonia Furtado",
    "Gaurav Velingkar",
    "Nisha Costa",
    "Aman Rege",
    "Sneha Navelkar",
    "Karan Lotlikar",
    "Riya Pinto",
    "Suhas Bhat",
    "Devika Kerkar",
    "Yash Morajkar",
    "Trisha Rodrigues",
    "Omkar Bhosle",
    "Pallavi Sardessai",
    "Rahul Cotta",
    "Neha Alvares",
    "Harsh Mahale",
    "Pratik Fadte",
    "Lavina Mascarenhas",
    "Nilesh Verenkar",
    "Roshni Monteiro",
    "Chaitanya Parsekar",
    "Mitali Palkar",
    "Darshan Kerkar",
    "Ayesha Colaco",
    "Glen Fernandes",
    "Aditi Talaulikar",
    "Savio Pereira",
    "Juhi Chari",
    "Mahesh Gawas",
    "Shreya Pednekar",
    "Aldrin D'Souza",
    "Rutuja Korgaonkar",
    "Nikhil Viegas",
    "Mrunal Prabhudessai",
    "Celine Rebello",
    "Viren Kankonkar",
    "Bhakti Sawaikar",
    "Rohan Faleiro",
    "Yukti Naik",
    "Aston Sequeira",
    "Kushal Ugemuge",
    "Ankita Velip",
    "Varun Shivolkar",
    "Sia Rane",
    "Ritwik Talaulimkar",
    "Pia Braganza",
    "Leon Coutinho",
    "Shivani Pagi",
    "Haroon Khanolkar",
    "Tanvi Sinai",
    "Preston D'Costa",
  ];

  const attendees: { id: string; name: string; email: string; phone: string | null }[] = [];
  for (let idx = 0; idx < attendeeNames.length; idx += 1) {
    const name = attendeeNames[idx];
    const attendee = await prisma.user.create({
      data: {
        email: `guest${idx + 1}@example-goa.in`,
        passwordHash,
        name,
        phone: `+9197${randInt(10000000, 99999999)}`,
        role: "ATTENDEE",
      },
    });
    attendees.push({
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      phone: attendee.phone,
    });
  }

  await prisma.user.create({
    data: {
      email: "user@localbms.com",
      passwordHash,
      name: "Demo User",
      role: "ATTENDEE",
      phone: "+919876543210",
    },
  });

  await prisma.user.create({
    data: {
      email: "manager@localbms.com",
      passwordHash,
      name: "Raj Event Manager",
      role: "EVENT_MANAGER",
      phone: "+919812345678",
    },
  });

  return { admin, managers, attendees };
}

async function createFacilityWithTemplate(input: {
  name: string;
  description: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  amenities: string[];
  managerId: string;
  imageUrl?: string;
  seated: boolean;
}): Promise<CreatedFacility> {
  const slug = slugify(`${input.name}-${input.city}`);
  const facility = await prisma.facility.create({
    data: {
      name: input.name,
      slug,
      description: input.description,
      address: input.address,
      city: input.city,
      state: input.state ?? "Goa",
      pincode: input.pincode ?? "403001",
      amenities: input.amenities,
      imageUrl: input.imageUrl ?? null,
      managerId: input.managerId,
      capacity: 150,
      hasSeatTemplate: input.seated,
    },
  });

  if (!input.seated) {
    await prisma.facility.update({
      where: { id: facility.id },
      data: { capacity: 300 },
    });
    return {
      id: facility.id,
      name: facility.name,
      city: facility.city,
      seated: false,
      managerId: facility.managerId,
    };
  }

  const tiers = [
    { key: "Premium", priceCents: 220000, rows: ["A", "B"], seatCount: 10, maxPerOrder: 6 },
    { key: "Regular", priceCents: 140000, rows: ["C", "D", "E"], seatCount: 12, maxPerOrder: 8 },
    { key: "Economy", priceCents: 90000, rows: ["F", "G"], seatCount: 12, maxPerOrder: 10 },
  ];

  const templateRows: Prisma.FacilitySeatTemplateCreateManyInput[] = [];
  let y = 0;
  for (const tier of tiers) {
    for (const row of tier.rows) {
      for (let seatNo = 1; seatNo <= tier.seatCount; seatNo += 1) {
        // Add a center aisle gap at seat 6 for wider rows.
        if (tier.seatCount >= 12 && seatNo === 6) continue;
        templateRows.push({
          facilityId: facility.id,
          ticketTypeKey: tier.key,
          rowLabel: row,
          seatNumber: String(seatNo),
          seatCode: `${row}-${seatNo}`,
          x: seatNo - 1,
          y,
          priceCents: tier.priceCents,
          maxPerOrder: tier.maxPerOrder,
        });
      }
      y += 1;
    }
  }

  await prisma.facilitySeatTemplate.createMany({ data: templateRows });
  await prisma.facility.update({
    where: { id: facility.id },
    data: {
      capacity: templateRows.length,
      seatTemplateJson: templateRows as unknown as Prisma.InputJsonValue,
      seatLayoutConfig: {
        version: 1,
        categories: [
          { key: "Premium", label: "Premium", priceRupees: 2200 },
          { key: "Regular", label: "Regular", priceRupees: 1400 },
          { key: "Economy", label: "Economy", priceRupees: 900 },
        ],
      } as Prisma.InputJsonValue,
    },
  });

  return {
    id: facility.id,
    name: facility.name,
    city: facility.city,
    seated: true,
    managerId: facility.managerId,
  };
}

async function createShowWithInventory(input: {
  eventId: string;
  eventTitle: string;
  facility: CreatedFacility;
  startsAt: Date;
  durationMin: number;
}): Promise<CreatedShow> {
  const endsAt = new Date(input.startsAt.getTime() + input.durationMin * 60 * 1000);
  const doorsOpenAt = new Date(input.startsAt.getTime() - 45 * 60 * 1000);

  const show = await prisma.show.create({
    data: {
      eventId: input.eventId,
      facilityId: input.facility.id,
      startsAt: input.startsAt,
      endsAt,
      doorsOpenAt,
      salesEndAt: new Date(input.startsAt.getTime() - 30 * 60 * 1000),
      hasSeatMap: input.facility.seated,
    },
  });

  if (!input.facility.seated) {
    const ticketTypes = await Promise.all([
      prisma.ticketType.create({
        data: {
          showId: show.id,
          name: "General",
          priceCents: 89900,
          totalQty: randInt(180, 260),
          maxPerOrder: 10,
          sortOrder: 1,
        },
      }),
      prisma.ticketType.create({
        data: {
          showId: show.id,
          name: "VIP",
          priceCents: 179900,
          totalQty: randInt(40, 80),
          maxPerOrder: 6,
          sortOrder: 2,
        },
      }),
    ]);

    return {
      id: show.id,
      eventTitle: input.eventTitle,
      startsAt: input.startsAt,
      seated: false,
      ticketTypes: ticketTypes.map((tt) => ({
        id: tt.id,
        name: tt.name,
        priceCents: tt.priceCents,
        maxPerOrder: tt.maxPerOrder,
      })),
      availableSeatIds: [],
    };
  }

  const templates = await prisma.facilitySeatTemplate.findMany({
    where: { facilityId: input.facility.id },
    orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }],
  });

  const groupByTier = new Map<string, typeof templates>();
  for (const t of templates) {
    const list = groupByTier.get(t.ticketTypeKey) ?? [];
    list.push(t);
    groupByTier.set(t.ticketTypeKey, list);
  }

  const ticketTypes: { id: string; name: string; priceCents: number; maxPerOrder: number }[] = [];
  const ticketTypeIdByKey = new Map<string, string>();
  let idx = 1;
  for (const [key, seats] of groupByTier.entries()) {
    const tt = await prisma.ticketType.create({
      data: {
        showId: show.id,
        name: key,
        priceCents: seats[0]?.priceCents ?? 100000,
        totalQty: seats.length,
        maxPerOrder: seats[0]?.maxPerOrder ?? 10,
        sortOrder: idx,
      },
    });
    idx += 1;
    ticketTypes.push({
      id: tt.id,
      name: tt.name,
      priceCents: tt.priceCents,
      maxPerOrder: tt.maxPerOrder,
    });
    ticketTypeIdByKey.set(key, tt.id);
  }

  const seatsToCreate: Prisma.SeatCreateManyInput[] = templates.map((t) => ({
    showId: show.id,
    ticketTypeId: ticketTypeIdByKey.get(t.ticketTypeKey)!,
    rowLabel: t.rowLabel,
    seatNumber: t.seatNumber,
    seatCode: t.seatCode,
    x: t.x,
    y: t.y,
    status: "AVAILABLE",
  }));

  await prisma.seat.createMany({ data: seatsToCreate });
  await prisma.show.update({
    where: { id: show.id },
    data: {
      seatMapJson: seatsToCreate as unknown as Prisma.InputJsonValue,
    },
  });

  const createdSeats = await prisma.seat.findMany({
    where: { showId: show.id, status: "AVAILABLE" },
    select: { id: true },
  });

  return {
    id: show.id,
    eventTitle: input.eventTitle,
    startsAt: input.startsAt,
    seated: true,
    ticketTypes,
    availableSeatIds: createdSeats.map((s) => s.id),
  };
}

async function seedGoaCatalog(managers: { id: string }[]) {
  const facilitiesData = [
    {
      name: "Ravindra Bhavan, Margao",
      description: "Iconic South Goa cultural venue hosting tiatr, natak, and film festivals.",
      address: "Comba, Near KTC Bus Stand, Margao",
      city: "Margao",
      amenities: ["AC", "Parking", "Wheelchair Access", "Green Rooms"],
      seated: true,
    },
    {
      name: "Rajiv Kala Mandir, Ponda",
      description: "Popular auditorium in Ponda for Konkani and Marathi stage performances.",
      address: "Shantinagar Road, Ponda",
      city: "Ponda",
      amenities: ["AC", "Parking", "Sound Console"],
      seated: true,
    },
    {
      name: "Kala Academy Grand Auditorium",
      description: "Large cultural auditorium for theatre, concerts, and dance nights.",
      address: "Campal Promenade, Panaji",
      city: "Panaji",
      amenities: ["Valet Parking", "AC", "Wheelchair Access", "Cafe"],
      seated: true,
    },
    {
      name: "Baga Beach Open Air Arena",
      description: "Open-air beachfront venue for EDM and sunset festivals.",
      address: "Tito's Lane Extension, Baga",
      city: "Baga",
      amenities: ["Sea View", "Food Court", "Premium Lounge", "Parking"],
      seated: false,
    },
    {
      name: "Margao Convention Hall",
      description: "Multipurpose hall for stand-up comedy and business summits.",
      address: "Near Colva Road Junction, Margao",
      city: "Margao",
      amenities: ["Parking", "AC", "In-house Sound", "WiFi"],
      seated: true,
    },
    {
      name: "Candolim Music Yard",
      description: "Intimate live-music courtyard for indie and unplugged nights.",
      address: "Fort Aguada Road, Candolim",
      city: "Candolim",
      amenities: ["Bar", "Outdoor Seating", "Parking"],
      seated: false,
    },
    {
      name: "Anjuna Arts Loft",
      description: "Creative studio space for workshops, film screenings and talks.",
      address: "Flea Market Road, Anjuna",
      city: "Anjuna",
      amenities: ["Studio Lights", "Projector", "Coffee Bar", "WiFi"],
      seated: true,
    },
    {
      name: "Vasco Sports Dome",
      description: "Indoor arena for e-sports, sports screenings and competitions.",
      address: "Airport Link Road, Vasco da Gama",
      city: "Vasco da Gama",
      amenities: ["Snack Kiosks", "Parking", "Family Zone"],
      seated: true,
    },
    {
      name: "Menezes Braganza Hall",
      description: "Heritage hall in Panaji used for talks, literary events, and intimate performances.",
      address: "MG Road, Panaji",
      city: "Panaji",
      amenities: ["Central Location", "AC", "Projector", "WiFi"],
      seated: true,
    },
    {
      name: "Pai Tiatrist Hall",
      description: "Community venue known for tiatr productions and local cultural competitions.",
      address: "Near Holy Spirit Church, Margao",
      city: "Margao",
      amenities: ["Parking", "Backstage Rooms", "Sound System"],
      seated: true,
    },
    {
      name: "Caculo Mall Cine Studio",
      description: "Compact black-box cinema hall ideal for short films and indie screenings.",
      address: "St Inez, Panaji",
      city: "Panaji",
      amenities: ["Cafeteria", "Dolby Sound", "Parking"],
      seated: true,
    },
    {
      name: "Parvatibai Chowgule Open Grounds",
      description: "Open ground setup for festival stages, sports events and youth concerts.",
      address: "Edu Campus Road, Gogol, Margao",
      city: "Margao",
      amenities: ["Open Air", "Food Stalls", "Parking"],
      seated: false,
    },
  ];

  const facilities: CreatedFacility[] = [];
  for (let i = 0; i < facilitiesData.length; i += 1) {
    const manager = managers[i % managers.length];
    const created = await createFacilityWithTemplate({
      ...facilitiesData[i],
      managerId: manager.id,
    });
    facilities.push(created);
  }

  const eventsData: {
    title: string;
    category: EventCategory;
    durationMin: number;
    ageLimit: string;
    tags: string[];
    description: string;
  }[] = [
    {
      title: "Goa Sunset Electronic Carnival",
      category: "MUSIC",
      durationMin: 300,
      ageLimit: "18+",
      tags: ["edm", "sunset", "beach"],
      description: "Top DJs, beach visuals and immersive stage effects for a high-energy sunset carnival.",
    },
    {
      title: "Konkani Comedy Night Live",
      category: "COMEDY",
      durationMin: 110,
      ageLimit: "16+",
      tags: ["standup", "konkani", "live"],
      description: "Local and national comics perform bilingual sets rooted in Goa culture and everyday life.",
    },
    {
      title: "Fado & Jazz at Fontainhas",
      category: "MUSIC",
      durationMin: 140,
      ageLimit: "12+",
      tags: ["jazz", "fado", "acoustic"],
      description: "An intimate evening blending Portuguese-inspired fado with contemporary jazz ensembles.",
    },
    {
      title: "Goa Theatre Repertory: The Last Ferry",
      category: "THEATRE",
      durationMin: 135,
      ageLimit: "12+",
      tags: ["drama", "stage", "culture"],
      description: "A powerful stage production exploring migration, memory and coastal identity in modern Goa.",
    },
    {
      title: "Sukhachem Sogllem - Classic Tiatr Revival",
      category: "THEATRE",
      durationMin: 165,
      ageLimit: "12+",
      tags: ["tiatr", "konkani", "cultural"],
      description:
        "A revival of a beloved tiatr with live music, social satire, and old-Goa storytelling.",
    },
    {
      title: "Hanv Saiba Poltoddi Vetam - New Age Tiatr",
      category: "THEATRE",
      durationMin: 155,
      ageLimit: "12+",
      tags: ["tiatr", "goa", "drama"],
      description:
        "A contemporary tiatr production reflecting migration, family ties and modern village politics.",
    },
    {
      title: "Konkani Natak Mahotsav: Mog Ani Mhoji Maati",
      category: "THEATRE",
      durationMin: 145,
      ageLimit: "10+",
      tags: ["konkani", "natak", "festival"],
      description:
        "A festival showcase of leading Konkani natak groups with emotional and comic stage acts.",
    },
    {
      title: "Marathi Natak Sandhya: Vadalvat",
      category: "THEATRE",
      durationMin: 150,
      ageLimit: "10+",
      tags: ["marathi", "natak", "stage"],
      description:
        "A compelling Marathi natak about family conflict, social expectations, and resilience.",
    },
    {
      title: "Goemchi Chitrapat Ratri - Konkani Short Film Showcase",
      category: "OTHER",
      durationMin: 120,
      ageLimit: "12+",
      tags: ["konkani film", "short films", "indie"],
      description:
        "Curated screening of award-winning Konkani short films followed by a director interaction.",
    },
    {
      title: "Marathi Short Film Circuit - Goa Edition",
      category: "OTHER",
      durationMin: 130,
      ageLimit: "12+",
      tags: ["marathi film", "short films", "screening"],
      description:
        "A selection of acclaimed Marathi short films with Q&A on writing, cinematography and editing.",
    },
    {
      title: "Monsoon Mixology Masterclass",
      category: "WORKSHOP",
      durationMin: 120,
      ageLimit: "21+",
      tags: ["mixology", "workshop", "hospitality"],
      description: "Learn bar fundamentals, signature tropical cocktails and garnish techniques from top bartenders.",
    },
    {
      title: "Island Fitness Festival",
      category: "FESTIVAL",
      durationMin: 240,
      ageLimit: "All",
      tags: ["fitness", "wellness", "community"],
      description: "A full-day wellness festival with yoga, mobility sessions, nutrition talks and music.",
    },
    {
      title: "Goa Derby Watch Party",
      category: "SPORTS",
      durationMin: 180,
      ageLimit: "All",
      tags: ["football", "watchparty", "sportsbar"],
      description: "Big-screen football derby watch party with fan zones, trivia breaks and themed giveaways.",
    },
    {
      title: "Coastal Startup Mixer 2026",
      category: "WORKSHOP",
      durationMin: 210,
      ageLimit: "18+",
      tags: ["networking", "startups", "business"],
      description: "Founders, creators and operators connect through short talks and curated networking circles.",
    },
    {
      title: "Indie Film Premiere: Tides of Sal",
      category: "OTHER",
      durationMin: 150,
      ageLimit: "15+",
      tags: ["film", "premiere", "indie"],
      description: "Premiere screening followed by cast Q&A and an after-session panel on regional storytelling.",
    },
    {
      title: "Kids Magic & Science Show",
      category: "OTHER",
      durationMin: 90,
      ageLimit: "All",
      tags: ["family", "magic", "kids"],
      description: "Interactive family show mixing fun science demos, illusions and playful stage experiments.",
    },
    {
      title: "Latin Nights Goa",
      category: "MUSIC",
      durationMin: 180,
      ageLimit: "18+",
      tags: ["salsa", "latin", "dance"],
      description: "Live Latin rhythms, social dance sessions and beginner-friendly pre-event dance tutorials.",
    },
    {
      title: "Mandovi Marathon Expo",
      category: "SPORTS",
      durationMin: 300,
      ageLimit: "All",
      tags: ["marathon", "expo", "sports"],
      description: "Race bib pickup, sports brands, recovery booths and talks from endurance athletes and coaches.",
    },
  ];

  const allShows: CreatedShow[] = [];
  for (let i = 0; i < eventsData.length; i += 1) {
    const eventData = eventsData[i];
    const facility = facilities[i % facilities.length];
    const managerId = facility.managerId;
    const slug = slugify(`${eventData.title}-${facility.city}`);

    const event = await prisma.event.create({
      data: {
        title: eventData.title,
        slug,
        description: eventData.description,
        category: eventData.category,
        city: facility.city,
        posterUrl: `https://images.unsplash.com/photo-${1459749411175 + i}?w=1200`,
        durationMin: eventData.durationMin,
        ageLimit: eventData.ageLimit,
        tags: eventData.tags,
        status: "PUBLISHED",
        managerId,
      },
    });

    const showCount = randInt(2, 3);
    for (let s = 0; s < showCount; s += 1) {
      const dayOffset = 3 + i * 2 + s * 4;
      const hour = pick([16, 18, 19, 20, 21]);
      const show = await createShowWithInventory({
        eventId: event.id,
        eventTitle: event.title,
        facility,
        startsAt: futureDate(dayOffset, hour, pick([0, 15, 30])),
        durationMin: eventData.durationMin,
      });
      allShows.push(show);
    }
  }

  return { facilities, allShows };
}

async function seedBookings(input: {
  attendees: { id: string; name: string; email: string; phone: string | null }[];
  shows: CreatedShow[];
}) {
  let bookingCounter = 1001;

  const futureShows = input.shows
    .filter((s) => s.startsAt > new Date())
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  for (const show of futureShows.slice(0, 28)) {
    const bookingVolume = randInt(6, 16);
    for (let i = 0; i < bookingVolume; i += 1) {
      const attendee = pick(input.attendees);
      const code = `GOA-${bookingCounter}`;
      bookingCounter += 1;

      if (show.seated) {
        const seatsAvailable = await prisma.seat.findMany({
          where: {
            showId: show.id,
            status: "AVAILABLE",
          },
          select: { id: true, ticketTypeId: true, seatCode: true },
          take: 8,
        });
        if (seatsAvailable.length === 0) continue;

        const seatsToBookCount = randInt(1, Math.min(4, seatsAvailable.length));
        const seatsToBook = seatsAvailable.slice(0, seatsToBookCount);

        const grouped = new Map<string, number>();
        for (const seat of seatsToBook) {
          grouped.set(seat.ticketTypeId, (grouped.get(seat.ticketTypeId) ?? 0) + 1);
        }

        const tts = await prisma.ticketType.findMany({
          where: { id: { in: [...grouped.keys()] } },
        });
        const ttById = new Map(tts.map((tt) => [tt.id, tt]));
        const totalCents = [...grouped.entries()].reduce((sum, [ticketTypeId, qty]) => {
          const tt = ttById.get(ticketTypeId);
          return sum + (tt?.priceCents ?? 0) * qty;
        }, 0);

        const booking = await prisma.booking.create({
          data: {
            bookingCode: code,
            showId: show.id,
            userId: attendee.id,
            guestName: attendee.name,
            guestEmail: attendee.email,
            guestPhone: attendee.phone,
            totalCents,
            status: "CONFIRMED",
            paymentStatus: "SUCCEEDED",
            confirmedAt: new Date(),
            holdExpiresAt: null,
            items: {
              create: [...grouped.entries()].map(([ticketTypeId, quantity]) => ({
                ticketTypeId,
                quantity,
                unitPriceCents: ttById.get(ticketTypeId)?.priceCents ?? 0,
              })),
            },
          },
        });

        await prisma.seat.updateMany({
          where: { id: { in: seatsToBook.map((s) => s.id) } },
          data: {
            status: "BOOKED",
            bookingId: booking.id,
            heldUntil: null,
          },
        });

        for (const [ticketTypeId, qty] of grouped.entries()) {
          await prisma.ticketType.update({
            where: { id: ticketTypeId },
            data: { soldQty: { increment: qty } },
          });
        }
      } else {
        const tt = pick(show.ticketTypes);
        const quantity = randInt(1, Math.min(4, tt.maxPerOrder));
        await prisma.booking.create({
          data: {
            bookingCode: code,
            showId: show.id,
            userId: attendee.id,
            guestName: attendee.name,
            guestEmail: attendee.email,
            guestPhone: attendee.phone,
            totalCents: tt.priceCents * quantity,
            status: "CONFIRMED",
            paymentStatus: "SUCCEEDED",
            confirmedAt: new Date(),
            holdExpiresAt: null,
            items: {
              create: [
                {
                  ticketTypeId: tt.id,
                  quantity,
                  unitPriceCents: tt.priceCents,
                },
              ],
            },
          },
        });

        await prisma.ticketType.update({
          where: { id: tt.id },
          data: { soldQty: { increment: quantity } },
        });
      }
    }
  }

  // Add a few pending (held) bookings to simulate live traffic.
  for (const show of futureShows.slice(0, 10)) {
    const attendee = pick(input.attendees);
    const code = `GOA-${bookingCounter}`;
    bookingCounter += 1;
    const holdExpiresAt = new Date(Date.now() + randInt(5, 15) * 60 * 1000);

    if (show.seated) {
      const seat = await prisma.seat.findFirst({
        where: { showId: show.id, status: "AVAILABLE" },
        select: { id: true, ticketTypeId: true },
      });
      if (!seat) continue;
      const tt = await prisma.ticketType.findUniqueOrThrow({ where: { id: seat.ticketTypeId } });
      const booking = await prisma.booking.create({
        data: {
          bookingCode: code,
          showId: show.id,
          userId: attendee.id,
          guestName: attendee.name,
          guestEmail: attendee.email,
          guestPhone: attendee.phone,
          totalCents: tt.priceCents,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          holdExpiresAt,
          items: {
            create: [{ ticketTypeId: tt.id, quantity: 1, unitPriceCents: tt.priceCents }],
          },
        },
      });
      await prisma.seat.update({
        where: { id: seat.id },
        data: { status: "HELD", bookingId: booking.id, heldUntil: holdExpiresAt },
      });
      await prisma.ticketType.update({
        where: { id: tt.id },
        data: { heldQty: { increment: 1 } },
      });
    } else {
      const tt = pick(show.ticketTypes);
      const qty = 1;
      await prisma.booking.create({
        data: {
          bookingCode: code,
          showId: show.id,
          userId: attendee.id,
          guestName: attendee.name,
          guestEmail: attendee.email,
          guestPhone: attendee.phone,
          totalCents: tt.priceCents * qty,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          holdExpiresAt,
          items: {
            create: [{ ticketTypeId: tt.id, quantity: qty, unitPriceCents: tt.priceCents }],
          },
        },
      });
      await prisma.ticketType.update({
        where: { id: tt.id },
        data: { heldQty: { increment: qty } },
      });
    }
  }
}

async function main() {
  await resetDatabase();
  const passwordHash = await bcrypt.hash("password123", 12);
  const { admin, managers, attendees } = await seedUsers(passwordHash);
  const { facilities, allShows } = await seedGoaCatalog(managers);
  await seedBookings({
    attendees,
    shows: allShows,
  });

  const [facilityCount, eventCount, showCount, bookingCount] = await Promise.all([
    prisma.facility.count(),
    prisma.event.count(),
    prisma.show.count(),
    prisma.booking.count(),
  ]);

  console.log("Goa demo seed complete");
  console.log(`Facilities: ${facilityCount}, Events: ${eventCount}, Shows: ${showCount}, Bookings: ${bookingCount}`);
  console.log("Demo logins:");
  console.log("  Admin:    admin@localbms.com / password123");
  console.log("  Manager:  manager@localbms.com / password123");
  console.log("  Attendee: user@localbms.com / password123");
  console.log("Admin ID:", admin.id);
  console.log(`Primary Goa facilities seeded: ${facilities.map((f) => f.name).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
