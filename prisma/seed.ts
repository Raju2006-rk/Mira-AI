import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  // Demo learner
  const demo = await prisma.user.upsert({
    where: { email: "demo@speakmate.example" },
    update: {},
    create: {
      email: "demo@speakmate.example",
      name: "Raj",
      passwordHash: password,
      role: "USER",
      profile: {
        create: {
          level: "ELEMENTARY",
          goals: ["speaking_confidence", "interview"],
          onboarded: true,
          confidenceScore: 60,
        },
      },
      settings: { create: {} },
      streak: { create: { current: 2, longest: 5, lastActiveDay: new Date() } },
    },
  });

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@speakmate.example" },
    update: {},
    create: {
      email: "admin@speakmate.example",
      name: "Admin",
      passwordHash: password,
      role: "ADMIN",
      profile: { create: { onboarded: true } },
      settings: { create: {} },
      streak: { create: {} },
    },
  });

  // A couple of seed mistakes for the demo user's Mistake Book
  await prisma.userMistake.createMany({
    data: [
      {
        userId: demo.id,
        original: "He go to college.",
        corrected: "He goes to college.",
        category: "GRAMMAR",
        explanation: 'With he / she / it, the present verb takes an "-s".',
      },
      {
        userId: demo.id,
        original: "I am having doubt regarding this.",
        corrected: "I have a question about this.",
        category: "VOCABULARY",
        explanation:
          'We usually say "I have a question" rather than "having a doubt".',
      },
    ],
    skipDuplicates: true,
  });

  // Sample vocabulary
  await prisma.vocabulary.upsert({
    where: { word: "helpful" },
    update: {},
    create: {
      word: "helpful",
      meaning: "willing to help others; giving useful assistance",
      example: "She is always helpful when a classmate is struggling.",
      synonyms: ["supportive", "obliging", "considerate"],
      usageNote: "Use for people or things that make a task easier.",
    },
  });

  // A few plan/lesson entries (30-day plan starter)
  const lessons = [
    {
      day: 1,
      slug: "self-introduction",
      title: "Self Introduction",
      concept: "Introduce yourself confidently.",
    },
    {
      day: 2,
      slug: "daily-routine",
      title: "Daily Routine",
      concept: "Talk about your day using the present tense.",
    },
    {
      day: 3,
      slug: "asking-questions",
      title: "Asking Questions",
      concept: "Form clear questions.",
    },
    {
      day: 4,
      slug: "past-experiences",
      title: "Past Experiences",
      concept: "Use the past tense to tell stories.",
    },
    {
      day: 5,
      slug: "shopping-conversation",
      title: "Shopping Conversation",
      concept: "Handle a real shopping situation.",
    },
  ];
  for (const l of lessons) {
    await prisma.lesson.upsert({
      where: { slug: l.slug },
      update: {},
      create: { ...l, description: l.concept },
    });
  }

  console.log("Seed complete. Logins:");
  console.log("  Learner: demo@speakmate.example / password123");
  console.log("  Admin:   admin@speakmate.example / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
