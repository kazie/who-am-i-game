import type { Entry } from './protocol'
import { fileUrl } from './wikipedia'

/**
 * A ready-made set of cards, so a group can skip the writing round. Only the id travels
 * over the bridge: every tab has the same packs, and the relay deals from its own copy.
 */
export interface Pack {
  id: string
  theme: string
  entries: readonly Entry[]
}

/** A Wikipedia article and its lead picture, hosted on Wikimedia Commons. */
const wiki = (label: string, article: string, file: string): Entry => ({
  label,
  imageUrl: fileUrl('commons.wikimedia.org', file),
  sourceUrl: `https://en.wikipedia.org/wiki/${article}`,
})

/** Also the cats of the example game (src/example/bigCats.ts). */
export const bigCatsEntries = {
  lion: wiki(
    'Lion',
    'Lion',
    '020_The_lion_king_Snyggve_in_the_Serengeti_National_Park_Photo_by_Giles_Laurent.jpg',
  ),
  tiger: wiki('Tiger', 'Tiger', 'Bengal_tiger_(Panthera_tigris_tigris)_female_3_crop.jpg'),
  serval: wiki('Serval', 'Serval', 'Servalcropped.png'),
  caracal: wiki(
    'Caracal',
    'Caracal',
    'Caracal_on_the_road,_early_morning_in_Kgalagadi_(36173878220)_(cropped).jpg',
  ),
  puma: wiki('Puma', 'Cougar', 'Mountain_Lion_in_Glacier_National_Park.jpg'),
  leopard: wiki('Leopard', 'Leopard', 'African_leopard_male_(cropped).jpg'),
  cheetah: wiki('Cheetah', 'Cheetah', 'Male_cheetah_facing_left_in_South_Africa.jpg'),
  jaguar: wiki('Jaguar', 'Jaguar', 'Standing_jaguar.jpg'),
  snowLeopard: wiki('Snow leopard', 'Snow_leopard', 'Irbis4.JPG'),
  ocelot: wiki(
    'Ocelot',
    'Ocelot',
    '016_Ocelot_in_Encontro_das_Águas_State_Park_Photo_by_Giles_Laurent.jpg',
  ),
} satisfies Record<string, Entry>

export const PACKS: readonly Pack[] = [
  {
    id: 'big-cats',
    theme: 'Big cats',
    entries: [
      ...Object.values(bigCatsEntries),
      wiki('Eurasian lynx', 'Eurasian_lynx', 'Lynx_Nationalpark_Bayerischer_Wald_01.jpg'),
      wiki('Clouded leopard', 'Clouded_leopard', 'Neofelis_nebulosa,_Clouded_leopard.jpg'),
    ],
  },
  {
    id: 'animals',
    theme: 'Animals',
    entries: [
      wiki(
        'Elephant',
        'African_bush_elephant',
        '178_Male_African_bush_elephant_in_Etosha_National_Park_Photo_by_Giles_Laurent.jpg',
      ),
      wiki('Giraffe', 'Giraffe', 'Giraffe_Mikumi_National_Park.jpg'),
      wiki(
        'Emperor penguin',
        'Emperor_penguin',
        'Aptenodytes_forsteri_-Snow_Hill_Island,_Antarctica_-adults_and_juvenile-8.jpg',
      ),
      wiki('Kangaroo', 'Red_kangaroo', 'Red_kangaroo_-_melbourne_zoo.jpg'),
      wiki('Octopus', 'Octopus', 'Octopus2.jpg'),
      wiki('Giant panda', 'Giant_panda', 'Grosser_Panda.JPG'),
      wiki('Polar bear', 'Polar_bear', 'Polar_Bear_-_Alaska_(cropped).jpg'),
      wiki('Dolphin', 'Common_bottlenose_dolphin', 'Tursiops_truncatus_01-cropped.jpg'),
      wiki('Zebra', 'Plains_zebra', 'Equus_quagga_burchellii_-_Etosha,_2014.jpg'),
      wiki('Koala', 'Koala', 'Koala_climbing_tree.jpg'),
      wiki(
        'Platypus',
        'Platypus',
        'Duck-billed_platypus_(Ornithorhynchus_anatinus)_Scottsdale.jpg',
      ),
      wiki('Flamingo', 'American_flamingo', 'American_Flamingo_JG.jpg'),
    ],
  },
  {
    id: 'scientists',
    theme: 'Famous scientists',
    entries: [
      wiki('Marie Curie', 'Marie_Curie', 'Marie_Curie_c._1920s.jpg'),
      wiki('Albert Einstein', 'Albert_Einstein', 'Albert_Einstein_Head_cleaned.jpg'),
      wiki('Isaac Newton', 'Isaac_Newton', 'Portrait_of_Sir_Isaac_Newton,_1689_(brightened).jpg'),
      wiki('Charles Darwin', 'Charles_Darwin', 'Charles_Darwin_seated_crop.jpg'),
      wiki(
        'Ada Lovelace',
        'Ada_Lovelace',
        'Ada_Lovelace_daguerreotype_by_Antoine_Claudet_1843_-_cropped.png',
      ),
      wiki('Galileo Galilei', 'Galileo_Galilei', 'Galileo_Galilei_(1564-1642)_RMG_BHC2700.tiff'),
      wiki('Nikola Tesla', 'Nikola_Tesla', 'Tesla_circa_1890.jpeg'),
      wiki('Stephen Hawking', 'Stephen_Hawking', 'Stephen_Hawking.StarChild.jpg'),
      wiki('Rosalind Franklin', 'Rosalind_Franklin', 'Rosalind_Franklin_(retouched).jpg'),
      wiki('Alan Turing', 'Alan_Turing', 'Alan_turing_header.jpg'),
      wiki(
        'Jane Goodall',
        'Jane_Goodall',
        "Deputy_Secretary_Higginbottom_Poses_for_a_Photo_With_Dr._Jane_Goodall_and_the_State_Department's_Global_Health_Diplomacy_Director_Jordan_in_Washington_(22365513310)_(2)_(cropped_2).jpg",
      ),
      wiki('Louis Pasteur', 'Louis_Pasteur', 'Louis_Pasteur,_foto_av_Paul_Nadar,_Crisco_edit.jpg'),
    ],
  },
  {
    id: 'landmarks',
    theme: 'Landmarks',
    entries: [
      wiki('Eiffel Tower', 'Eiffel_Tower', 'Tour_Eiffel_Wikimedia_Commons_(cropped).jpg'),
      wiki(
        'Statue of Liberty',
        'Statue_of_Liberty',
        'Front_view_of_Statue_of_Liberty_(cropped).jpg',
      ),
      wiki(
        'Great Wall of China',
        'Great_Wall_of_China',
        'The_Great_Wall_of_China_at_Jinshanling-edit.jpg',
      ),
      wiki('Taj Mahal', 'Taj_Mahal', 'Taj_Mahal_(Edited).jpeg'),
      wiki('Colosseum', 'Colosseum', 'Colosseo_2020.jpg'),
      wiki('Sydney Opera House', 'Sydney_Opera_House', 'Sydney_Opera_House_2026.jpg'),
      wiki('Machu Picchu', 'Machu_Picchu', 'Machu_Picchu,_2023_(012).jpg'),
      wiki(
        'Big Ben',
        'Big_Ben',
        'Elizabeth_Tower_and_the_north_front_of_the_Palace_of_Westminster,_London.jpg',
      ),
      wiki(
        'Christ the Redeemer',
        'Christ_the_Redeemer_(statue)',
        'Christ_the_Redeemer_-_Cristo_Redentor.jpg',
      ),
      wiki(
        'Great Pyramid of Giza',
        'Great_Pyramid_of_Giza',
        'Great_Pyramid_of_Giza_-_Pyramid_of_Khufu.jpg',
      ),
      wiki(
        'Golden Gate Bridge',
        'Golden_Gate_Bridge',
        'Golden_Gate_Bridge_as_seen_from_Battery_East.jpg',
      ),
      wiki('Leaning Tower of Pisa', 'Leaning_Tower_of_Pisa', 'Italy_-_Pisa_-_Leaning_Tower.jpg'),
    ],
  },
  {
    id: 'paintings',
    theme: 'Famous paintings',
    entries: [
      wiki('Mona Lisa', 'Mona_Lisa', 'Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg'),
      wiki(
        'The Starry Night',
        'The_Starry_Night',
        'Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
      ),
      wiki(
        'The Scream',
        'The_Scream',
        'Edvard_Munch,_1893,_The_Scream,_oil,_tempera_and_pastel_on_cardboard,_91_x_73_cm,_National_Gallery_of_Norway.jpg',
      ),
      wiki(
        'Girl with a Pearl Earring',
        'Girl_with_a_Pearl_Earring',
        '1665_Girl_with_a_Pearl_Earring.jpg',
      ),
      wiki(
        'The Birth of Venus',
        'The_Birth_of_Venus',
        'Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg',
      ),
      wiki(
        'The Last Supper',
        'The_Last_Supper_(Leonardo)',
        'The_Last_Supper_-_Leonardo_Da_Vinci_-_High_Resolution_32x16.jpg',
      ),
      wiki('The Night Watch', 'The_Night_Watch', 'La_ronda_de_noche,_por_Rembrandt_van_Rijn.jpg'),
      wiki(
        'The Great Wave off Kanagawa',
        'The_Great_Wave_off_Kanagawa',
        'Tsunami_by_hokusai_19th_century.jpg',
      ),
      wiki('American Gothic', 'American_Gothic', 'Grant_Wood_-_American_Gothic_(1930).jpg'),
      wiki(
        'The Creation of Adam',
        'The_Creation_of_Adam',
        'Michelangelo_-_Creation_of_Adam_(cropped).jpg',
      ),
      wiki(
        'Las Meninas',
        'Las_Meninas',
        'Las_Meninas,_by_Diego_Velázquez,_from_Prado_in_Google_Earth.jpg',
      ),
      wiki(
        'Liberty Leading the People',
        'Liberty_Leading_the_People',
        'La_Liberté_guidant_le_peuple_-_Eugène_Delacroix_-_Musée_du_Louvre_Peintures_RF_129_-_après_restauration_2024.jpg',
      ),
    ],
  },
]

export const packById = (id: string | undefined) => PACKS.find((p) => p.id === id)
