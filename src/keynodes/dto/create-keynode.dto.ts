import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export const KEYNODE_CATEGORIES = [
  // People & Characters
  'person', // Real people (e.g., Albert Einstein, Marie Curie)
  'fictional_character', // Characters from fiction (e.g., Sherlock Holmes)
  'mythological_figure', // Gods, heroes from mythology (e.g., Zeus, Thor)

  // Places & Geography
  'geographical_location', // Countries, cities, regions (e.g., Paris, Amazon River)
  'geological_form', // Mountains, volcanoes, caves (e.g., Mount Everest)
  'architectural_structure', // Buildings, monuments (e.g., Eiffel Tower, Colosseum)

  // Science & Nature
  'chemical', // Chemical compounds, elements (e.g., H2O, Carbon)
  'astronomical_entity', // Stars, planets, galaxies (e.g., Mars, Milky Way)
  'biological_species', // Animals, plants, organisms (e.g., Lion, Oak tree)
  'medical_condition', // Diseases, symptoms (e.g., Diabetes, Influenza)
  'scientific_theory', // Theories, laws (e.g., Theory of Relativity)

  // Time & Events
  'date_time', // Specific dates, eras (e.g., 1969, Renaissance)
  'historical_event', // Wars, revolutions (e.g., World War II)

  // Culture & Arts
  'artwork', // Paintings, sculptures (e.g., Mona Lisa)
  'literary_work', // Books, poems (e.g., Hamlet, The Odyssey)
  'musical_work', // Songs, symphonies (e.g., Beethoven's 9th)
  'film_or_show', // Movies, TV series (e.g., Star Wars)

  // Organizations & Institutions
  'organization', // Companies, NGOs (e.g., NASA, Red Cross)
  'educational_institution', // Universities, schools (e.g., MIT, Oxford)
  'political_entity', // Governments, parties (e.g., United Nations)

  // Technology & Objects
  'technology', // Inventions, devices (e.g., Internet, Telescope)
  'food_or_cuisine', // Dishes, ingredients (e.g., Pizza, Saffron)
  'language', // Languages, dialects (e.g., Latin, Mandarin)
  'sport_or_game', // Sports, games (e.g., Chess, Football)

  // Abstract & Other
  'abstract_concept', // Ideas, philosophies (e.g., Democracy, Love)
  'mathematical_concept', // Formulas, theorems (e.g., Pythagorean theorem)
  'others', // Catch-all for uncategorized items
] as const;

export type KeynodeCategory = (typeof KEYNODE_CATEGORIES)[number];

export class CreateKeynodeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(KEYNODE_CATEGORIES)
  category: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
