import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Commonsense ontologic keynode hierarchy
// Structure: { name, category, children: [...] }
interface KeynodeNode {
  name: string;
  category: string;
  children?: KeynodeNode[];
}

const keynodeHierarchy: KeynodeNode[] = [
  // Abstract Concepts
  {
    name: 'Knowledge',
    category: 'abstract_concept',
    children: [
      {
        name: 'Science',
        category: 'abstract_concept',
        children: [
          { name: 'Natural Sciences', category: 'abstract_concept' },
          { name: 'Social Sciences', category: 'abstract_concept' },
          { name: 'Formal Sciences', category: 'abstract_concept' },
          { name: 'Applied Sciences', category: 'abstract_concept' },
        ],
      },
      {
        name: 'Philosophy',
        category: 'abstract_concept',
        children: [
          { name: 'Ethics', category: 'abstract_concept' },
          { name: 'Metaphysics', category: 'abstract_concept' },
          { name: 'Epistemology', category: 'abstract_concept' },
          { name: 'Logic', category: 'abstract_concept' },
        ],
      },
      {
        name: 'Arts',
        category: 'abstract_concept',
        children: [
          { name: 'Visual Arts', category: 'abstract_concept' },
          { name: 'Performing Arts', category: 'abstract_concept' },
          { name: 'Literature', category: 'abstract_concept' },
          { name: 'Music', category: 'abstract_concept' },
        ],
      },
    ],
  },
  {
    name: 'Time',
    category: 'abstract_concept',
    children: [
      { name: 'Past', category: 'abstract_concept' },
      { name: 'Present', category: 'abstract_concept' },
      { name: 'Future', category: 'abstract_concept' },
    ],
  },
  {
    name: 'Space',
    category: 'abstract_concept',
    children: [
      { name: 'Dimension', category: 'abstract_concept' },
      { name: 'Distance', category: 'abstract_concept' },
      { name: 'Direction', category: 'abstract_concept' },
    ],
  },

  // Geographical Locations
  {
    name: 'Earth',
    category: 'geographical_location',
    children: [
      {
        name: 'Continents',
        category: 'geographical_location',
        children: [
          { name: 'Africa', category: 'geographical_location' },
          { name: 'Antarctica', category: 'geographical_location' },
          { name: 'Asia', category: 'geographical_location' },
          { name: 'Europe', category: 'geographical_location' },
          { name: 'North America', category: 'geographical_location' },
          { name: 'Oceania', category: 'geographical_location' },
          { name: 'South America', category: 'geographical_location' },
        ],
      },
      {
        name: 'Oceans',
        category: 'geographical_location',
        children: [
          { name: 'Pacific Ocean', category: 'geographical_location' },
          { name: 'Atlantic Ocean', category: 'geographical_location' },
          { name: 'Indian Ocean', category: 'geographical_location' },
          { name: 'Southern Ocean', category: 'geographical_location' },
          { name: 'Arctic Ocean', category: 'geographical_location' },
        ],
      },
    ],
  },

  // Geological Forms
  {
    name: 'Landforms',
    category: 'geological_form',
    children: [
      {
        name: 'Mountains',
        category: 'geological_form',
        children: [
          { name: 'Volcano', category: 'geological_form' },
          { name: 'Mountain Range', category: 'geological_form' },
          { name: 'Peak', category: 'geological_form' },
        ],
      },
      {
        name: 'Plains',
        category: 'geological_form',
        children: [
          { name: 'Prairie', category: 'geological_form' },
          { name: 'Steppe', category: 'geological_form' },
          { name: 'Savanna', category: 'geological_form' },
        ],
      },
      {
        name: 'Water Bodies',
        category: 'geological_form',
        children: [
          { name: 'River', category: 'geological_form' },
          { name: 'Lake', category: 'geological_form' },
          { name: 'Waterfall', category: 'geological_form' },
        ],
      },
      {
        name: 'Coastal Features',
        category: 'geological_form',
        children: [
          { name: 'Beach', category: 'geological_form' },
          { name: 'Cliff', category: 'geological_form' },
          { name: 'Peninsula', category: 'geological_form' },
          { name: 'Island', category: 'geological_form' },
        ],
      },
    ],
  },

  // Biological Species
  {
    name: 'Living Organisms',
    category: 'biological_species',
    children: [
      {
        name: 'Animals',
        category: 'biological_species',
        children: [
          {
            name: 'Mammals',
            category: 'biological_species',
            children: [
              { name: 'Primates', category: 'biological_species' },
              { name: 'Carnivores', category: 'biological_species' },
              { name: 'Herbivores', category: 'biological_species' },
            ],
          },
          { name: 'Birds', category: 'biological_species' },
          { name: 'Reptiles', category: 'biological_species' },
          { name: 'Amphibians', category: 'biological_species' },
          { name: 'Fish', category: 'biological_species' },
          { name: 'Insects', category: 'biological_species' },
        ],
      },
      {
        name: 'Plants',
        category: 'biological_species',
        children: [
          { name: 'Trees', category: 'biological_species' },
          { name: 'Flowers', category: 'biological_species' },
          { name: 'Grasses', category: 'biological_species' },
          { name: 'Ferns', category: 'biological_species' },
        ],
      },
      {
        name: 'Microorganisms',
        category: 'biological_species',
        children: [
          { name: 'Bacteria', category: 'biological_species' },
          { name: 'Viruses', category: 'biological_species' },
          { name: 'Fungi', category: 'biological_species' },
        ],
      },
    ],
  },

  // Astronomical Entities
  {
    name: 'Universe',
    category: 'astronomical_entity',
    children: [
      {
        name: 'Galaxies',
        category: 'astronomical_entity',
        children: [
          { name: 'Milky Way', category: 'astronomical_entity' },
          { name: 'Andromeda', category: 'astronomical_entity' },
        ],
      },
      {
        name: 'Solar System',
        category: 'astronomical_entity',
        children: [
          { name: 'Sun', category: 'astronomical_entity' },
          {
            name: 'Planets',
            category: 'astronomical_entity',
            children: [
              { name: 'Mercury', category: 'astronomical_entity' },
              { name: 'Venus', category: 'astronomical_entity' },
              { name: 'Mars', category: 'astronomical_entity' },
              { name: 'Jupiter', category: 'astronomical_entity' },
              { name: 'Saturn', category: 'astronomical_entity' },
              { name: 'Uranus', category: 'astronomical_entity' },
              { name: 'Neptune', category: 'astronomical_entity' },
            ],
          },
          { name: 'Moons', category: 'astronomical_entity' },
          { name: 'Asteroids', category: 'astronomical_entity' },
          { name: 'Comets', category: 'astronomical_entity' },
        ],
      },
      {
        name: 'Stars',
        category: 'astronomical_entity',
        children: [
          { name: 'Red Giant', category: 'astronomical_entity' },
          { name: 'White Dwarf', category: 'astronomical_entity' },
          { name: 'Neutron Star', category: 'astronomical_entity' },
          { name: 'Black Hole', category: 'astronomical_entity' },
        ],
      },
    ],
  },

  // Chemical Elements and Compounds
  {
    name: 'Matter',
    category: 'chemical',
    children: [
      {
        name: 'Elements',
        category: 'chemical',
        children: [
          { name: 'Hydrogen', category: 'chemical' },
          { name: 'Helium', category: 'chemical' },
          { name: 'Carbon', category: 'chemical' },
          { name: 'Nitrogen', category: 'chemical' },
          { name: 'Oxygen', category: 'chemical' },
          { name: 'Iron', category: 'chemical' },
          { name: 'Gold', category: 'chemical' },
          { name: 'Silver', category: 'chemical' },
        ],
      },
      {
        name: 'Compounds',
        category: 'chemical',
        children: [
          { name: 'Water (H2O)', category: 'chemical' },
          { name: 'Carbon Dioxide (CO2)', category: 'chemical' },
          { name: 'Salt (NaCl)', category: 'chemical' },
        ],
      },
      {
        name: 'States of Matter',
        category: 'chemical',
        children: [
          { name: 'Solid', category: 'chemical' },
          { name: 'Liquid', category: 'chemical' },
          { name: 'Gas', category: 'chemical' },
          { name: 'Plasma', category: 'chemical' },
        ],
      },
    ],
  },

  // Historical Events
  {
    name: 'Human History',
    category: 'historical_event',
    children: [
      {
        name: 'Ancient History',
        category: 'historical_event',
        children: [
          { name: 'Ancient Egypt', category: 'historical_event' },
          { name: 'Ancient Greece', category: 'historical_event' },
          { name: 'Roman Empire', category: 'historical_event' },
        ],
      },
      {
        name: 'Medieval Period',
        category: 'historical_event',
        children: [
          { name: 'Crusades', category: 'historical_event' },
          { name: 'Black Death', category: 'historical_event' },
          { name: 'Renaissance', category: 'historical_event' },
        ],
      },
      {
        name: 'Modern History',
        category: 'historical_event',
        children: [
          { name: 'Industrial Revolution', category: 'historical_event' },
          { name: 'World War I', category: 'historical_event' },
          { name: 'World War II', category: 'historical_event' },
          { name: 'Cold War', category: 'historical_event' },
          { name: 'Digital Revolution', category: 'historical_event' },
        ],
      },
    ],
  },

  // Date and Time Periods
  {
    name: 'Time Periods',
    category: 'date_time',
    children: [
      {
        name: 'Geological Eras',
        category: 'date_time',
        children: [
          { name: 'Paleozoic Era', category: 'date_time' },
          { name: 'Mesozoic Era', category: 'date_time' },
          { name: 'Cenozoic Era', category: 'date_time' },
        ],
      },
      {
        name: 'Human Eras',
        category: 'date_time',
        children: [
          { name: 'Stone Age', category: 'date_time' },
          { name: 'Bronze Age', category: 'date_time' },
          { name: 'Iron Age', category: 'date_time' },
          { name: 'Information Age', category: 'date_time' },
        ],
      },
    ],
  },

  // Technology
  {
    name: 'Technology',
    category: 'technology',
    children: [
      {
        name: 'Computing',
        category: 'technology',
        children: [
          { name: 'Hardware', category: 'technology' },
          { name: 'Software', category: 'technology' },
          { name: 'Internet', category: 'technology' },
          { name: 'Artificial Intelligence', category: 'technology' },
        ],
      },
      {
        name: 'Transportation',
        category: 'technology',
        children: [
          { name: 'Wheel', category: 'technology' },
          { name: 'Automobile', category: 'technology' },
          { name: 'Aircraft', category: 'technology' },
          { name: 'Spacecraft', category: 'technology' },
        ],
      },
      {
        name: 'Communication',
        category: 'technology',
        children: [
          { name: 'Printing Press', category: 'technology' },
          { name: 'Telegraph', category: 'technology' },
          { name: 'Telephone', category: 'technology' },
          { name: 'Radio', category: 'technology' },
          { name: 'Television', category: 'technology' },
        ],
      },
    ],
  },

  // Mathematical Concepts
  {
    name: 'Mathematics',
    category: 'mathematical_concept',
    children: [
      {
        name: 'Numbers',
        category: 'mathematical_concept',
        children: [
          { name: 'Natural Numbers', category: 'mathematical_concept' },
          { name: 'Integers', category: 'mathematical_concept' },
          { name: 'Rational Numbers', category: 'mathematical_concept' },
          { name: 'Real Numbers', category: 'mathematical_concept' },
          { name: 'Complex Numbers', category: 'mathematical_concept' },
        ],
      },
      {
        name: 'Geometry',
        category: 'mathematical_concept',
        children: [
          { name: 'Point', category: 'mathematical_concept' },
          { name: 'Line', category: 'mathematical_concept' },
          { name: 'Plane', category: 'mathematical_concept' },
          { name: 'Circle', category: 'mathematical_concept' },
          { name: 'Triangle', category: 'mathematical_concept' },
        ],
      },
      {
        name: 'Algebra',
        category: 'mathematical_concept',
      },
      {
        name: 'Calculus',
        category: 'mathematical_concept',
      },
      {
        name: 'Statistics',
        category: 'mathematical_concept',
      },
    ],
  },

  // Scientific Theories
  {
    name: 'Scientific Theories',
    category: 'scientific_theory',
    children: [
      { name: 'Theory of Evolution', category: 'scientific_theory' },
      { name: 'Theory of Relativity', category: 'scientific_theory' },
      { name: 'Quantum Theory', category: 'scientific_theory' },
      { name: 'Big Bang Theory', category: 'scientific_theory' },
      { name: 'Germ Theory of Disease', category: 'scientific_theory' },
      { name: 'Plate Tectonics', category: 'scientific_theory' },
    ],
  },

  // Languages
  {
    name: 'Human Languages',
    category: 'language',
    children: [
      {
        name: 'Indo-European Languages',
        category: 'language',
        children: [
          { name: 'English', category: 'language' },
          { name: 'Spanish', category: 'language' },
          { name: 'French', category: 'language' },
          { name: 'German', category: 'language' },
          { name: 'Hindi', category: 'language' },
        ],
      },
      {
        name: 'Sino-Tibetan Languages',
        category: 'language',
        children: [
          { name: 'Mandarin Chinese', category: 'language' },
          { name: 'Cantonese', category: 'language' },
        ],
      },
      {
        name: 'Semitic Languages',
        category: 'language',
        children: [
          { name: 'Arabic', category: 'language' },
          { name: 'Hebrew', category: 'language' },
        ],
      },
      { name: 'Japanese', category: 'language' },
      { name: 'Korean', category: 'language' },
    ],
  },

  // Organizations
  {
    name: 'International Organizations',
    category: 'organization',
    children: [
      { name: 'United Nations', category: 'organization' },
      { name: 'World Health Organization', category: 'organization' },
      { name: 'World Bank', category: 'organization' },
      { name: 'International Monetary Fund', category: 'organization' },
      { name: 'Red Cross', category: 'organization' },
    ],
  },

  // Sports and Games
  {
    name: 'Sports',
    category: 'sport_or_game',
    children: [
      {
        name: 'Team Sports',
        category: 'sport_or_game',
        children: [
          { name: 'Football (Soccer)', category: 'sport_or_game' },
          { name: 'Basketball', category: 'sport_or_game' },
          { name: 'Baseball', category: 'sport_or_game' },
          { name: 'Cricket', category: 'sport_or_game' },
          { name: 'Rugby', category: 'sport_or_game' },
        ],
      },
      {
        name: 'Individual Sports',
        category: 'sport_or_game',
        children: [
          { name: 'Tennis', category: 'sport_or_game' },
          { name: 'Golf', category: 'sport_or_game' },
          { name: 'Swimming', category: 'sport_or_game' },
          { name: 'Athletics', category: 'sport_or_game' },
        ],
      },
      {
        name: 'Board Games',
        category: 'sport_or_game',
        children: [
          { name: 'Chess', category: 'sport_or_game' },
          { name: 'Go', category: 'sport_or_game' },
          { name: 'Backgammon', category: 'sport_or_game' },
        ],
      },
    ],
  },

  // Food and Cuisine
  {
    name: 'Food',
    category: 'food_or_cuisine',
    children: [
      {
        name: 'Cuisines',
        category: 'food_or_cuisine',
        children: [
          { name: 'Italian Cuisine', category: 'food_or_cuisine' },
          { name: 'Chinese Cuisine', category: 'food_or_cuisine' },
          { name: 'Indian Cuisine', category: 'food_or_cuisine' },
          { name: 'French Cuisine', category: 'food_or_cuisine' },
          { name: 'Japanese Cuisine', category: 'food_or_cuisine' },
        ],
      },
      {
        name: 'Food Groups',
        category: 'food_or_cuisine',
        children: [
          { name: 'Fruits', category: 'food_or_cuisine' },
          { name: 'Vegetables', category: 'food_or_cuisine' },
          { name: 'Grains', category: 'food_or_cuisine' },
          { name: 'Proteins', category: 'food_or_cuisine' },
          { name: 'Dairy', category: 'food_or_cuisine' },
        ],
      },
    ],
  },

  // Medical Conditions
  {
    name: 'Health and Medicine',
    category: 'medical_condition',
    children: [
      {
        name: 'Infectious Diseases',
        category: 'medical_condition',
        children: [
          { name: 'Influenza', category: 'medical_condition' },
          { name: 'Tuberculosis', category: 'medical_condition' },
          { name: 'Malaria', category: 'medical_condition' },
        ],
      },
      {
        name: 'Chronic Diseases',
        category: 'medical_condition',
        children: [
          { name: 'Diabetes', category: 'medical_condition' },
          { name: 'Cardiovascular Disease', category: 'medical_condition' },
          { name: 'Cancer', category: 'medical_condition' },
        ],
      },
      {
        name: 'Mental Health',
        category: 'medical_condition',
        children: [
          { name: 'Depression', category: 'medical_condition' },
          { name: 'Anxiety', category: 'medical_condition' },
        ],
      },
    ],
  },
];

async function createKeynodeWithChildren(
  node: KeynodeNode,
  parentId: string | null = null,
): Promise<void> {
  // Check if keynode already exists
  const existing = await prisma.keynode.findUnique({
    where: { name: node.name },
  });

  let keynodeId: string;

  if (existing) {
    console.log(`  Skipping existing keynode: ${node.name}`);
    keynodeId = existing.id;
  } else {
    const keynode = await prisma.keynode.create({
      data: {
        name: node.name,
        category: node.category,
        parentId: parentId,
        status: 'verified',
      },
    });
    console.log(`  Created keynode: ${node.name} (${node.category})`);
    keynodeId = keynode.id;
  }

  // Process children recursively
  if (node.children) {
    for (const child of node.children) {
      await createKeynodeWithChildren(child, keynodeId);
    }
  }
}

async function main() {
  console.log('Starting keynode hierarchy seed...\n');

  let createdCount = 0;
  let skippedCount = 0;

  for (const rootNode of keynodeHierarchy) {
    console.log(`\nProcessing root: ${rootNode.name}`);
    await createKeynodeWithChildren(rootNode);
  }

  // Count final stats
  const totalKeynodes = await prisma.keynode.count();
  console.log(`\n✅ Seed completed!`);
  console.log(`Total keynodes in database: ${totalKeynodes}`);
}

main()
  .catch((e) => {
    console.error('Error seeding keynodes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
