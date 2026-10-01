import type { Entry } from '../game/protocol'
import { fileUrl } from '../game/wikipedia'

const cat = (label: string, article: string, file: string): Entry => ({
  label,
  imageUrl: fileUrl('commons.wikimedia.org', file),
  sourceUrl: `https://en.wikipedia.org/wiki/${article}`,
})

/** Lead images of the Wikipedia articles, hosted on Wikimedia Commons. */
export const bigCatsEntries = {
  lion: cat(
    'Lion',
    'Lion',
    '020_The_lion_king_Snyggve_in_the_Serengeti_National_Park_Photo_by_Giles_Laurent.jpg',
  ),
  tiger: cat('Tiger', 'Tiger', 'Bengal_tiger_(Panthera_tigris_tigris)_female_3_crop.jpg'),
  serval: cat('Serval', 'Serval', 'Servalcropped.png'),
  caracal: cat(
    'Caracal',
    'Caracal',
    'Caracal_on_the_road,_early_morning_in_Kgalagadi_(36173878220)_(cropped).jpg',
  ),
  puma: cat('Puma', 'Cougar', 'Mountain_Lion_in_Glacier_National_Park.jpg'),
  leopard: cat('Leopard', 'Leopard', 'African_leopard_male_(cropped).jpg'),
  cheetah: cat('Cheetah', 'Cheetah', 'Male_cheetah_facing_left_in_South_Africa.jpg'),
  jaguar: cat('Jaguar', 'Jaguar', 'Standing_jaguar.jpg'),
  snowLeopard: cat('Snow leopard', 'Snow_leopard', 'Irbis4.JPG'),
  ocelot: cat(
    'Ocelot',
    'Ocelot',
    '016_Ocelot_in_Encontro_das_Águas_State_Park_Photo_by_Giles_Laurent.jpg',
  ),
} satisfies Record<string, Entry>

/** The five cats written in round 1 of the example. */
export const roundOneCats = [
  bigCatsEntries.lion,
  bigCatsEntries.tiger,
  bigCatsEntries.serval,
  bigCatsEntries.caracal,
  bigCatsEntries.puma,
]
