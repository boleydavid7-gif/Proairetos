/*
 * Plant types Phyton knows: common houseplants, herbs, vegetables and garden plants, each with the care that
 * the horticultural guides agree on and whether the ASPCA lists it as toxic to cats or dogs. The watering days
 * are a first guess for spring and summer; the plant's own record takes over once there is one.
 */

export type Kind = 'Houseplant' | 'Succulent or cactus' | 'Herb' | 'Vegetable or fruit' | 'Garden';

/** How dry the soil gets before watering. */
export type Dryness = 'moist' | 'top' | 'half' | 'dry';

/** Whether the ASPCA list counts it toxic: to both, to cats, to dogs, to neither. Not listed: undefined. */
export type Toxic = 'both' | 'cats' | 'dogs' | 'none';

export type Light = 'low' | 'indirect' | 'some-sun' | 'sun';

export type Species = {
  key: string;
  name: string;
  latin: string;
  /** Other names people use, for finding it. */
  also?: string[];
  kind: Kind;
  light: Light;
  dry: Dryness;
  /** Days between waterings to begin with, in spring and summer. */
  water: number;
  /** Likes humid air (a bathroom, a tray of pebbles and water). */
  humid?: boolean;
  /** Weeks between feeds in spring and summer; 0 for rarely. */
  feed: number;
  toxic?: Toxic;
  note?: string;
};

export const CARE_SOURCE =
  'Care: Royal Horticultural Society plant guides; Missouri Botanical Garden Plant Finder; university extension services (Clemson HGIC, UMN Extension). Toxicity: ASPCA Animal Poison Control Center, Toxic and Non-Toxic Plant List.';

export const LIGHT_TEXT: Record<Light, string> = {
  low: 'Low to bright light, out of direct sun',
  indirect: 'Bright light, out of direct sun',
  'some-sun': 'Bright light with some direct sun',
  sun: 'Full sun, six hours or more',
};

export const DRY_TEXT: Record<Dryness, string> = {
  moist: 'Keep the soil lightly moist; water when the surface feels dry',
  top: 'Water when the top 2 to 3 cm (1 in) of soil is dry',
  half: 'Water when the top half of the pot is dry',
  dry: 'Water when the soil is dry right through',
};

export const TOXIC_TEXT: Record<Toxic, string> = {
  both: 'Toxic to cats and dogs',
  cats: 'Toxic to cats',
  dogs: 'Toxic to dogs',
  none: 'Not toxic to cats or dogs',
};

export const NOT_LISTED = 'Not on the ASPCA list; ask a vet if a pet eats it';

const s = (key: string, name: string, latin: string, kind: Kind, light: Light, dry: Dryness, water: number, feed: number, toxic?: Toxic, extra: Partial<Species> = {}): Species => ({ key, name, latin, kind, light, dry, water, feed, toxic, ...extra });

export const SPECIES: readonly Species[] = [
  // Houseplants
  s('pothos', 'Pothos', 'Epipremnum aureum', 'Houseplant', 'low', 'top', 7, 4, 'both', { also: ['Devil’s ivy', 'Golden pothos'] }),
  s('monstera', 'Monstera', 'Monstera deliciosa', 'Houseplant', 'indirect', 'top', 7, 4, 'both', { also: ['Swiss cheese plant', 'Split-leaf philodendron'] }),
  s('heartleaf-philodendron', 'Heartleaf philodendron', 'Philodendron hederaceum', 'Houseplant', 'low', 'top', 7, 4, 'both', { also: ['Philodendron'] }),
  s('snake-plant', 'Snake plant', 'Dracaena trifasciata', 'Houseplant', 'low', 'dry', 14, 8, 'both', { also: ['Sansevieria', 'Mother-in-law’s tongue'] }),
  s('zz-plant', 'ZZ plant', 'Zamioculcas zamiifolia', 'Houseplant', 'low', 'dry', 14, 8, undefined, { also: ['Zanzibar gem'] }),
  s('spider-plant', 'Spider plant', 'Chlorophytum comosum', 'Houseplant', 'indirect', 'top', 7, 4, 'none'),
  s('peace-lily', 'Peace lily', 'Spathiphyllum wallisii', 'Houseplant', 'low', 'moist', 5, 6, 'both', { note: 'Droops when thirsty and lifts again within hours of watering.' }),
  s('fiddle-leaf-fig', 'Fiddle-leaf fig', 'Ficus lyrata', 'Houseplant', 'some-sun', 'half', 9, 4, 'both', { note: 'Dislikes being moved; turn it a little each month for even growth.' }),
  s('rubber-plant', 'Rubber plant', 'Ficus elastica', 'Houseplant', 'indirect', 'half', 9, 4, 'both', { also: ['Rubber tree'] }),
  s('weeping-fig', 'Weeping fig', 'Ficus benjamina', 'Houseplant', 'indirect', 'top', 7, 4, 'both', { also: ['Ficus'], note: 'Drops leaves after a move or a draft, then settles.' }),
  s('chinese-evergreen', 'Chinese evergreen', 'Aglaonema commutatum', 'Houseplant', 'low', 'top', 8, 6, 'both', { also: ['Aglaonema'] }),
  s('dumb-cane', 'Dumb cane', 'Dieffenbachia seguine', 'Houseplant', 'indirect', 'top', 7, 4, 'both', { also: ['Dieffenbachia'] }),
  s('corn-plant', 'Corn plant', 'Dracaena fragrans', 'Houseplant', 'indirect', 'half', 10, 6, 'both', { also: ['Dracaena'] }),
  s('dragon-tree', 'Dragon tree', 'Dracaena marginata', 'Houseplant', 'indirect', 'half', 10, 6, 'both', { also: ['Madagascar dragon tree'] }),
  s('lucky-bamboo', 'Lucky bamboo', 'Dracaena sanderiana', 'Houseplant', 'indirect', 'moist', 7, 8, 'both', { note: 'In water: top up weekly and change the water every two weeks.' }),
  s('parlor-palm', 'Parlor palm', 'Chamaedorea elegans', 'Houseplant', 'low', 'top', 7, 6, 'none', { also: ['Parlour palm'] }),
  s('areca-palm', 'Areca palm', 'Dypsis lutescens', 'Houseplant', 'indirect', 'top', 7, 6, 'none', { also: ['Butterfly palm'] }),
  s('ponytail-palm', 'Ponytail palm', 'Beaucarnea recurvata', 'Houseplant', 'some-sun', 'dry', 14, 8, 'none'),
  s('sago-palm', 'Sago palm', 'Cycas revoluta', 'Houseplant', 'some-sun', 'dry', 14, 8, 'both', { note: 'Every part is highly poisonous to pets, the seeds most of all.' }),
  s('money-tree', 'Money tree', 'Pachira aquatica', 'Houseplant', 'indirect', 'top', 8, 4, 'none'),
  s('chinese-money-plant', 'Chinese money plant', 'Pilea peperomioides', 'Houseplant', 'indirect', 'top', 7, 4, undefined, { also: ['Pilea', 'Pancake plant'] }),
  s('peperomia', 'Peperomia', 'Peperomia obtusifolia', 'Houseplant', 'indirect', 'half', 10, 6, 'none', { also: ['Baby rubber plant'] }),
  s('watermelon-peperomia', 'Watermelon peperomia', 'Peperomia argyreia', 'Houseplant', 'indirect', 'half', 9, 6, 'none'),
  s('boston-fern', 'Boston fern', 'Nephrolepis exaltata', 'Houseplant', 'indirect', 'moist', 3, 6, 'none', { humid: true }),
  s('maidenhair-fern', 'Maidenhair fern', 'Adiantum raddianum', 'Houseplant', 'indirect', 'moist', 3, 6, 'none', { humid: true, note: 'Never let it dry out completely.' }),
  s('birds-nest-fern', 'Bird’s nest fern', 'Asplenium nidus', 'Houseplant', 'low', 'moist', 5, 6, 'none', { humid: true, note: 'Water the soil, not the center of the rosette.' }),
  s('asparagus-fern', 'Asparagus fern', 'Asparagus aethiopicus', 'Houseplant', 'indirect', 'moist', 5, 4, 'both'),
  s('prayer-plant', 'Prayer plant', 'Maranta leuconeura', 'Houseplant', 'indirect', 'moist', 5, 4, 'none', { humid: true, note: 'Rain or filtered water keeps the leaf edges from browning.' }),
  s('calathea', 'Calathea', 'Goeppertia', 'Houseplant', 'indirect', 'moist', 5, 4, 'none', { also: ['Rattlesnake plant', 'Peacock plant', 'Zebra plant'], humid: true, note: 'Rain or filtered water keeps the leaf edges from browning.' }),
  s('nerve-plant', 'Nerve plant', 'Fittonia albivenis', 'Houseplant', 'indirect', 'moist', 3, 4, 'none', { also: ['Fittonia'], humid: true, note: 'Faints dramatically when dry and recovers after watering.' }),
  s('polka-dot-plant', 'Polka dot plant', 'Hypoestes phyllostachya', 'Houseplant', 'indirect', 'moist', 4, 4, 'none'),
  s('cast-iron-plant', 'Cast iron plant', 'Aspidistra elatior', 'Houseplant', 'low', 'top', 10, 8, 'none'),
  s('english-ivy', 'English ivy', 'Hedera helix', 'Houseplant', 'indirect', 'top', 7, 4, 'both', { also: ['Ivy'] }),
  s('hoya', 'Hoya', 'Hoya carnosa', 'Houseplant', 'some-sun', 'half', 10, 6, 'none', { also: ['Wax plant'], note: 'Leave the old flower stalks on; it flowers from them again.' }),
  s('tradescantia', 'Tradescantia', 'Tradescantia zebrina', 'Houseplant', 'indirect', 'top', 7, 4, 'both', { also: ['Inch plant', 'Wandering dude', 'Spiderwort'] }),
  s('string-of-pearls', 'String of pearls', 'Curio rowleyanus', 'Succulent or cactus', 'some-sun', 'dry', 12, 8, undefined, { also: ['Senecio rowleyanus'] }),
  s('croton', 'Croton', 'Codiaeum variegatum', 'Houseplant', 'some-sun', 'top', 6, 4, 'both'),
  s('anthurium', 'Anthurium', 'Anthurium andraeanum', 'Houseplant', 'indirect', 'top', 7, 4, 'both', { also: ['Flamingo flower'], humid: true }),
  s('alocasia', 'Alocasia', 'Alocasia amazonica', 'Houseplant', 'indirect', 'top', 6, 4, 'both', { also: ['Elephant ear', 'African mask'], humid: true, note: 'May rest in winter and drop leaves; water less until it grows again.' }),
  s('bird-of-paradise', 'Bird of paradise', 'Strelitzia reginae', 'Houseplant', 'some-sun', 'top', 7, 4, 'both'),
  s('begonia', 'Begonia', 'Begonia', 'Houseplant', 'indirect', 'top', 6, 4, 'both', { note: 'Water the soil, not the leaves.' }),
  s('african-violet', 'African violet', 'Streptocarpus ionanthus', 'Houseplant', 'indirect', 'top', 6, 3, 'none', { also: ['Saintpaulia'], note: 'Water from below, with water at room temperature; cold water spots the leaves.' }),
  s('moth-orchid', 'Moth orchid', 'Phalaenopsis', 'Houseplant', 'indirect', 'half', 7, 2, 'none', { also: ['Orchid', 'Phalaenopsis'], note: 'Water when the roots turn silvery; drain well and never leave it standing in water.' }),
  s('bromeliad', 'Bromeliad', 'Guzmania', 'Houseplant', 'indirect', 'top', 7, 8, 'none', { also: ['Guzmania', 'Vriesea'] }),
  s('air-plant', 'Air plant', 'Tillandsia', 'Houseplant', 'indirect', 'dry', 7, 4, 'none', { also: ['Tillandsia'], note: 'Soak for 20 minutes, then shake off and dry upside down.' }),
  s('venus-flytrap', 'Venus flytrap', 'Dionaea muscipula', 'Houseplant', 'sun', 'moist', 3, 0, 'none', { note: 'Rain or distilled water only, standing in a shallow tray; no feeding with fertiliser.' }),
  s('poinsettia', 'Poinsettia', 'Euphorbia pulcherrima', 'Houseplant', 'indirect', 'top', 6, 4, 'both'),
  s('cyclamen', 'Cyclamen', 'Cyclamen persicum', 'Houseplant', 'indirect', 'top', 6, 3, 'both', { note: 'Water from below, keeping water off the crown; likes a cool room.' }),
  s('amaryllis', 'Amaryllis', 'Hippeastrum', 'Houseplant', 'some-sun', 'top', 7, 3, 'both'),
  s('lily', 'Lily', 'Lilium', 'Garden', 'sun', 'top', 4, 4, 'cats', { note: 'Every part, the pollen and the vase water too, can harm cats.' }),
  // Succulents and cacti
  s('aloe', 'Aloe vera', 'Aloe vera', 'Succulent or cactus', 'some-sun', 'dry', 14, 8, 'both', { also: ['Aloe'] }),
  s('jade', 'Jade plant', 'Crassula ovata', 'Succulent or cactus', 'some-sun', 'dry', 14, 8, 'both', { also: ['Money plant'] }),
  s('echeveria', 'Echeveria', 'Echeveria', 'Succulent or cactus', 'sun', 'dry', 12, 8, 'none'),
  s('haworthia', 'Haworthia', 'Haworthiopsis attenuata', 'Succulent or cactus', 'indirect', 'dry', 14, 8, 'none', { also: ['Zebra plant'] }),
  s('kalanchoe', 'Kalanchoe', 'Kalanchoe blossfeldiana', 'Succulent or cactus', 'some-sun', 'dry', 10, 6, 'both'),
  s('christmas-cactus', 'Christmas cactus', 'Schlumbergera', 'Succulent or cactus', 'indirect', 'top', 7, 4, 'none', { also: ['Thanksgiving cactus', 'Holiday cactus'] }),
  s('cactus', 'Cactus', 'Cactaceae', 'Succulent or cactus', 'sun', 'dry', 18, 8, undefined, { note: 'In winter, hardly any water at all.' }),
  s('yucca', 'Yucca', 'Yucca gigantea', 'Houseplant', 'sun', 'dry', 14, 8, 'both', { also: ['Spineless yucca', 'Yucca elephantipes'] }),
  s('schefflera', 'Umbrella plant', 'Schefflera arboricola', 'Houseplant', 'indirect', 'top', 7, 6, 'both', { also: ['Schefflera', 'Dwarf umbrella tree'] }),
  s('lipstick-plant', 'Lipstick plant', 'Aeschynanthus', 'Houseplant', 'indirect', 'top', 7, 4, 'none', { humid: true }),
  s('string-of-hearts', 'String of hearts', 'Ceropegia woodii', 'Houseplant', 'indirect', 'dry', 14, 8, 'none', { also: ['Rosary vine'] }),
  s('burros-tail', 'Burro’s tail', 'Sedum morganianum', 'Succulent or cactus', 'some-sun', 'dry', 14, 8, 'none', { also: ['Donkey tail'], note: 'The leaves drop easily; move it as little as possible.' }),
  s('swedish-ivy', 'Swedish ivy', 'Plectranthus verticillatus', 'Houseplant', 'indirect', 'top', 6, 4, 'none'),
  s('rabbits-foot-fern', 'Rabbit’s foot fern', 'Davallia fejeensis', 'Houseplant', 'indirect', 'top', 6, 6, 'none', { humid: true }),
  s('staghorn-fern', 'Staghorn fern', 'Platycerium bifurcatum', 'Houseplant', 'indirect', 'top', 7, 6, 'none', { humid: true, note: 'Often grown on a board; soak the root ball rather than watering from above.' }),
  s('kentia-palm', 'Kentia palm', 'Howea forsteriana', 'Houseplant', 'indirect', 'top', 10, 8, 'none', { also: ['Sentry palm'] }),
  s('majesty-palm', 'Majesty palm', 'Ravenea rivularis', 'Houseplant', 'indirect', 'moist', 5, 6, 'none', { humid: true }),
  s('bamboo-palm', 'Bamboo palm', 'Chamaedorea seifrizii', 'Houseplant', 'indirect', 'top', 7, 6, 'none', { also: ['Reed palm'] }),
  s('oxalis', 'Oxalis', 'Oxalis triangularis', 'Houseplant', 'indirect', 'top', 7, 4, 'both', { also: ['False shamrock', 'Purple shamrock'], note: 'It may go dormant and lose its leaves; water less until it regrows.' }),
  s('calla-lily', 'Calla lily', 'Zantedeschia', 'Houseplant', 'some-sun', 'moist', 4, 4, 'both'),
  s('coleus', 'Coleus', 'Coleus scutellarioides', 'Houseplant', 'some-sun', 'moist', 3, 3, 'both', { also: ['Painted nettle', 'Plectranthus scutellarioides'] }),
  s('hens-and-chicks', 'Hens and chicks', 'Sempervivum', 'Succulent or cactus', 'sun', 'dry', 14, 0, undefined, { also: ['Houseleek'] }),
  // Herbs
  s('basil', 'Basil', 'Ocimum basilicum', 'Herb', 'sun', 'moist', 3, 4, 'none', { note: 'Pinch out the tips to keep it bushy; water in the morning.' }),
  s('rosemary', 'Rosemary', 'Salvia rosmarinus', 'Herb', 'sun', 'half', 8, 8, 'none'),
  s('thyme', 'Thyme', 'Thymus vulgaris', 'Herb', 'sun', 'half', 8, 0, 'none'),
  s('mint', 'Mint', 'Mentha', 'Herb', 'some-sun', 'moist', 3, 6, 'both', { note: 'Spreads fast; a pot of its own keeps it in place.' }),
  s('parsley', 'Parsley', 'Petroselinum crispum', 'Herb', 'some-sun', 'moist', 4, 6, 'both'),
  s('chives', 'Chives', 'Allium schoenoprasum', 'Herb', 'sun', 'top', 4, 6, 'both'),
  s('coriander', 'Cilantro', 'Coriandrum sativum', 'Herb', 'some-sun', 'moist', 3, 0, undefined, { also: ['Coriander'] }),
  s('oregano', 'Oregano', 'Origanum vulgare', 'Herb', 'sun', 'half', 7, 0, undefined),
  s('sage', 'Sage', 'Salvia officinalis', 'Herb', 'sun', 'half', 8, 0, undefined),
  s('lavender', 'Lavender', 'Lavandula angustifolia', 'Herb', 'sun', 'dry', 10, 0, 'both'),
  s('dill', 'Dill', 'Anethum graveolens', 'Herb', 'sun', 'top', 3, 0, undefined),
  s('bay-laurel', 'Bay laurel', 'Laurus nobilis', 'Herb', 'some-sun', 'half', 8, 8, 'both', { also: ['Bay leaf', 'Bay tree'] }),
  s('lemongrass', 'Lemongrass', 'Cymbopogon citratus', 'Herb', 'sun', 'moist', 3, 4, 'both'),
  s('lemon-balm', 'Lemon balm', 'Melissa officinalis', 'Herb', 'some-sun', 'moist', 4, 6, undefined),
  s('tarragon', 'Tarragon', 'Artemisia dracunculus', 'Herb', 'sun', 'half', 7, 0, undefined),
  s('marjoram', 'Marjoram', 'Origanum majorana', 'Herb', 'sun', 'half', 7, 0, undefined, { also: ['Sweet marjoram'] }),
  s('chamomile', 'Chamomile', 'Matricaria chamomilla', 'Herb', 'sun', 'top', 4, 0, 'both', { also: ['German chamomile'] }),
  s('fennel', 'Fennel', 'Foeniculum vulgare', 'Herb', 'sun', 'top', 4, 0, undefined, { also: ['Bronze fennel'] }),
  s('lovage', 'Lovage', 'Levisticum officinale', 'Herb', 'sun', 'moist', 4, 4, undefined),
  s('borage', 'Borage', 'Borago officinalis', 'Herb', 'sun', 'top', 4, 0, undefined),
  s('catnip', 'Catnip', 'Nepeta cataria', 'Herb', 'sun', 'top', 5, 0, undefined, { also: ['Catmint'] }),
  s('chervil', 'Chervil', 'Anthriscus cerefolium', 'Herb', 'some-sun', 'moist', 3, 0, undefined),
  s('sorrel', 'Sorrel', 'Rumex acetosa', 'Herb', 'some-sun', 'moist', 3, 4, undefined),
  s('lemon-verbena', 'Lemon verbena', 'Aloysia citrodora', 'Herb', 'sun', 'top', 4, 4, undefined),
  s('hyssop', 'Hyssop', 'Hyssopus officinalis', 'Herb', 'sun', 'half', 8, 0, undefined),
  s('summer-savory', 'Summer savory', 'Satureja hortensis', 'Herb', 'sun', 'half', 6, 0, undefined, { also: ['Savory'] }),
  s('cuban-oregano', 'Cuban oregano', 'Plectranthus amboinicus', 'Herb', 'sun', 'dry', 7, 6, 'both', { also: ['Mexican mint', 'Indian borage'] }),
  s('garlic-chives', 'Garlic chives', 'Allium tuberosum', 'Herb', 'sun', 'top', 4, 6, 'both', { also: ['Chinese chives'] }),
  s('stevia', 'Stevia', 'Stevia rebaudiana', 'Herb', 'sun', 'moist', 3, 4, undefined),
  s('holy-basil', 'Holy basil', 'Ocimum tenuiflorum', 'Herb', 'sun', 'moist', 3, 4, undefined, { also: ['Tulsi'] }),
  // Vegetables and fruit
  s('tomato', 'Tomato', 'Solanum lycopersicum', 'Vegetable or fruit', 'sun', 'moist', 2, 2, 'both', { note: 'Steady watering helps prevent split fruit and blossom end rot; pots in summer may need it daily.' }),
  s('chilli', 'Chili pepper', 'Capsicum annuum', 'Vegetable or fruit', 'sun', 'top', 3, 2, undefined, { also: ['Chilli pepper', 'Pepper', 'Sweet pepper'] }),
  s('strawberry', 'Strawberry', 'Fragaria × ananassa', 'Vegetable or fruit', 'sun', 'moist', 3, 2, 'none'),
  s('lettuce', 'Lettuce', 'Lactuca sativa', 'Vegetable or fruit', 'some-sun', 'moist', 2, 0, undefined),
  s('lemon', 'Lemon tree', 'Citrus × limon', 'Vegetable or fruit', 'sun', 'top', 7, 4, 'both', { also: ['Citrus'] }),
  s('olive', 'Olive tree', 'Olea europaea', 'Vegetable or fruit', 'sun', 'half', 10, 6, undefined),
  s('potato', 'Potato', 'Solanum tuberosum', 'Vegetable or fruit', 'sun', 'moist', 3, 2, 'both', { note: 'The leaves and green tubers are the toxic parts.' }),
  s('cucumber', 'Cucumber', 'Cucumis sativus', 'Vegetable or fruit', 'sun', 'moist', 2, 2, undefined),
  s('zucchini', 'Zucchini', 'Cucurbita pepo', 'Vegetable or fruit', 'sun', 'moist', 3, 2, undefined, { also: ['Courgette', 'Summer squash'] }),
  s('carrot', 'Carrot', 'Daucus carota', 'Vegetable or fruit', 'sun', 'top', 3, 0, undefined),
  s('peas', 'Peas', 'Pisum sativum', 'Vegetable or fruit', 'sun', 'top', 3, 0, undefined, { also: ['Garden pea'] }),
  s('kale', 'Kale', 'Brassica oleracea var. sabellica', 'Vegetable or fruit', 'sun', 'top', 3, 4, undefined),
  s('spinach', 'Spinach', 'Spinacia oleracea', 'Vegetable or fruit', 'some-sun', 'moist', 3, 4, undefined),
  s('blueberry', 'Blueberry', 'Vaccinium corymbosum', 'Vegetable or fruit', 'sun', 'moist', 3, 6, undefined, { note: 'Likes acid soil; rain water suits it.' }),
  // Garden
  s('rose', 'Rose', 'Rosa', 'Garden', 'sun', 'top', 5, 3, 'none', { note: 'Water deeply at the base, not over the leaves.' }),
  s('hydrangea', 'Hydrangea', 'Hydrangea macrophylla', 'Garden', 'some-sun', 'moist', 3, 6, 'both'),
  s('geranium', 'Geranium', 'Pelargonium', 'Garden', 'sun', 'half', 5, 3, 'both', { also: ['Pelargonium'] }),
  s('petunia', 'Petunia', 'Petunia × atkinsiana', 'Garden', 'sun', 'top', 3, 2, 'none'),
  s('fuchsia', 'Fuchsia', 'Fuchsia', 'Garden', 'some-sun', 'moist', 3, 2, 'none'),
  s('hosta', 'Hosta', 'Hosta', 'Garden', 'low', 'moist', 4, 6, 'both'),
  s('sunflower', 'Sunflower', 'Helianthus annuus', 'Garden', 'sun', 'top', 4, 4, 'none'),
  s('tulip', 'Tulip', 'Tulipa', 'Garden', 'sun', 'top', 7, 0, 'both'),
  s('daffodil', 'Daffodil', 'Narcissus', 'Garden', 'sun', 'top', 7, 0, 'both'),
  s('azalea', 'Azalea', 'Rhododendron', 'Garden', 'some-sun', 'moist', 4, 6, 'both', { also: ['Rhododendron'], note: 'Rain water suits it; it likes acid soil.' }),
  s('gardenia', 'Gardenia', 'Gardenia jasminoides', 'Garden', 'some-sun', 'moist', 4, 3, 'both'),
  s('camellia', 'Camellia', 'Camellia japonica', 'Garden', 'some-sun', 'top', 6, 6, 'none'),
  s('peony', 'Peony', 'Paeonia', 'Garden', 'sun', 'top', 7, 0, 'both'),
  s('clematis', 'Clematis', 'Clematis', 'Garden', 'some-sun', 'moist', 5, 4, 'both'),
  s('foxglove', 'Foxglove', 'Digitalis purpurea', 'Garden', 'some-sun', 'moist', 5, 0, 'both'),
  s('dahlia', 'Dahlia', 'Dahlia', 'Garden', 'sun', 'top', 4, 3, 'both'),
  s('lantana', 'Lantana', 'Lantana camara', 'Garden', 'sun', 'half', 5, 4, 'both'),
  s('boxwood', 'Boxwood', 'Buxus sempervirens', 'Garden', 'some-sun', 'top', 7, 8, 'both', { also: ['Box'] }),
  s('marigold', 'Marigold', 'Tagetes', 'Garden', 'sun', 'top', 4, 4, 'both'),
  s('zinnia', 'Zinnia', 'Zinnia elegans', 'Garden', 'sun', 'top', 4, 4, 'none'),
  s('impatiens', 'Impatiens', 'Impatiens walleriana', 'Garden', 'low', 'moist', 3, 3, 'none', { also: ['Busy Lizzie'] }),
  s('gerbera', 'Gerbera daisy', 'Gerbera jamesonii', 'Garden', 'sun', 'top', 4, 3, 'none', { also: ['Gerbera'] }),
  s('pansy', 'Pansy', 'Viola × wittrockiana', 'Garden', 'some-sun', 'moist', 3, 3, undefined, { also: ['Viola'] }),
  s('hibiscus', 'Hibiscus', 'Hibiscus rosa-sinensis', 'Garden', 'sun', 'top', 4, 2, undefined),
  s('bougainvillea', 'Bougainvillea', 'Bougainvillea glabra', 'Garden', 'sun', 'half', 6, 4, undefined),
  s('daylily', 'Daylily', 'Hemerocallis', 'Garden', 'sun', 'top', 5, 4, 'cats', { also: ['Day lily'], note: 'Every part of a daylily can seriously harm a cat.' }),
  s('iris', 'Iris', 'Iris', 'Garden', 'sun', 'top', 7, 4, 'both', { also: ['Flag iris'] }),
  s('hyacinth', 'Hyacinth', 'Hyacinthus orientalis', 'Garden', 'sun', 'top', 7, 0, 'both'),
  s('lily-of-the-valley', 'Lily of the valley', 'Convallaria majalis', 'Garden', 'low', 'moist', 5, 0, 'both'),
  s('bleeding-heart', 'Bleeding heart', 'Lamprocapnos spectabilis', 'Garden', 'low', 'moist', 4, 4, 'both', { also: ['Dicentra'] }),
  s('delphinium', 'Delphinium', 'Delphinium', 'Garden', 'sun', 'moist', 4, 4, 'both', { also: ['Larkspur'] }),
  s('snapdragon', 'Snapdragon', 'Antirrhinum majus', 'Garden', 'sun', 'top', 4, 3, 'none'),
  s('cosmos', 'Cosmos', 'Cosmos bipinnatus', 'Garden', 'sun', 'top', 5, 0, 'none'),
  s('nasturtium', 'Nasturtium', 'Tropaeolum majus', 'Garden', 'sun', 'top', 4, 0, 'none', { note: 'Does best a little lean; too much feed gives leaves and few flowers.' }),
  s('sweet-pea', 'Sweet pea', 'Lathyrus odoratus', 'Garden', 'sun', 'moist', 3, 3, 'both', { note: 'The seeds and pods are the toxic part.' }),
  s('morning-glory', 'Morning glory', 'Ipomoea', 'Garden', 'sun', 'top', 4, 0, 'both'),
  s('wisteria', 'Wisteria', 'Wisteria sinensis', 'Garden', 'sun', 'top', 7, 0, 'both'),
  s('jasmine', 'Jasmine', 'Jasminum officinale', 'Garden', 'sun', 'top', 5, 4, 'none', { also: ['Common jasmine'] }),
  s('chrysanthemum', 'Chrysanthemum', 'Chrysanthemum × morifolium', 'Garden', 'sun', 'moist', 3, 3, 'both', { also: ['Mum', 'Garden mum'] }),
  s('shasta-daisy', 'Shasta daisy', 'Leucanthemum × superbum', 'Garden', 'sun', 'top', 5, 3, 'both', { also: ['Daisy'] }),
  s('oleander', 'Oleander', 'Nerium oleander', 'Garden', 'sun', 'half', 6, 4, 'both', { note: 'Every part is highly toxic, including the smoke and the water from a vase.' }),
  s('magnolia', 'Magnolia', 'Magnolia grandiflora', 'Garden', 'some-sun', 'top', 7, 8, 'none'),
  s('crape-myrtle', 'Crape myrtle', 'Lagerstroemia indica', 'Garden', 'sun', 'half', 7, 8, 'none', { also: ['Crepe myrtle'] }),
  s('japanese-maple', 'Japanese maple', 'Acer palmatum', 'Garden', 'some-sun', 'top', 7, 0, 'none'),
  s('lilac', 'Lilac', 'Syringa vulgaris', 'Garden', 'sun', 'half', 8, 0, undefined),
  s('forsythia', 'Forsythia', 'Forsythia × intermedia', 'Garden', 'sun', 'half', 8, 0, undefined),
  s('russian-sage', 'Russian sage', 'Salvia yangii', 'Garden', 'sun', 'dry', 10, 0, undefined, { also: ['Perovskia'] }),
  s('echinacea', 'Coneflower', 'Echinacea purpurea', 'Garden', 'sun', 'half', 6, 0, undefined, { also: ['Echinacea', 'Purple coneflower'] }),
  s('black-eyed-susan', 'Black-eyed Susan', 'Rudbeckia hirta', 'Garden', 'sun', 'half', 6, 0, undefined, { also: ['Rudbeckia'] }),
  s('sedum', 'Sedum', 'Hylotelephium', 'Garden', 'sun', 'dry', 10, 0, undefined, { also: ['Stonecrop', 'Autumn joy'] }),
  s('phlox', 'Phlox', 'Phlox paniculata', 'Garden', 'sun', 'moist', 4, 4, undefined),
  s('verbena', 'Verbena', 'Verbena', 'Garden', 'sun', 'half', 4, 3, undefined),
  s('alyssum', 'Sweet alyssum', 'Lobularia maritima', 'Garden', 'sun', 'top', 4, 3, undefined, { also: ['Alyssum'] }),
  s('aster', 'Aster', 'Symphyotrichum', 'Garden', 'sun', 'moist', 5, 0, undefined),
  s('hollyhock', 'Hollyhock', 'Alcea rosea', 'Garden', 'sun', 'top', 5, 4, undefined),
  s('honeysuckle', 'Honeysuckle', 'Lonicera', 'Garden', 'some-sun', 'top', 7, 4, undefined),
];

const norm = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').replace(/[^a-z0-9× ]+/g, ' ').trim();

export function speciesBy(key: string | undefined): Species | undefined {
  return key ? SPECIES.find((each) => each.key === key) : undefined;
}

/** Plant types matching typed words, by name, other names or Latin name; the closest first. */
export function findSpecies(query: string, limit = 8): Species[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = SPECIES.map((each) => {
    const names = [each.name, ...(each.also ?? []), each.latin].map(norm);
    const all = names.join(' ');
    if (!words.every((word) => all.includes(word))) return undefined;
    const q = words.join(' ');
    const score = names.some((name) => name === q) ? 0 : names[0].startsWith(q) ? 1 : names.some((name) => name.startsWith(q)) ? 2 : 3;
    return { each, score };
  }).filter((hit): hit is { each: Species; score: number } => Boolean(hit));
  return scored.sort((a, b) => a.score - b.score || a.each.name.localeCompare(b.each.name)).slice(0, limit).map((hit) => hit.each);
}

/** The plant type for a Latin name from an identification: the species first, then the genus. */
export function speciesForLatin(latin: string, genus?: string): Species | undefined {
  const name = norm(latin);
  const exact = SPECIES.find((each) => norm(each.latin) === name || (each.also ?? []).some((also) => norm(also) === name));
  if (exact) return exact;
  const firstWord = norm(genus ?? latin.split(/\s+/)[0] ?? '');
  if (!firstWord) return undefined;
  // A genus alone in the table (Begonia, Rosa) or the one species of that genus it holds.
  const sameGenus = SPECIES.filter((each) => norm(each.latin).split(' ')[0] === firstWord || (each.also ?? []).some((also) => norm(also) === firstWord));
  return sameGenus.length === 1 ? sameGenus[0] : sameGenus.find((each) => norm(each.latin) === firstWord);
}
