const definitions = [
  ["kettle", "Vintage Kettle", 5, "Vintage", "Kitchen", "mint", "The enamel has a chip. The whistle still works."],
  ["robot", "Tin Robot", 6, "Toys", "Metal", "rose", "A wind-up explorer with one very stiff elbow."],
  ["clock", "Brass Clock", 4, "Brass", "Décor", "gold", "Set permanently to teatime."],
  ["mug", "Daisy Mug", 4, "Kitchen", "Ceramic", "lilac", "A hand-painted daisy brightens the side."],
  ["postcard", "Travel Postcard", 3, "Vintage", "Paper", "peach", "From a seaside town with a very tall lighthouse."],
  ["pan", "Copper Pan", 5, "Kitchen", "Metal", "peach", "Heavy enough to make a satisfying clang."],
  ["lamp", "Brass Lamp", 6, "Brass", "Décor", "gold", "A little pull chain, a surprisingly warm glow."],
  ["radio", "Pocket Radio", 6, "Vintage", "Metal", "rose", "Mostly picks up jazz if you tilt it just right."],
  ["rocket", "Toy Rocket", 5, "Toys", "Metal", "lilac", "A fine vessel for a mission to the mantelpiece."],
  ["vase", "Tulip Vase", 5, "Décor", "Ceramic", "mint", "The paint is brightest where the sun never reached."],
  ["bowl", "Blue Bowl", 4, "Kitchen", "Ceramic", "lilac", "Just the right size for a handful of cherries."],
  ["key", "Curio Key", 3, "Brass", "Metal", "gold", "It was found in a box of buttons."],
  ["print", "Botanical Print", 4, "Décor", "Paper", "mint", "A fern pressed flat and framed in pine."],
  ["duck", "Wooden Duck", 4, "Toys", "Décor", "peach", "Its head bobs if you nudge the tail."],
  ["camera", "Pocket Camera", 7, "Vintage", "Metal", "lilac", "There might still be a photo left on the roll."],
  ["book", "Clothbound Book", 5, "Vintage", "Paper", "rose", "Someone penciled a recipe into the back."],
  ["plate", "Floral Plate", 5, "Ceramic", "Kitchen", "lilac", "A ring of blue petals around the rim."],
  ["bell", "Hotel Bell", 5, "Brass", "Vintage", "gold", "It gives a crisp little ding."],
  ["marbles", "Marble Pouch", 4, "Toys", "Vintage", "rose", "The green one has a swirl like a tiny storm."],
  ["cactus", "Little Cactus", 5, "Décor", "Ceramic", "mint", "It survived three weeks in a van."],
];

export const catalog = Object.fromEntries(definitions.map(([id, name, cost, firstTag, secondTag, color, detail]) => [
  id, { id, name, cost, tags: [firstTag, secondTag], color, detail },
]));
