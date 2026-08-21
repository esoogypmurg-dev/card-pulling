/* ========== COSMETICS ========== */
const COSMETICS = [
  // Profile / pack badges (equip → shows in sidebar + replaces default Poké Ball pack art)
  { id:'badge_star_ball', cat:'badge', name:'Star Ball Badge', desc:'Equip as your badge (replaces the Poké Ball)', price:120, value:'art/badges/01-star-ball.webp', art:'art/badges/01-star-ball.webp' },
  { id:'badge_winged_ball', cat:'badge', name:'Winged Ball Badge', desc:'Equip as your badge (replaces the Poké Ball)', price:150, value:'art/badges/02-winged-ball.webp', art:'art/badges/02-winged-ball.webp' },
  { id:'badge_thunder_ball', cat:'badge', name:'Thunder Ball Badge', desc:'Equip as your badge (replaces the Poké Ball)', price:150, value:'art/badges/03-thunder-ball.webp', art:'art/badges/03-thunder-ball.webp' },
  { id:'badge_crystal_ball', cat:'badge', name:'Crystal Ball Badge', desc:'Equip as your badge (replaces the Poké Ball)', price:180, value:'art/badges/04-crystal-ball.webp', art:'art/badges/04-crystal-ball.webp' },
  { id:'badge_fire_emblem', cat:'badge', name:'Fire Emblem', desc:'Equip as your badge (replaces the Poké Ball)', price:100, value:'art/badges/05-fire-emblem.webp', art:'art/badges/05-fire-emblem.webp' },
  { id:'badge_water_emblem', cat:'badge', name:'Water Emblem', desc:'Equip as your badge (replaces the Poké Ball)', price:100, value:'art/badges/06-water-emblem.webp', art:'art/badges/06-water-emblem.webp' },
  { id:'badge_lightning_emblem', cat:'badge', name:'Lightning Emblem', desc:'Equip as your badge (replaces the Poké Ball)', price:100, value:'art/badges/07-lightning-emblem.webp', art:'art/badges/07-lightning-emblem.webp' },
  { id:'badge_grass_emblem', cat:'badge', name:'Grass Emblem', desc:'Equip as your badge (replaces the Poké Ball)', price:100, value:'art/badges/08-grass-emblem.webp', art:'art/badges/08-grass-emblem.webp' },
  { id:'badge_psychic_emblem', cat:'badge', name:'Psychic Emblem', desc:'Equip as your badge (replaces the Poké Ball)', price:120, value:'art/badges/09-psychic-emblem.webp', art:'art/badges/09-psychic-emblem.webp' },
  { id:'badge_fighting_emblem', cat:'badge', name:'Fighting Emblem', desc:'Equip as your badge (replaces the Poké Ball)', price:120, value:'art/badges/10-fighting-emblem.webp', art:'art/badges/10-fighting-emblem.webp' },
  { id:'badge_dark_emblem', cat:'badge', name:'Dark Emblem', desc:'Equip as your badge (replaces the Poké Ball)', price:120, value:'art/badges/11-dark-emblem.webp', art:'art/badges/11-dark-emblem.webp' },
  { id:'badge_steel_emblem', cat:'badge', name:'Steel Emblem', desc:'Equip as your badge (replaces the Poké Ball)', price:120, value:'art/badges/12-steel-emblem.webp', art:'art/badges/12-steel-emblem.webp' },
  { id:'badge_rainbow_crystal', cat:'badge', name:'Rainbow Crystal', desc:'Equip as your badge (replaces the Poké Ball)', price:200, value:'art/badges/13-rainbow-crystal.webp', art:'art/badges/13-rainbow-crystal.webp' },
  { id:'badge_explorer_pack', cat:'badge', name:'Explorer Pack', desc:'Equip as your badge (replaces the Poké Ball)', price:150, value:'art/badges/14-explorer-pack.webp', art:'art/badges/14-explorer-pack.webp' },
  { id:'badge_star_card', cat:'badge', name:'Star Card Badge', desc:'Equip as your badge (replaces the Poké Ball)', price:180, value:'art/badges/15-star-card.webp', art:'art/badges/15-star-card.webp' },
  { id:'badge_champion_medal', cat:'badge', name:'Champion Medal', desc:'Equip as your badge (replaces the Poké Ball)', price:250, value:'art/badges/16-champion-medal.webp', art:'art/badges/16-champion-medal.webp' },
  // Titles
  { id:'title_trainer', cat:'title', name:'Trainer', desc:'Classic title', price:8, value:'Trainer' },
  { id:'title_collector', cat:'title', name:'Collector', desc:'For the binders', price:12, value:'Collector' },
  { id:'title_holo_hunter', cat:'title', name:'Holo Hunter', desc:'Chase the shine', price:25, value:'Holo Hunter' },
  { id:'title_gym_leader', cat:'title', name:'Gym Leader', desc:'Command the room', price:40, value:'Gym Leader' },
  { id:'title_champion', cat:'title', name:'Champion', desc:'Top of the league', price:80, value:'Champion' },
  // Name colors
  { id:'color_gold', cat:'nameColor', name:'Gold Name', desc:'Your name in gold', price:15, value:'#ffcb05' },
  { id:'color_red', cat:'nameColor', name:'Flame Name', desc:'Accent red', price:12, value:'#e3350d' },
  { id:'color_sky', cat:'nameColor', name:'Sky Name', desc:'Cool blue', price:12, value:'#38bdf8' },
  { id:'color_mint', cat:'nameColor', name:'Mint Name', desc:'Fresh green', price:12, value:'#4ade80' },
  { id:'color_violet', cat:'nameColor', name:'Violet Name', desc:'Mystic purple', price:18, value:'#c084fc' },
  // Frames
  { id:'frame_gold', cat:'frame', name:'Gold Frame', desc:'Glow around your badge', price:20, value:'cosmo-frame-gold' },
  { id:'frame_holo', cat:'frame', name:'Holo Frame', desc:'Shimmer badge frame', price:35, value:'cosmo-frame-holo' },
  { id:'frame_fire', cat:'frame', name:'Fire Frame', desc:'Charizard energy', price:30, value:'cosmo-frame-fire' },
  // Pack sleeves (equip replaces pack art)
  { id:"pack_captains_ball", cat:'packSleeve', name:"Captains Ball", desc:"Equip as your pack art", price:100, value:"art/packs/02-captains-ball.webp", art:"art/packs/02-captains-ball.webp" },
  { id:"pack_green_ball", cat:'packSleeve', name:"Green Ball", desc:"Equip as your pack art", price:100, value:"art/packs/03-green-ball.webp", art:"art/packs/03-green-ball.webp" },
  { id:"pack_great_ball", cat:'packSleeve', name:"Great Ball", desc:"Equip as your pack art", price:150, value:"art/packs/04-great-ball.webp", art:"art/packs/04-great-ball.webp" },
  { id:"pack_ultra_ball", cat:'packSleeve', name:"Ultra Ball", desc:"Equip as your pack art", price:150, value:"art/packs/05-ultra-ball.webp", art:"art/packs/05-ultra-ball.webp" },
  { id:"pack_master_ball", cat:'packSleeve', name:"Master Ball", desc:"Equip as your pack art", price:400, value:"art/packs/06-master-ball.webp", art:"art/packs/06-master-ball.webp" },
  { id:"pack_safari_ball", cat:'packSleeve', name:"Safari Ball", desc:"Equip as your pack art", price:100, value:"art/packs/07-safari-ball.webp", art:"art/packs/07-safari-ball.webp" },
  { id:"pack_safari_ball", cat:'packSleeve', name:"Safari Ball", desc:"Equip as your pack art", price:100, value:"art/packs/08-safari-ball.webp", art:"art/packs/08-safari-ball.webp" },
  { id:"pack_level_ball", cat:'packSleeve', name:"Level Ball", desc:"Equip as your pack art", price:100, value:"art/packs/09-level-ball.webp", art:"art/packs/09-level-ball.webp" },
  { id:"pack_lure_ball_red_green", cat:'packSleeve', name:"Lure Ball Red Green", desc:"Equip as your pack art", price:100, value:"art/packs/10-lure-ball-red-green.webp", art:"art/packs/10-lure-ball-red-green.webp" },
  { id:"pack_lure_ball_red_blue", cat:'packSleeve', name:"Lure Ball Red Blue", desc:"Equip as your pack art", price:100, value:"art/packs/11-lure-ball-red-blue.webp", art:"art/packs/11-lure-ball-red-blue.webp" },
  { id:"pack_moon_ball", cat:'packSleeve', name:"Moon Ball", desc:"Equip as your pack art", price:150, value:"art/packs/12-moon-ball.webp", art:"art/packs/12-moon-ball.webp" },
  { id:"pack_friend_ball", cat:'packSleeve', name:"Friend Ball", desc:"Equip as your pack art", price:100, value:"art/packs/13-friend-ball.webp", art:"art/packs/13-friend-ball.webp" },
  { id:"pack_love_ball", cat:'packSleeve', name:"Love Ball", desc:"Equip as your pack art", price:150, value:"art/packs/14-love-ball.webp", art:"art/packs/14-love-ball.webp" },
  { id:"pack_heavy_ball", cat:'packSleeve', name:"Heavy Ball", desc:"Equip as your pack art", price:100, value:"art/packs/15-heavy-ball.webp", art:"art/packs/15-heavy-ball.webp" },
  { id:"pack_fast_ball", cat:'packSleeve', name:"Fast Ball", desc:"Equip as your pack art", price:100, value:"art/packs/16-fast-ball.webp", art:"art/packs/16-fast-ball.webp" },
  { id:"pack_sports_ball", cat:'packSleeve', name:"Sports Ball", desc:"Equip as your pack art", price:100, value:"art/packs/17-sports-ball.webp", art:"art/packs/17-sports-ball.webp" },
  { id:"pack_premier_ball", cat:'packSleeve', name:"Premier Ball", desc:"Equip as your pack art", price:250, value:"art/packs/18-premier-ball.webp", art:"art/packs/18-premier-ball.webp" },
  { id:"pack_repeat_ball", cat:'packSleeve', name:"Repeat Ball", desc:"Equip as your pack art", price:100, value:"art/packs/19-repeat-ball.webp", art:"art/packs/19-repeat-ball.webp" },
  { id:"pack_timer_ball", cat:'packSleeve', name:"Timer Ball", desc:"Equip as your pack art", price:150, value:"art/packs/20-timer-ball.webp", art:"art/packs/20-timer-ball.webp" },
  { id:"pack_nest_ball", cat:'packSleeve', name:"Nest Ball", desc:"Equip as your pack art", price:100, value:"art/packs/21-nest-ball.webp", art:"art/packs/21-nest-ball.webp" },
  { id:"pack_net_ball", cat:'packSleeve', name:"Net Ball", desc:"Equip as your pack art", price:100, value:"art/packs/22-net-ball.webp", art:"art/packs/22-net-ball.webp" },
  { id:"pack_dive_ball", cat:'packSleeve', name:"Dive Ball", desc:"Equip as your pack art", price:150, value:"art/packs/23-dive-ball.webp", art:"art/packs/23-dive-ball.webp" },
  { id:"pack_luxury_ball", cat:'packSleeve', name:"Luxury Ball", desc:"Equip as your pack art", price:150, value:"art/packs/24-luxury-ball.webp", art:"art/packs/24-luxury-ball.webp" },
  { id:"pack_heal_ball", cat:'packSleeve', name:"Heal Ball", desc:"Equip as your pack art", price:100, value:"art/packs/25-heal-ball.webp", art:"art/packs/25-heal-ball.webp" },
  { id:"pack_quick_ball", cat:'packSleeve', name:"Quick Ball", desc:"Equip as your pack art", price:150, value:"art/packs/26-quick-ball.webp", art:"art/packs/26-quick-ball.webp" },
  { id:"pack_dusk_ball", cat:'packSleeve', name:"Dusk Ball", desc:"Equip as your pack art", price:150, value:"art/packs/27-dusk-ball.webp", art:"art/packs/27-dusk-ball.webp" },
  { id:"pack_cherish_ball", cat:'packSleeve', name:"Cherish Ball", desc:"Equip as your pack art", price:250, value:"art/packs/28-cherish-ball.webp", art:"art/packs/28-cherish-ball.webp" },
  { id:"pack_park_ball_green", cat:'packSleeve', name:"Park Ball Green", desc:"Equip as your pack art", price:100, value:"art/packs/29-park-ball-green.webp", art:"art/packs/29-park-ball-green.webp" },
  { id:"pack_park_ball_yellow", cat:'packSleeve', name:"Park Ball Yellow", desc:"Equip as your pack art", price:100, value:"art/packs/30-park-ball-yellow.webp", art:"art/packs/30-park-ball-yellow.webp" },
  { id:"pack_dream_ball", cat:'packSleeve', name:"Dream Ball", desc:"Equip as your pack art", price:250, value:"art/packs/31-dream-ball.webp", art:"art/packs/31-dream-ball.webp" },
  { id:"pack_gs_ball", cat:'packSleeve', name:"Gs Ball", desc:"Equip as your pack art", price:400, value:"art/packs/32-gs-ball.webp", art:"art/packs/32-gs-ball.webp" },
  { id:"pack_lake_ball", cat:'packSleeve', name:"Lake Ball", desc:"Equip as your pack art", price:100, value:"art/packs/33-lake-ball.webp", art:"art/packs/33-lake-ball.webp" },
  { id:"pack_giant_stone_ball", cat:'packSleeve', name:"Giant Stone Ball", desc:"Equip as your pack art", price:100, value:"art/packs/34-giant-stone-ball.webp", art:"art/packs/34-giant-stone-ball.webp" },
  { id:"pack_gold_ball", cat:'packSleeve', name:"Gold Ball", desc:"Equip as your pack art", price:350, value:"art/packs/35-gold-ball.webp", art:"art/packs/35-gold-ball.webp" },
  { id:"pack_pokelantis_ball", cat:'packSleeve', name:"Pokelantis Ball", desc:"Equip as your pack art", price:100, value:"art/packs/36-pokelantis-ball.webp", art:"art/packs/36-pokelantis-ball.webp" },
  { id:"pack_pia_chansey_ball", cat:'packSleeve', name:"Pia Chansey Ball", desc:"Equip as your pack art", price:100, value:"art/packs/37-pia-chansey-ball.webp", art:"art/packs/37-pia-chansey-ball.webp" },
  { id:"pack_crystal_ball", cat:'packSleeve', name:"Crystal Ball", desc:"Equip as your pack art", price:250, value:"art/packs/38-crystal-ball.webp", art:"art/packs/38-crystal-ball.webp" },
  { id:"pack_clone_ball", cat:'packSleeve', name:"Clone Ball", desc:"Equip as your pack art", price:100, value:"art/packs/39-clone-ball.webp", art:"art/packs/39-clone-ball.webp" },
  { id:"pack_annies_ball", cat:'packSleeve', name:"Annies Ball", desc:"Equip as your pack art", price:100, value:"art/packs/40-annies-ball.webp", art:"art/packs/40-annies-ball.webp" },
  { id:"pack_oakleys_ball", cat:'packSleeve', name:"Oakleys Ball", desc:"Equip as your pack art", price:100, value:"art/packs/41-oakleys-ball.webp", art:"art/packs/41-oakleys-ball.webp" },
  { id:"pack_team_rocket_ball_gray", cat:'packSleeve', name:"Team Rocket Ball Gray", desc:"Equip as your pack art", price:250, value:"art/packs/42-team-rocket-ball-gray.webp", art:"art/packs/42-team-rocket-ball-gray.webp" },
  { id:"pack_team_rocket_ball_black", cat:'packSleeve', name:"Team Rocket Ball Black", desc:"Equip as your pack art", price:250, value:"art/packs/43-team-rocket-ball-black.webp", art:"art/packs/43-team-rocket-ball-black.webp" },
  { id:"pack_team_magma_ball", cat:'packSleeve', name:"Team Magma Ball", desc:"Equip as your pack art", price:250, value:"art/packs/44-team-magma-ball.webp", art:"art/packs/44-team-magma-ball.webp" },
  { id:"pack_team_aqua_ball", cat:'packSleeve', name:"Team Aqua Ball", desc:"Equip as your pack art", price:250, value:"art/packs/45-team-aqua-ball.webp", art:"art/packs/45-team-aqua-ball.webp" },
  { id:"pack_team_plasma_ball", cat:'packSleeve', name:"Team Plasma Ball", desc:"Equip as your pack art", price:250, value:"art/packs/46-team-plasma-ball.webp", art:"art/packs/46-team-plasma-ball.webp" },
  { id:"pack_typing_ball", cat:'packSleeve', name:"Typing Ball", desc:"Equip as your pack art", price:100, value:"art/packs/47-typing-ball.webp", art:"art/packs/47-typing-ball.webp" },
  { id:"pack_dark_ball", cat:'packSleeve', name:"Dark Ball", desc:"Equip as your pack art", price:250, value:"art/packs/48-dark-ball.webp", art:"art/packs/48-dark-ball.webp" },
  { id:"pack_lokokos_old_ball", cat:'packSleeve', name:"Lokokos Old Ball", desc:"Equip as your pack art", price:100, value:"art/packs/49-lokokos-old-ball.webp", art:"art/packs/49-lokokos-old-ball.webp" },
  { id:"pack_sammys_old_ball", cat:'packSleeve', name:"Sammys Old Ball", desc:"Equip as your pack art", price:100, value:"art/packs/50-sammys-old-ball.webp", art:"art/packs/50-sammys-old-ball.webp" },
  { id:"pack_pester_ball", cat:'packSleeve', name:"Pester Ball", desc:"Equip as your pack art", price:100, value:"art/packs/51-pester-ball.webp", art:"art/packs/51-pester-ball.webp" },
  // Premium type packs (equip as pack art)
  { id:"pack_prem_fire", cat:'packSleeve', name:"Premium Fire Pack", desc:"Type premium pack art", price:300, value:"art/premium-packs/fire-pack.webp", art:"art/premium-packs/fire-pack.webp" },
  { id:"pack_prem_water", cat:'packSleeve', name:"Premium Water Pack", desc:"Type premium pack art", price:300, value:"art/premium-packs/water-pack.webp", art:"art/premium-packs/water-pack.webp" },
  { id:"pack_prem_grass", cat:'packSleeve', name:"Premium Grass Pack", desc:"Type premium pack art", price:300, value:"art/premium-packs/grass-pack.webp", art:"art/premium-packs/grass-pack.webp" },
  { id:"pack_prem_lightning", cat:'packSleeve', name:"Premium Lightning Pack", desc:"Type premium pack art", price:300, value:"art/premium-packs/lightning-pack.webp", art:"art/premium-packs/lightning-pack.webp" },
  { id:"pack_prem_psychic", cat:'packSleeve', name:"Premium Psychic Pack", desc:"Type premium pack art", price:300, value:"art/premium-packs/psychic-pack.webp", art:"art/premium-packs/psychic-pack.webp" },
  { id:"pack_prem_fighting", cat:'packSleeve', name:"Premium Fighting Pack", desc:"Type premium pack art", price:300, value:"art/premium-packs/fighting-pack.webp", art:"art/premium-packs/fighting-pack.webp" },
  { id:"pack_prem_darkness", cat:'packSleeve', name:"Premium Darkness Pack", desc:"Type premium pack art", price:300, value:"art/premium-packs/darkness-pack.webp", art:"art/premium-packs/darkness-pack.webp" },
  { id:"pack_prem_metal", cat:'packSleeve', name:"Premium Metal Pack", desc:"Type premium pack art", price:300, value:"art/premium-packs/metal-pack.webp", art:"art/premium-packs/metal-pack.webp" },
  { id:"pack_prem_colorless", cat:'packSleeve', name:"Premium Colorless Pack", desc:"Type premium pack art", price:300, value:"art/premium-packs/colorless-pack.webp", art:"art/premium-packs/colorless-pack.webp" },
  // Binder themes
  { id:'binder_gold', cat:'binderTheme', name:'Gold Binder', desc:'Warm gold pages', price:30, value:'cosmo-binder-gold' },
  { id:'binder_midnight', cat:'binderTheme', name:'Midnight Binder', desc:'Deep blue pages', price:30, value:'cosmo-binder-midnight' },
  { id:'binder_forest', cat:'binderTheme', name:'Forest Binder', desc:'Green page theme', price:30, value:'cosmo-binder-forest' },
  { id:'binder_bug', cat:'binderTheme', name:'Bug Binder', desc:'Bug-type binder cover', price:40, value:'art/binders/bug_binder.webp', art:'art/binders/bug_binder.webp' },
  { id:'binder_dark', cat:'binderTheme', name:'Dark Binder', desc:'Dark-type binder cover', price:40, value:'art/binders/dark_binder.webp', art:'art/binders/dark_binder.webp' },
  { id:'binder_dragon', cat:'binderTheme', name:'Dragon Binder', desc:'Dragon-type binder cover', price:40, value:'art/binders/dragon_binder.webp', art:'art/binders/dragon_binder.webp' },
  { id:'binder_electric', cat:'binderTheme', name:'Electric Binder', desc:'Electric-type binder cover', price:40, value:'art/binders/electric_binder.webp', art:'art/binders/electric_binder.webp' },
  { id:'binder_fairy', cat:'binderTheme', name:'Fairy Binder', desc:'Fairy-type binder cover', price:40, value:'art/binders/fairy_binder.webp', art:'art/binders/fairy_binder.webp' },
  { id:'binder_fighting', cat:'binderTheme', name:'Fighting Binder', desc:'Fighting-type binder cover', price:40, value:'art/binders/fighting_binder.webp', art:'art/binders/fighting_binder.webp' },
  { id:'binder_fire', cat:'binderTheme', name:'Fire Binder', desc:'Fire-type binder cover', price:40, value:'art/binders/fire_binder.webp', art:'art/binders/fire_binder.webp' },
  { id:'binder_flying', cat:'binderTheme', name:'Flying Binder', desc:'Flying-type binder cover', price:40, value:'art/binders/flying_binder.webp', art:'art/binders/flying_binder.webp' },
  { id:'binder_ghost', cat:'binderTheme', name:'Ghost Binder', desc:'Ghost-type binder cover', price:40, value:'art/binders/ghost_binder.webp', art:'art/binders/ghost_binder.webp' },
  { id:'binder_grass', cat:'binderTheme', name:'Grass Binder', desc:'Grass-type binder cover', price:40, value:'art/binders/grass_binder.webp', art:'art/binders/grass_binder.webp' },
  { id:'binder_ground', cat:'binderTheme', name:'Ground Binder', desc:'Ground-type binder cover', price:40, value:'art/binders/ground_binder.webp', art:'art/binders/ground_binder.webp' },
  { id:'binder_ice', cat:'binderTheme', name:'Ice Binder', desc:'Ice-type binder cover', price:40, value:'art/binders/ice_binder.webp', art:'art/binders/ice_binder.webp' },
  { id:'binder_poison', cat:'binderTheme', name:'Poison Binder', desc:'Poison-type binder cover', price:40, value:'art/binders/poison_binder.webp', art:'art/binders/poison_binder.webp' },
  { id:'binder_psychic', cat:'binderTheme', name:'Psychic Binder', desc:'Psychic-type binder cover', price:40, value:'art/binders/psychic_binder.webp', art:'art/binders/psychic_binder.webp' },
  { id:'binder_rock', cat:'binderTheme', name:'Rock Binder', desc:'Rock-type binder cover', price:40, value:'art/binders/rock_binder.webp', art:'art/binders/rock_binder.webp' },
  { id:'binder_steel', cat:'binderTheme', name:'Steel Binder', desc:'Steel-type binder cover', price:40, value:'art/binders/steel_binder.webp', art:'art/binders/steel_binder.webp' },
  { id:'binder_water', cat:'binderTheme', name:'Water Binder', desc:'Water-type binder cover', price:40, value:'art/binders/water_binder.webp', art:'art/binders/water_binder.webp' },
  // Card backs (CSS filter on reveal back)
  { id:'back_gold', cat:'cardBack', name:'Gold Back Tint', desc:'Warm card back', price:18, value:'cosmo-back-gold' },
  { id:'back_ice', cat:'cardBack', name:'Ice Back Tint', desc:'Cool card back', price:18, value:'cosmo-back-ice' },
  { id:'back_ember', cat:'cardBack', name:'Ember Back Tint', desc:'Fiery card back', price:18, value:'cosmo-back-ember' },
  // Card back art (same pricing tier as pack art)
  { id:"backart_bulbasaur_ball_back", cat:'cardBack', name:"Bulbasaur Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/02-bulbasaur-ball-back.webp", art:"art/card-backs/02-bulbasaur-ball-back.webp" },
  { id:"backart_charmander_ball_back", cat:'cardBack', name:"Charmander Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/03-charmander-ball-back.webp", art:"art/card-backs/03-charmander-ball-back.webp" },
  { id:"backart_squirtle_ball_back", cat:'cardBack', name:"Squirtle Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/04-squirtle-ball-back.webp", art:"art/card-backs/04-squirtle-ball-back.webp" },
  { id:"backart_pikachu_ball_back", cat:'cardBack', name:"Pikachu Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/05-pikachu-ball-back.webp", art:"art/card-backs/05-pikachu-ball-back.webp" },
  { id:"backart_numbered_ball_back", cat:'cardBack', name:"Numbered Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/06-numbered-ball-back.webp", art:"art/card-backs/06-numbered-ball-back.webp" },
  { id:"backart_transparent_ball_back", cat:'cardBack', name:"Transparent Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/07-transparent-ball-back.webp", art:"art/card-backs/07-transparent-ball-back.webp" },
  { id:"backart_ritchies_ball_back", cat:'cardBack', name:"Ritchies Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/08-ritchies-ball-back.webp", art:"art/card-backs/08-ritchies-ball-back.webp" },
  { id:"backart_fishing_ball_back", cat:'cardBack', name:"Fishing Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/09-fishing-ball-back.webp", art:"art/card-backs/09-fishing-ball-back.webp" },
  { id:"backart_diamond_ball_back", cat:'cardBack', name:"Diamond Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/10-diamond-ball-back.webp", art:"art/card-backs/10-diamond-ball-back.webp" },
  { id:"backart_captains_ball_back", cat:'cardBack', name:"Captains Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/11-captains-ball-back.webp", art:"art/card-backs/11-captains-ball-back.webp" },
  { id:"backart_green_ball_back", cat:'cardBack', name:"Green Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/12-green-ball-back.webp", art:"art/card-backs/12-green-ball-back.webp" },
  { id:"backart_great_ball_back", cat:'cardBack', name:"Great Ball Back", desc:"Equip as card back art", price:150, value:"art/card-backs/13-great-ball-back.webp", art:"art/card-backs/13-great-ball-back.webp" },
  { id:"backart_ultra_ball_back", cat:'cardBack', name:"Ultra Ball Back", desc:"Equip as card back art", price:150, value:"art/card-backs/14-ultra-ball-back.webp", art:"art/card-backs/14-ultra-ball-back.webp" },
  { id:"backart_master_ball_back", cat:'cardBack', name:"Master Ball Back", desc:"Equip as card back art", price:400, value:"art/card-backs/15-master-ball-back.webp", art:"art/card-backs/15-master-ball-back.webp" },
  { id:"backart_safari_ball_back", cat:'cardBack', name:"Safari Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/16-safari-ball-back.webp", art:"art/card-backs/16-safari-ball-back.webp" },
  { id:"backart_safari_ball_back", cat:'cardBack', name:"Safari Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/17-safari-ball-back.webp", art:"art/card-backs/17-safari-ball-back.webp" },
  { id:"backart_level_ball_back", cat:'cardBack', name:"Level Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/18-level-ball-back.webp", art:"art/card-backs/18-level-ball-back.webp" },
  { id:"backart_lure_ball_red_green_back", cat:'cardBack', name:"Lure Ball Red Green Back", desc:"Equip as card back art", price:100, value:"art/card-backs/19-lure-ball-red-green-back.webp", art:"art/card-backs/19-lure-ball-red-green-back.webp" },
  { id:"backart_lure_ball_red_blue_back", cat:'cardBack', name:"Lure Ball Red Blue Back", desc:"Equip as card back art", price:100, value:"art/card-backs/20-lure-ball-red-blue-back.webp", art:"art/card-backs/20-lure-ball-red-blue-back.webp" },
  { id:"backart_moon_ball_back", cat:'cardBack', name:"Moon Ball Back", desc:"Equip as card back art", price:150, value:"art/card-backs/21-moon-ball-back.webp", art:"art/card-backs/21-moon-ball-back.webp" },
  { id:"backart_friend_ball_back", cat:'cardBack', name:"Friend Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/22-friend-ball-back.webp", art:"art/card-backs/22-friend-ball-back.webp" },
  { id:"backart_love_ball_back", cat:'cardBack', name:"Love Ball Back", desc:"Equip as card back art", price:150, value:"art/card-backs/23-love-ball-back.webp", art:"art/card-backs/23-love-ball-back.webp" },
  { id:"backart_heavy_ball_back", cat:'cardBack', name:"Heavy Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/24-heavy-ball-back.webp", art:"art/card-backs/24-heavy-ball-back.webp" },
  { id:"backart_fast_ball_back", cat:'cardBack', name:"Fast Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/25-fast-ball-back.webp", art:"art/card-backs/25-fast-ball-back.webp" },
  { id:"backart_sports_ball_back", cat:'cardBack', name:"Sports Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/26-sports-ball-back.webp", art:"art/card-backs/26-sports-ball-back.webp" },
  { id:"backart_premier_ball_back", cat:'cardBack', name:"Premier Ball Back", desc:"Equip as card back art", price:250, value:"art/card-backs/27-premier-ball-back.webp", art:"art/card-backs/27-premier-ball-back.webp" },
  { id:"backart_repeat_ball_back", cat:'cardBack', name:"Repeat Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/28-repeat-ball-back.webp", art:"art/card-backs/28-repeat-ball-back.webp" },
  { id:"backart_timer_ball_back", cat:'cardBack', name:"Timer Ball Back", desc:"Equip as card back art", price:150, value:"art/card-backs/29-timer-ball-back.webp", art:"art/card-backs/29-timer-ball-back.webp" },
  { id:"backart_nest_ball_back", cat:'cardBack', name:"Nest Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/30-nest-ball-back.webp", art:"art/card-backs/30-nest-ball-back.webp" },
  { id:"backart_net_ball_back", cat:'cardBack', name:"Net Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/31-net-ball-back.webp", art:"art/card-backs/31-net-ball-back.webp" },
  { id:"backart_dive_ball_back", cat:'cardBack', name:"Dive Ball Back", desc:"Equip as card back art", price:150, value:"art/card-backs/32-dive-ball-back.webp", art:"art/card-backs/32-dive-ball-back.webp" },
  { id:"backart_luxury_ball_back", cat:'cardBack', name:"Luxury Ball Back", desc:"Equip as card back art", price:150, value:"art/card-backs/33-luxury-ball-back.webp", art:"art/card-backs/33-luxury-ball-back.webp" },
  { id:"backart_heal_ball_back", cat:'cardBack', name:"Heal Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/34-heal-ball-back.webp", art:"art/card-backs/34-heal-ball-back.webp" },
  { id:"backart_quick_ball_back", cat:'cardBack', name:"Quick Ball Back", desc:"Equip as card back art", price:150, value:"art/card-backs/35-quick-ball-back.webp", art:"art/card-backs/35-quick-ball-back.webp" },
  { id:"backart_dusk_ball_back", cat:'cardBack', name:"Dusk Ball Back", desc:"Equip as card back art", price:150, value:"art/card-backs/36-dusk-ball-back.webp", art:"art/card-backs/36-dusk-ball-back.webp" },
  { id:"backart_cherish_ball_back", cat:'cardBack', name:"Cherish Ball Back", desc:"Equip as card back art", price:250, value:"art/card-backs/37-cherish-ball-back.webp", art:"art/card-backs/37-cherish-ball-back.webp" },
  { id:"backart_park_ball_green_back", cat:'cardBack', name:"Park Ball Green Back", desc:"Equip as card back art", price:100, value:"art/card-backs/38-park-ball-green-back.webp", art:"art/card-backs/38-park-ball-green-back.webp" },
  { id:"backart_park_ball_yellow_back", cat:'cardBack', name:"Park Ball Yellow Back", desc:"Equip as card back art", price:100, value:"art/card-backs/39-park-ball-yellow-back.webp", art:"art/card-backs/39-park-ball-yellow-back.webp" },
  { id:"backart_dream_ball_back", cat:'cardBack', name:"Dream Ball Back", desc:"Equip as card back art", price:250, value:"art/card-backs/40-dream-ball-back.webp", art:"art/card-backs/40-dream-ball-back.webp" },
  { id:"backart_gs_ball_back", cat:'cardBack', name:"Gs Ball Back", desc:"Equip as card back art", price:400, value:"art/card-backs/41-gs-ball-back.webp", art:"art/card-backs/41-gs-ball-back.webp" },
  { id:"backart_lake_ball_back", cat:'cardBack', name:"Lake Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/42-lake-ball-back.webp", art:"art/card-backs/42-lake-ball-back.webp" },
  { id:"backart_giant_stone_ball_back", cat:'cardBack', name:"Giant Stone Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/43-giant-stone-ball-back.webp", art:"art/card-backs/43-giant-stone-ball-back.webp" },
  { id:"backart_gold_ball_back", cat:'cardBack', name:"Gold Ball Back", desc:"Equip as card back art", price:350, value:"art/card-backs/44-gold-ball-back.webp", art:"art/card-backs/44-gold-ball-back.webp" },
  { id:"backart_pokelantis_ball_back", cat:'cardBack', name:"Pokelantis Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/45-pokelantis-ball-back.webp", art:"art/card-backs/45-pokelantis-ball-back.webp" },
  { id:"backart_pia_chansey_ball_back", cat:'cardBack', name:"Pia Chansey Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/46-pia-chansey-ball-back.webp", art:"art/card-backs/46-pia-chansey-ball-back.webp" },
  { id:"backart_clone_ball_back", cat:'cardBack', name:"Clone Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/48-clone-ball-back.webp", art:"art/card-backs/48-clone-ball-back.webp" },
  { id:"backart_annies_ball_back", cat:'cardBack', name:"Annies Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/49-annies-ball-back.webp", art:"art/card-backs/49-annies-ball-back.webp" },
  { id:"backart_oakleys_ball_back", cat:'cardBack', name:"Oakleys Ball Back", desc:"Equip as card back art", price:100, value:"art/card-backs/50-oakleys-ball-back.webp", art:"art/card-backs/50-oakleys-ball-back.webp" },
  { id:"backart_team_rocket_ball_gray_back", cat:'cardBack', name:"Team Rocket Ball Gray Back", desc:"Equip as card back art", price:250, value:"art/card-backs/51-team-rocket-ball-gray-back.webp", art:"art/card-backs/51-team-rocket-ball-gray-back.webp" },
  { id:"backart_team_rocket_ball_black_back", cat:'cardBack', name:"Team Rocket Ball Black Back", desc:"Equip as card back art", price:250, value:"art/card-backs/52-team-rocket-ball-black-back.webp", art:"art/card-backs/52-team-rocket-ball-black-back.webp" },
  { id:"backart_team_magma_ball_back", cat:'cardBack', name:"Team Magma Ball Back", desc:"Equip as card back art", price:250, value:"art/card-backs/53-team-magma-ball-back.webp", art:"art/card-backs/53-team-magma-ball-back.webp" },
  // Premium energy-style card backs
  { id:"back_prem_fire", cat:'cardBack', name:"Premium Fire Back", desc:"Type energy card back", price:200, value:"art/card-backs-premium/fire-premium-card-back.webp", art:"art/card-backs-premium/fire-premium-card-back.webp" },
  { id:"back_prem_water", cat:'cardBack', name:"Premium Water Back", desc:"Type energy card back", price:200, value:"art/card-backs-premium/water-premium-card-back.webp", art:"art/card-backs-premium/water-premium-card-back.webp" },
  { id:"back_prem_grass", cat:'cardBack', name:"Premium Grass Back", desc:"Type energy card back", price:200, value:"art/card-backs-premium/grass-premium-card-back.webp", art:"art/card-backs-premium/grass-premium-card-back.webp" },
  { id:"back_prem_lightning", cat:'cardBack', name:"Premium Lightning Back", desc:"Type energy card back", price:200, value:"art/card-backs-premium/lightning-premium-card-back.webp", art:"art/card-backs-premium/lightning-premium-card-back.webp" },
  { id:"back_prem_psychic", cat:'cardBack', name:"Premium Psychic Back", desc:"Type energy card back", price:200, value:"art/card-backs-premium/psychic-premium-card-back.webp", art:"art/card-backs-premium/psychic-premium-card-back.webp" },
  { id:"back_prem_fighting", cat:'cardBack', name:"Premium Fighting Back", desc:"Type energy card back", price:200, value:"art/card-backs-premium/fighting-premium-card-back.webp", art:"art/card-backs-premium/fighting-premium-card-back.webp" },
  { id:"back_prem_darkness", cat:'cardBack', name:"Premium Darkness Back", desc:"Type energy card back", price:200, value:"art/card-backs-premium/darkness-premium-card-back.webp", art:"art/card-backs-premium/darkness-premium-card-back.webp" },
  { id:"back_prem_metal", cat:'cardBack', name:"Premium Metal Back", desc:"Type energy card back", price:200, value:"art/card-backs-premium/metal-premium-card-back.webp", art:"art/card-backs-premium/metal-premium-card-back.webp" },
  { id:"back_prem_colorless", cat:'cardBack', name:"Premium Colorless Back", desc:"Type energy card back", price:200, value:"art/card-backs-premium/colorless-premium-card-back.webp", art:"art/card-backs-premium/colorless-premium-card-back.webp" },
  { id:"back_prem_energy", cat:'cardBack', name:"Premium Energy Back", desc:"Full energy collage card back", price:350, value:"art/card-backs-premium/premium-energy-card-back.webp", art:"art/card-backs-premium/premium-energy-card-back.webp" }
];

let cosmoCatFilter = 'all';

function setCosmoCat(cat){
  cosmoCatFilter = cat || 'all';
  document.querySelectorAll('#cosmo-cat-filters .filter-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-cosmo-cat') === cosmoCatFilter);
  });
  renderCosmeticsShop();
}

function ownsCosmetic(id){
  return (state.cosmeticsOwned || []).includes(id);
}

function isEquipped(id){
  const item = COSMETICS.find(c => c.id === id);
  if(!item || !state.cosmeticsEquipped) return false;
  return state.cosmeticsEquipped[item.cat] === id;
}

function cosmeticPrice(item){
  if(!item) return 0;
  return shopApplySale(Number(item.price)||0, 'cosmetic');
}

function buyCosmetic(id){
  const item = COSMETICS.find(c => c.id === id);
  if(!item) return;
  if(ownsCosmetic(id)){ equipCosmetic(id); return; }
  const cost = cosmeticPrice(item);
  if(state.money < cost){ showToast('Not enough money'); return; }
  state.money = +(state.money - cost).toFixed(2);
  if(!state.cosmeticsOwned) state.cosmeticsOwned = [];
  state.cosmeticsOwned.push(id);
  // Auto-equip on purchase
  if(!state.cosmeticsEquipped) state.cosmeticsEquipped = {};
  state.cosmeticsEquipped[item.cat] = id;
  save(); updateUI(); applyCosmetics(); renderCosmeticsShop();
  showToast('Unlocked '+item.name+'!');
}

function equipCosmetic(id){
  const item = COSMETICS.find(c => c.id === id);
  if(!item || !ownsCosmetic(id)) return;
  if(!state.cosmeticsEquipped) state.cosmeticsEquipped = {};
  // Toggle off if already equipped
  if(state.cosmeticsEquipped[item.cat] === id){
    state.cosmeticsEquipped[item.cat] = null;
    showToast('Unequipped '+item.name);
  } else {
    state.cosmeticsEquipped[item.cat] = id;
    showToast('Equipped '+item.name);
  }
  save(); applyCosmetics(); renderCosmeticsShop();
}

function getEquippedBinderCosmetic(){
  const eq = state.cosmeticsEquipped || {};
  const id = eq.binderTheme;
  if(!id) return null;
  return (typeof COSMETICS !== 'undefined' ? COSMETICS : []).find(c => c.id === id) || null;
}
const DEFAULT_BINDER_ART = 'art/binders/normal_binder.webp';

function getEquippedBinderArt(){
  const item = getEquippedBinderCosmetic();
  if(item){
    // Legacy CSS-only themes (gold/midnight/forest) have no cover art
    if(item.art) return item.art;
    if(item.value && String(item.value).startsWith('art/')) return item.value;
    if(item.value && String(item.value).startsWith('cosmo-')) return null;
  }
  // Everyone gets the Normal binder cover by default
  return DEFAULT_BINDER_ART;
}

function applyCosmetics(){
  const body = document.body;
  // Clear known body classes (pack / binder / card back)
  body.classList.remove(
    'cosmo-binder-gold','cosmo-binder-midnight','cosmo-binder-forest','cosmo-binder-art',
    'cosmo-back-gold','cosmo-back-ice','cosmo-back-ember'
  );
  body.style.removeProperty('--binder-cover-art');
  const eq = state.cosmeticsEquipped || {};
  const addBody = (cat) => {
    const id = eq[cat];
    if(!id) return;
    const item = COSMETICS.find(c => c.id === id);
    if(item && item.value && String(item.value).startsWith('cosmo-')){
      body.classList.add(item.value);
    }
  };
  // Binder theme: equipped art, legacy CSS class, or default Normal binder
  const binderItem = getEquippedBinderCosmetic();
  if(binderItem && binderItem.value && String(binderItem.value).startsWith('cosmo-') && !(binderItem.art || (binderItem.value||'').startsWith('art/'))){
    body.classList.add(binderItem.value);
  } else {
    const art = (typeof getEquippedBinderArt === 'function') ? getEquippedBinderArt() : null;
    if(art){
      body.classList.add('cosmo-binder-art');
      body.style.setProperty('--binder-cover-art', 'url("'+art+'")');
    }
  }
  addBody('cardBack');
  // Name / title / frame live on the badge itself
  refreshUserBadge();
  if(typeof refreshSidebarBadge === 'function') refreshSidebarBadge();
  if(typeof setPackArt === 'function') setPackArt(randomPackArt());
  if(typeof setCardBackArt === 'function') setCardBackArt(getCardBackArt());
  if(typeof renderBinderShelf === 'function'){
    try{ renderBinderShelf(); }catch(e){}
  }
}

function refreshSidebarBadge(){
  const brand = document.getElementById('sidebar-brand');
  const logo = document.getElementById('sidebar-badge-logo');
  if(!brand || !logo) return;
  const eq = (state && state.cosmeticsEquipped) || {};
  let src = null;
  if(eq.badge){
    const item = COSMETICS.find(c => c.id === eq.badge);
    if(item){
      if(item.art) src = item.art;
      else if(item.value && String(item.value).startsWith('art/')) src = item.value;
    }
  }
  if(src){
    logo.src = src;
    brand.classList.add('has-badge');
  } else {
    logo.src = 'art/packs/poke-ball.webp';
    brand.classList.remove('has-badge');
  }
}

function refreshUserBadge(){
  const badge = document.getElementById('user-badge');
  if(!badge || !currentUser) return;
  const eq = state.cosmeticsEquipped || {};

  let nameStyle = '';
  const colorItem = eq.nameColor ? COSMETICS.find(c => c.id === eq.nameColor) : null;
  if(colorItem) nameStyle = ' style="color:'+colorItem.value+'"';

  let titleHtml = '';
  const titleItem = eq.title ? COSMETICS.find(c => c.id === eq.title) : null;
  if(titleItem) titleHtml = '<span class="cosmo-title-chip">'+titleItem.value+'</span>';

  // Frame class on identity pill only (not logout)
  let frameClass = '';
  const frameItem = eq.frame ? COSMETICS.find(c => c.id === eq.frame) : null;
  if(frameItem && frameItem.value) frameClass = ' '+frameItem.value;

  // Equipped badge icon (avatar next to name)
  let avatarHtml = '';
  const badgeItem = eq.badge ? COSMETICS.find(c => c.id === eq.badge) : null;
  if(badgeItem && (badgeItem.art || (badgeItem.value && String(badgeItem.value).startsWith('art/')))){
    const src = badgeItem.art || badgeItem.value;
    avatarHtml = `<img class="badge-avatar" src="${src}" alt="Badge" title="${badgeItem.name||'Badge'}"/>`;
  }

  badge.innerHTML =
    `<div class="login-user-badge">`+
      `<span class="badge-identity${frameClass}" role="button" tabindex="0" title="Open your profile" onclick="openOwnProfile()">`+
        avatarHtml+
        `<span class="badge-label">Playing as</span> `+
        `<strong${nameStyle}>${currentUser.display_name}</strong>`+
        titleHtml+
      `</span>`+
      `<button type="button" class="btn-logout" onclick="doLogout()">Log out</button>`+
    `</div>`;
}

let ppTab = 'overview';
let viewingProfilePlayer = null;

function openOwnProfile(){
  viewingProfilePlayer = null;
  if(typeof viewingPlayer !== 'undefined') viewingPlayer = null;
  navGo('profile');
}

function renderViewedPlayerProfile(){
  const p = viewingProfilePlayer;
  if(!p) return;
  const name = p.display_name || p.username || 'Trainer';
  const uname = p.username || 'trainer';
  const stats = p.stats || {};
  const col = p.collection || {};
  const released = (typeof releasedCards === 'function') ? releasedCards() : ((typeof CARDS !== 'undefined') ? CARDS : []);
  const ownedCards = released.filter(c => (typeof colGet === 'function' ? colGet(col,c) : Number(col[c.id]||0)) > 0);
  const total = released.length;
  const owned = ownedCards.length;
  const pct = total ? Math.round(owned/total*100) : 0;
  const online = getOnlinePlayerIds().has(String(p.id));
  const eq = stats.cosmeticsEquipped || {};
  const titleItem = eq.title ? COSMETICS.find(c=>c.id===eq.title) : null;
  const badgeItem = eq.badge ? COSMETICS.find(c=>c.id===eq.badge) : null;
  const setTxt=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
  setTxt('pp-name',name);
  const tagEl=document.getElementById('pp-tag');
  if(tagEl) tagEl.innerHTML='@'+String(uname).replace(/</g,'')+' · <b style="color:'+(online?'#4ade80':'var(--muted)')+'">'+(online?'Online now':'Offline')+'</b>';
  const rankEl=document.getElementById('pp-rank');
  if(rankEl) rankEl.innerHTML='<i>♛</i> <span>'+(titleItem?titleItem.value:'Collector')+'</span>';
  const avEl=document.getElementById('pp-avatar');
  if(avEl){
    if(badgeItem && (badgeItem.art || (badgeItem.value && String(badgeItem.value).startsWith('art/')))) avEl.innerHTML='<img src="'+(badgeItem.art||badgeItem.value)+'" alt="">';
    else avEl.textContent=online?'⚡':'◇';
  }
  setTxt('pp-stat-col',owned+(total?' / '+total:''));
  setTxt('pp-stat-rare',String(stats.holosPulled||0));
  setTxt('pp-stat-packs',String(stats.packsOpened||0));
  setTxt('pp-stat-trades',String(stats.tradesCompleted||0));
  const actions=document.querySelector('#profile .pp-actions');
  if(actions) actions.innerHTML='<button type="button" class="btn btn-secondary" onclick="viewingProfilePlayer=null;navGo(\'players\')">← Players</button>';
  const tabs=document.getElementById('pp-tabs');
  if(tabs) tabs.querySelectorAll('.pp-tab').forEach(b=>{
    b.classList.toggle('active',b.getAttribute('data-pptab')===ppTab);
    b.onclick=()=>{ppTab=b.getAttribute('data-pptab');renderViewedPlayerProfile()};
  });
  const view=document.getElementById('pp-view'); if(!view)return;
  const featured=ownedCards.slice().sort((a,b)=>(Number(b.price)||0)-(Number(a.price)||0)).slice(0,8);
  const esc=x=>String(x||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const cardHtml=c=>'<div class="pp-card"><div class="pp-art">'+(c.art?'<img src="'+c.art+'" alt="">':(c.emoji||'🃏'))+'</div><b>'+esc(c.name)+'</b><small>'+esc(c.rarityLabel||c.rarity||'')+'</small></div>';
  const claims=stats.achievementClaims||{};
  const recentAch=(typeof achievementCatalog!=='undefined'?achievementCatalog:[]).filter(a=>claims[a.id]&&claims[a.id].claimed).sort((a,b)=>(claims[b.id].claimedAt||0)-(claims[a.id].claimedAt||0)).slice(0,12);
  if(ppTab==='overview'){
    view.innerHTML='<div class="pp-content"><div class="pp-column"><section class="pp-panel"><div class="pp-panel-head"><h2>Featured pulls</h2><button type="button" onclick="ppTab=\'collection\';renderViewedPlayerProfile()">View collection ›</button></div><div class="pp-showcase">'+(featured.length?featured.map(cardHtml).join(''):'<div class="pp-empty">No cards collected yet.</div>')+'</div></section><section class="pp-panel"><div class="pp-panel-head"><h2>Recent unlocks</h2></div>'+(recentAch.length?recentAch.slice(0,5).map(a=>'<div class="pp-event"><div class="pp-event-icon">'+(a.icon||'🏅')+'</div><div><p><b>'+esc(a.name)+'</b></p><small>Achievement</small></div></div>').join(''):'<div class="pp-empty">No achievements claimed yet.</div>')+'</section></div><div class="pp-column"><section class="pp-panel"><h2>Collection progress</h2><div class="pp-progress-row"><div class="pp-ring" style="--pp-pct:'+pct+'%"><b>'+pct+'%</b></div><div><b>'+owned+' cards collected</b><p style="color:var(--muted);font-size:.8rem;margin:.35rem 0 0">'+(total-owned)+' more to complete the catalog.</p><div class="pp-bar"><i style="width:'+pct+'%"></i></div></div></div></section><section class="pp-panel"><h2>Trainer status</h2><div class="pp-goal"><div class="pp-goal-icon">'+(online?'⚡':'◇')+'</div><div><b>'+(online?'Online now':'Offline')+'</b><span>@'+esc(uname)+'</span></div></div></section></div></div>';
  }else if(ppTab==='collection'){
    view.innerHTML='<section class="pp-panel"><div class="pp-panel-head"><h2>'+esc(name)+'\'s cards</h2></div><div class="pp-showcase">'+(featured.length?featured.map(cardHtml).join(''):'<div class="pp-empty">No cards collected yet.</div>')+'</div></section>';
  }else if(ppTab==='achievements'){
    const badges=recentAch.length?recentAch.map(a=>'<div class="pp-badge" title="'+esc(a.name).replace(/"/g,'&quot;')+'">'+(a.icon||'🏅')+'</div>').join(''):'<div class="pp-empty">No achievements claimed yet.</div>';
    view.innerHTML='<div class="pp-content"><section class="pp-panel"><div class="pp-panel-head"><h2>Achievement cabinet</h2></div><div class="pp-achievements">'+badges+'</div></section></div>';
  }else{
    view.innerHTML='<section class="pp-panel"><h2>Activity</h2>'+(recentAch.length?recentAch.map(a=>'<div class="pp-event"><div class="pp-event-icon">'+(a.icon||'🏅')+'</div><div><p><b>Earned '+esc(a.name)+'</b></p><small>Achievement unlocked</small></div></div>').join(''):'<div class="pp-empty">No public activity yet.</div>')+'</section>';
  }
}

function renderPlayerProfile(){
  if(viewingProfilePlayer){ renderViewedPlayerProfile(); return; }

  if(!currentUser) return;
  const name = currentUser.display_name || currentUser.username || 'Trainer';
  const uname = currentUser.username || 'trainer';
  const nameEl = document.getElementById('pp-name');
  const tagEl = document.getElementById('pp-tag');
  const rankEl = document.getElementById('pp-rank');
  const avEl = document.getElementById('pp-avatar');
  if(nameEl) nameEl.textContent = name;
  if(tagEl) tagEl.innerHTML = '@' + String(uname).replace(/</g,'') + ' · <b>Online</b>';
  const eq = state.cosmeticsEquipped || {};
  const titleItem = eq.title ? COSMETICS.find(c => c.id === eq.title) : null;
  const badgeItem = eq.badge ? COSMETICS.find(c => c.id === eq.badge) : null;
  if(rankEl){
    rankEl.innerHTML = '<i>♛</i> <span>' + (titleItem ? titleItem.value : 'Collector') + '</span>';
  }
  if(avEl){
    if(badgeItem && (badgeItem.art || (badgeItem.value && String(badgeItem.value).startsWith('art/')))){
      avEl.innerHTML = '<img src="' + (badgeItem.art || badgeItem.value) + '" alt="">';
    } else {
      avEl.textContent = '⚡';
    }
  }
  const st = state.stats || {};
  const released = (typeof releasedCards === 'function') ? releasedCards() : ((typeof CARDS !== 'undefined') ? CARDS : []);
  const owned = state.collection
    ? released.filter(c => (typeof colGet === 'function' ? colGet(state.collection, c) : 0) > 0).length : 0;
  const total = released.length;
  const setTxt = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  setTxt('pp-stat-col', owned + (total ? (' / ' + total) : ''));
  setTxt('pp-stat-rare', String(st.holosPulled || 0));
  setTxt('pp-stat-packs', String(st.packsOpened || 0));
  setTxt('pp-stat-trades', String(st.tradesCompleted || 0));

  const tabs = document.getElementById('pp-tabs');
  if(tabs){
    tabs.querySelectorAll('.pp-tab').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-pptab') === ppTab);
      b.onclick = () => { ppTab = b.getAttribute('data-pptab'); renderPlayerProfile(); };
    });
  }
  const view = document.getElementById('pp-view');
  if(!view) return;

  let featured = [];
  if(typeof CARDS !== 'undefined' && state.collection){
    featured = CARDS.filter(c => (typeof colGet === 'function' ? colGet(state.collection, c) : 0) > 0)
      .sort((a,b) => (Number(b.price)||0) - (Number(a.price)||0)).slice(0, 8);
  }
  const pct = total ? Math.round(owned / total * 100) : 0;

  const claims = (typeof achEnsureClaims === 'function') ? achEnsureClaims() : (state.achievementClaims || {});
  const recentAch = (typeof achievementCatalog !== 'undefined' ? achievementCatalog : [])
    .filter(a => claims[a.id] && claims[a.id].claimed)
    .sort((a,b) => (claims[b.id].claimedAt||0) - (claims[a.id].claimedAt||0)).slice(0, 12);

  function cardHtml(c){
    const art = c.art ? ('<img src="' + c.art + '" alt="">') : (c.emoji || '🃏');
    return '<div class="pp-card"><div class="pp-art">' + art + '</div><b>' +
      String(c.name||'').replace(/</g,'&lt;') + '</b><small>' +
      (c.rarityLabel || c.rarity || '') + '</small></div>';
  }
  function achEvent(a){
    const when = typeof achFormatClaimedAt === 'function' ? achFormatClaimedAt(a.id) : '';
    return '<div class="pp-event"><div class="pp-event-icon">' + (a.icon||'🏅') +
      '</div><div><p><b>' + String(a.name||'').replace(/</g,'&lt;') +
      '</b></p><small>Achievement</small></div><time>' + (when||'') + '</time></div>';
  }

  if(ppTab === 'overview'){
    view.innerHTML =
      '<div class="pp-content"><div class="pp-column">' +
        '<section class="pp-panel"><div class="pp-panel-head"><h2>Featured pulls</h2>' +
        '<button type="button" onclick="navGo(&quot;collection&quot;)">View collection ›</button></div>' +
        '<div class="pp-showcase">' +
        (featured.length ? featured.map(cardHtml).join('') : '<div class="pp-empty">Open packs to feature cards here.</div>') +
        '</div></section>' +
        '<section class="pp-panel"><div class="pp-panel-head"><h2>Recent unlocks</h2>' +
        '<button type="button" onclick="navGo(&quot;achievements&quot;)">View all ›</button></div>' +
        (recentAch.length ? recentAch.slice(0,5).map(achEvent).join('') : '<div class="pp-empty">No achievements claimed yet.</div>') +
        '</section></div><div class="pp-column">' +
        '<section class="pp-panel"><h2>Collection progress</h2><div class="pp-progress-row">' +
        '<div class="pp-ring" style="--pp-pct:' + pct + '%"><b>' + pct + '%</b></div>' +
        '<div><b>' + owned + ' cards collected</b>' +
        '<p style="color:var(--muted);font-size:.8rem;margin:.35rem 0 0">' + (total - owned) + ' more to complete the catalog.</p>' +
        '<div class="pp-bar"><i style="width:' + pct + '%"></i></div></div></div></section>' +
        '<section class="pp-panel"><h2>Quick links</h2>' +
        '<div class="pp-goal"><div class="pp-goal-icon">🎴</div><div><b>Open packs</b><span>Build your collection</span></div></div>' +
        '<div class="pp-goal"><div class="pp-goal-icon">🤝</div><div><b>Trade room</b><span>Swap with trainers</span></div></div>' +
        '<div class="pp-goal"><div class="pp-goal-icon">🏅</div><div><b>Achievements</b><span>' + recentAch.length + ' claimed recently</span></div></div>' +
        '</section></div></div>';
  } else if(ppTab === 'collection'){
    view.innerHTML =
      '<div class="pp-panel"><div class="pp-panel-head"><h2>Your cards</h2>' +
      '<button type="button" onclick="navGo(&quot;collection&quot;)">Full collection ›</button></div>' +
      '<div class="pp-showcase">' +
      (featured.length ? featured.map(cardHtml).join('') : '<div class="pp-empty">No cards yet.</div>') +
      '</div></div>';
  } else if(ppTab === 'achievements'){
    const badges = recentAch.length
      ? recentAch.map(a => '<div class="pp-badge" title="' + String(a.name||'').replace(/"/g,'&quot;') + '">' + (a.icon||'🏅') + '</div>').join('') +
        Array(Math.max(0, 6 - recentAch.length)).fill('<div class="pp-badge locked" title="More to unlock">🔒</div>').join('')
      : '<div class="pp-empty">Claim achievements to fill your cabinet.</div>';
    view.innerHTML =
      '<div class="pp-content"><section class="pp-panel"><div class="pp-panel-head"><h2>Achievement cabinet</h2>' +
      '<button type="button" onclick="navGo(&quot;achievements&quot;)">Open board ›</button></div>' +
      '<div class="pp-achievements">' + badges + '</div></section></div>';
  } else {
    view.innerHTML =
      '<div class="pp-panel"><h2>Activity</h2>' +
      (recentAch.length
        ? recentAch.map(a => {
            const when = typeof achFormatClaimedAt === 'function' ? achFormatClaimedAt(a.id) : '';
            return '<div class="pp-event"><div class="pp-event-icon">' + (a.icon||'🏅') +
              '</div><div><p><b>Earned ' + String(a.name||'').replace(/</g,'&lt;') +
              '</b></p><small>Achievement unlocked</small></div><time>' + (when||'') + '</time></div>';
          }).join('')
        : '<div class="pp-empty">Activity will show pack opens, trades, and unlocks.</div>') +
      '</div>';
  }
}


function renderCosmeticsShop(){
  const grid = document.getElementById('cosmetics-grid');
  if(!grid) return;
  let list = COSMETICS.slice();
  if(cosmoCatFilter && cosmoCatFilter !== 'all'){
    list = list.filter(c => c.cat === cosmoCatFilter);
  }
  grid.innerHTML = list.map(item => {
    const owned = ownsCosmetic(item.id);
    const equipped = isEquipped(item.id);
    let btn;
    const priceNow = cosmeticPrice(item);
    const onSale = shopSaleActive('cosmetic') > 0 && priceNow < item.price;
    if(!owned){
      btn = `<button class="btn" onclick="buyCosmetic('${item.id}')">Buy $${priceNow.toFixed(0)}</button>`;
    } else if(equipped){
      btn = `<button class="btn btn-secondary" onclick="equipCosmetic('${item.id}')">Equipped ✓</button>`;
    } else {
      btn = `<button class="btn btn-secondary" onclick="equipCosmetic('${item.id}')">Equip</button>`;
    }
    const tag = owned ? '<div style="font-size:.72rem;color:#4ade80;margin-bottom:.25rem">Owned</div>' : '';
    let preview = '';
    if((item.cat === 'packSleeve' || item.cat === 'cardBack' || item.cat === 'binderTheme' || item.cat === 'badge') && (item.art || (item.value && String(item.value).startsWith('art/')))){
      const src = item.art || item.value;
      const isBack = item.cat === 'cardBack';
      const isBinder = item.cat === 'binderTheme';
      const isBadge = item.cat === 'badge';
      const click = isBack ? `previewCardBack('${src}')` : (isBinder ? `previewBinderArt('${item.id}')` : `previewPackArt('${src}')`);
      const imgStyle = isBadge
        ? 'width:96px;height:96px;object-fit:contain;display:block;margin:0 auto;border-radius:50%'
        : 'width:100%;max-width:110px;height:150px;object-fit:contain;display:block;margin:0 auto';
      preview = `<div style="background:#000;border-radius:8px;padding:.4rem;margin-bottom:.5rem;cursor:pointer" onclick="${click}" title="Preview">
        <img src="${src}" alt="${item.name}" style="${imgStyle}"/>
      </div>`;
    }
    const priceHtml = onSale
      ? `<div class="price"><span style="text-decoration:line-through;color:#8b9bb8;font-size:.85rem;margin-right:.35rem">$${item.price.toFixed(2)}</span>$${priceNow.toFixed(2)}</div>`
      : `<div class="price">$${priceNow.toFixed(2)}</div>`;
    return `<div class="shop-item">
      ${preview}
      <h3>${item.name}</h3>
      ${tag}
      <p style="color:var(--muted);font-size:.85rem">${item.desc}</p>
      ${priceHtml}
      ${btn}
    </div>`;
  }).join('');
}

function previewPackArt(src){
  if(!src) return;
  setPackArt(src);
  showToast('Preview — equip to keep after purchase');
}
function previewBinderArt(id){
  const item = COSMETICS.find(c => c.id === id);
  if(!item) return;
  if(!state.cosmeticsEquipped) state.cosmeticsEquipped = {};
  const prev = state.cosmeticsEquipped.binderTheme;
  state.cosmeticsEquipped.binderTheme = id;
  applyCosmetics();
  if(typeof navGo === 'function') navGo('binder');
  showToast('Preview: '+item.name+' — equip from shop to keep');
  // soft preview: if not owned, revert after they leave is complex; keep equipped only if owned
  if(!ownsCosmetic(id)){
    state.cosmeticsEquipped.binderTheme = prev || null;
    // still show art once
    const art = item.art || item.value;
    if(art){
      document.body.classList.add('cosmo-binder-art');
      document.body.style.setProperty('--binder-cover-art', 'url("'+art+'")');
      if(typeof renderBinderShelf === 'function') renderBinderShelf();
    }
  }
}
function previewCardBack(src){
  if(!src) return;
  setCardBackArt(src);
  showToast('Preview — equip to keep after purchase');
}

function showToast(m){ const t=document.getElementById('toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }

function packsBreakdownHTML(){
  ensurePackQueue();
  const counts = {};
  (state.packQueue||[]).forEach(s => { counts[s] = (counts[s]||0)+1; });
  const keys = Object.keys(counts).sort();
  if(!keys.length) return '<div class="pb-set">No packs</div>';
  return keys.map(k => '<div><span class="pb-set">'+k+'</span><span class="pb-n">×'+counts[k]+'</span></div>').join('');
}
function updatePacksBreakdown(){
  const html = packsBreakdownHTML();
  ['packs-breakdown','packs-breakdown-top'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = html;
  });
}
function updateUI(){
  const money = state.money.toFixed(2);
  const packs = state.packs;
  const released = (typeof releasedCards === 'function') ? releasedCards() : CARDS;
  const owned = released.filter(c=>colGet(state.collection, c)>0).length;
  const setText = (id, val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
  setText('money', money);
  setText('packs', packs);
  setText('money-top', money);
  setText('packs-top', packs);
  setText('owned-count', owned);
  setText('total-cards', released.length);
  if(typeof updateHomeDashboard === 'function') updateHomeDashboard();
  if(typeof updateCollectionProgress === 'function') updateCollectionProgress();
  updatePacksBreakdown();
  const openBtn = document.getElementById('open-btn');
  if(openBtn) openBtn.disabled = state.packs<1 || opening.active;
  updateDailyUI();
  if(typeof updateDailyWheelUI === 'function') updateDailyWheelUI();
  if(typeof updateOpenSetStatus === 'function') updateOpenSetStatus();
  if(typeof updateQuestBadge === 'function') updateQuestBadge();
  if(typeof completeResearchJobs === 'function'){
    if(completeResearchJobs()){
      if(typeof renderCatalog === 'function') renderCatalog();
      if(zoomCardId != null){
        const c = CARDS.find(x => x.id === zoomCardId);
        if(c && typeof renderZoomCopyUI === 'function') renderZoomCopyUI(c);
      }
    }
  }
}

function getRandomRarity(){
  const total=Object.values(RARITY_WEIGHTS).reduce((a,b)=>a+b,0);
  let r=Math.random()*total;
  for(const [rar,w] of Object.entries(RARITY_WEIGHTS)){ r-=w; if(r<=0) return rar; }
  return 'common';
}
function pullCard(){
  const rarity=getRandomRarity();
  const source=(typeof releasedCards==='function')?releasedCards():CARDS;
  const pool=source.filter(c=>c.rarity===rarity);
  return pool[Math.floor(Math.random()*pool.length)] || source[0];
}

function tcgHTML(card, big){
  const border = TYPE_COLORS[card.type1] || '#888';
  if(card.art){
    if(big) return `<div class="new-tag" id="new-tag" style="display:none">NEW</div><img src="${card.art}" alt="${card.name}" class="full-card-img"/>`;
    return `<img src="${card.art}" alt="${card.name}" class="full-card-img"/>`;
  }
  const label = card.rarityLabel || card.rarity;
  if(big){
    return `<div class="new-tag" id="new-tag" style="display:none">NEW</div>
      <div class="tcg-top"><span><span class="tcg-stage">${card.setCode||'BS'}</span> ${card.name}</span><span class="tcg-hp">${card.cardNumber||''}</span></div>
      <div class="tcg-art" style="background:linear-gradient(160deg,${border}55,#fff8)">${card.emoji}<span class="tcg-type-badge">${card.type1}</span></div>
      <div class="tcg-info">${card.set} · ${label}</div>
      <div class="tcg-attack"><span>${card.emoji} ${card.name}</span><span class="tcg-dmg">${card.cardNumber||''}</span></div>
      <div class="tcg-bottom"><span>${label}</span><span>$${(card.price||0).toFixed(2)}</span></div>`;
  }
  return `<div class="tcg-top"><span><span class="tcg-stage">${card.setCode||'BS'}</span> ${card.name}</span></div>
    <div class="tcg-art" style="background:linear-gradient(160deg,${border}55,#fff8)">${card.emoji}</div>
    <div class="tcg-attack"><span>${label}</span><span>${card.cardNumber||''}</span></div>
    <div class="tcg-bottom"><span>${card.set}</span><span>${card.cardNumber||''}</span></div>`;
}

const DEFAULT_PACK_ART = "art/packs/poke-ball.webp";
const PACK_ARTS = ["art/packs/poke-ball.webp"];


const DEFAULT_CARD_BACK = "art/card-back.webp";
function getCardBackArt(){
  try {
    const eq = state && state.cosmeticsEquipped;
    if(eq && eq.cardBack){
      const item = COSMETICS.find(c => c.id === eq.cardBack);
      if(item && item.art) return item.art;
      if(item && item.value && String(item.value).startsWith('art/')) return item.value;
    }
  } catch(e){}
  return DEFAULT_CARD_BACK;
}
function setCardBackArt(src){
  const url = src || getCardBackArt();
  document.querySelectorAll('img.card-back-img, img#zoom-card-back').forEach(img => {
    if(img) img.src = url;
  });
  // reveal stage back
  const revealBack = document.querySelector('.reveal-back img');
  if(revealBack) revealBack.src = url;
}

function randomPackArt(){
  // Equipped pack art OR badge overrides default Poké Ball
  try {
    const eq = state && state.cosmeticsEquipped;
    if(eq && eq.packSleeve){
      const item = COSMETICS.find(c => c.id === eq.packSleeve);
      if(item && item.art) return item.art;
      if(item && item.value && String(item.value).startsWith('art/')) return item.value;
    }
    // Badge also replaces the pack Poké Ball when no pack sleeve is equipped
    if(eq && eq.badge){
      const item = COSMETICS.find(c => c.id === eq.badge);
      if(item && item.art) return item.art;
      if(item && item.value && String(item.value).startsWith('art/')) return item.value;
    }
  } catch(e){}
  return DEFAULT_PACK_ART;
}

function setPackArt(src){
  ['pack-art','rip-pack-art'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.src = src;
  });
}


// Higher market price → lower pull chance.
// weight = 1 / (price + floor)^power
const PULL_PRICE_FLOOR = 2;
const PULL_PRICE_POWER = 1.35;

function cardPullWeight(card){
  const price = Math.max(0, Number(card.price) || 0);
  return 1 / Math.pow(price + PULL_PRICE_FLOOR, PULL_PRICE_POWER);
}

function pickWeighted(pool, used){
  const available = pool.filter(c => !used.has(c.id));
  const source = available.length ? available : pool.slice();
  if(!source.length) return null;
  let total = 0;
  const weights = source.map(c => {
    const w = cardPullWeight(c);
    total += w;
    return w;
  });
  if(total <= 0){
    const card = source[Math.floor(Math.random() * source.length)];
    used.add(card.id);
    return card;
  }
  let r = Math.random() * total;
  for(let i = 0; i < source.length; i++){
    r -= weights[i];
    if(r <= 0){
      used.add(source[i].id);
      return source[i];
    }
  }
  const card = source[source.length - 1];
  used.add(card.id);
  return card;
}

function pickFromRarity(rarityKey, count, used, setName){
  // Picks weighted by market price within the rarity pool (higher price = lower chance)
  const pool = CARDS.filter(c => c.rarity === rarityKey && (!setName || c.set === setName));
  const picks = [];
  for(let i = 0; i < count; i++){
    const card = pickWeighted(pool, used);
    if(card) picks.push(card);
  }
  return picks;
}

function pickRareSlot(used, setName){
  // Rare slot = epic + legendary, odds driven by PRICE (not flat 1/3 holo).
  // Cheap rares dominate; expensive chase cards are much rarer.
  // Daily Luck Wheel buffs can tilt epic vs holo (Charizard excluded from holo boost).
  // Echo Pulls: mild family-wide tilt while countdown is active.
  const buffs = state.luckBuffs || {};
  const hasRare = (buffs.rarePacksLeft || 0) > 0;
  const hasHolo = (buffs.holoPacksLeft || 0) > 0;
  const echoOn = (typeof echoIsActive === 'function' && echoIsActive());
  let pool = CARDS.filter(c => (c.rarity === 'epic' || c.rarity === 'legendary') && (!setName || c.set === setName));
  if(echoOn && !hasRare && !hasHolo){
    // Mild boost: ~35% chance to prefer non-Charizard holos during Echo
    const holoPool = pool.filter(c => c.rarity === 'legendary' && !(typeof isCharizardCard === 'function' && isCharizardCard(c)));
    if(holoPool.length && Math.random() < 0.35) pool = holoPool;
  }
  if(hasHolo && !hasRare){
    // Prefer non-Charizard holos; fall back to full pool
    const holoPool = pool.filter(c => c.rarity === 'legendary' && !(typeof isCharizardCard === 'function' && isCharizardCard(c)));
    if(holoPool.length && Math.random() < 0.55) pool = holoPool;
  } else if(hasRare && !hasHolo){
    const epicPool = pool.filter(c => c.rarity === 'epic');
    if(epicPool.length && Math.random() < 0.62) pool = epicPool;
  } else if(hasRare && hasHolo){
    // Both: mild tilt toward epic, then non-Charizard holo
    const r = Math.random();
    if(r < 0.40){
      const epicPool = pool.filter(c => c.rarity === 'epic');
      if(epicPool.length) pool = epicPool;
    } else if(r < 0.70){
      const holoPool = pool.filter(c => c.rarity === 'legendary' && !(typeof isCharizardCard === 'function' && isCharizardCard(c)));
      if(holoPool.length) pool = holoPool;
    }
  }
  return pickWeighted(pool, used);
}

function availableBoosterSets(){
  // Sets that can appear in normal booster packs (excludes promo-only sets, e.g. "Wizards Black Star Promos").
  // Driven by the Supabase `sets` table — a new set is included automatically, no code edits needed.
  if (SETS && SETS.length) {
    const eligible = (typeof boosterEligibleSets === 'function') ? boosterEligibleSets() : SETS.filter(s => !/promo/i.test(s.name || ''));
    return eligible.map(s => s.name);
  }
  return ['Base Set', 'Jungle', 'Fossil'].filter(s => CARDS.some(c => c.set === s));
}

function buildPack(setName){
  // Structure: 1 rare-slot + 3 uncommon + 7 common
  // Inside each pool, probability follows market price (expensive = rarer).
  const sets = availableBoosterSets();
  if(!setName){
    // Prefer the set selected on Open Packs screen
    const prefer = (typeof selectedOpenSet === 'string' && selectedOpenSet) ? selectedOpenSet : null;
    ensurePackQueue();
    if(prefer){
      const idx = state.packQueue.indexOf(prefer);
      if(idx >= 0){
        state.packQueue.splice(idx, 1);
        setName = prefer;
      } else if(state.packQueue.length){
        // fall back to next queued pack
        setName = state.packQueue.shift();
      } else {
        setName = prefer;
      }
    } else if(state.packQueue.length){
      setName = state.packQueue.shift();
    } else {
      setName = sets[Math.floor(Math.random() * sets.length)] || 'Base Set';
    }
  }
  // Mystery Box Friday — mixed-set high-variance pack
  if(setName === MYSTERY_BOX_SET || setName === 'Mystery Box'){
    return buildMysteryPack();
  }
  const used = new Set();
  const cards = [];
  const rare = pickRareSlot(used, setName);
  if(rare) cards.push(rare);
  cards.push(...pickFromRarity('uncommon', 3, used, setName));
  cards.push(...pickFromRarity('common', 7, used, setName));
  for(let i = cards.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  // Tag pack for UI
  cards._packSet = setName;
  window._lastPackSet = setName;
  return cards;
}

function startOpenPack(){
  if(opening.active) return;
  if(state.packs<1){ showToast('No packs left!'); return; }
  ensurePackQueue();
  const prefer = selectedOpenSet || 'Base Set';
  if(countPacksForSet(prefer) < 1){
    showToast('No ' + prefer + ' packs — buy some in Shop → Packs');
    return;
  }
  beginPackOpen(false);
}


function beginPackOpen(skipRip){
  if(opening.active && !skipRip) return;
  // If called from swipe, opening may already be inactive still - always check packs
  if(state.packs<1 && !opening.active){ showToast('No packs left!'); return; }

  // Only deduct pack once when starting fresh
  if(!opening.active || !opening.cards || !opening.cards.length){
    if(state.packs<1){ showToast('No packs left!'); return; }
    ensurePackQueue();
    const selectedSet = selectedOpenSet || 'Base Set';
    if(countPacksForSet(selectedSet) < 1){
      showToast('No ' + selectedSet + ' packs — select a set you own or buy some in Shop → Packs');
      resetPackSwipeUI();
      return;
    }
    state.packs--;
    opening={active:true,cards:[],index:0,flipped:false,revealed:new Set()};
    const packCards = buildPack();
    if(typeof consumeLuckBuffOnPackOpen === 'function') consumeLuckBuffOnPackOpen();
    for(const card of packCards){
      const wasNew=colGet(state.collection, card)===0;
      colSet(state.collection, card, colGet(state.collection, card) + 1);
      opening.cards.push({...card,isNew:wasNew});
    }
    save(); updateUI();
  } else {
    opening.active = true;
  }

  const art = randomPackArt();
  setPackArt(art);

  const goReveal = ()=>{
    dismissLastPack();
    document.getElementById('pack-idle').style.display='none';
    document.getElementById('rip-stage').style.display='none';
    document.getElementById('reveal-stage').classList.add('active');
    renderOpeningPackPreview();
    // Prep next sealed pack art (hidden until Done)
    const nextArt = randomPackArt();
    setPackArt(nextArt);
    resetPackVisual();
    showCard(0, false);
  };

  // The premium altar replaces the former tear animation.
  goReveal();
}




function resetPackVisual(){
  const pack = document.getElementById('pack-visual');
  const line = document.getElementById('pack-tear-line');
  const body = pack ? pack.querySelector('.pack-body') : null;
  const hint = document.getElementById('pack-swipe-hint');
  if(pack){
    pack.classList.remove('swiping','ripping-now','pack-opening');
  }
  if(line) line.style.width = '0';
  if(body){
    body.style.transition = 'none';
    body.style.transform = '';
    body.style.opacity = '1';
    body.style.filter = '';
    void body.offsetWidth;
    body.style.transition = '';
  }
  if(hint) hint.style.opacity = '';
  packSwipe = {active:false, startX:0, startY:0, progress:0};
}

function resetPackSwipeUI(){
  resetPackVisual();
}

function packIdleVisible(){
  const reveal = document.getElementById('reveal-stage');
  if(reveal && reveal.classList.contains('active')) return false;
  const idle = document.getElementById('pack-idle');
  if(!idle) return false;
  return window.getComputedStyle(idle).display !== 'none';
}

function packPointerDown(e){
  if(opening.active || state.packs < 1) return;
  if(!packIdleVisible()) return;
  const pack = document.getElementById('pack-visual');
  if(!pack) return;

  const clientX = e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX);
  const clientY = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY);
  if(clientX == null) return;

  packSwipe.active = true;
  packSwipe.startX = clientX;
  packSwipe.startY = clientY ?? 0;
  packSwipe.progress = 0;
  pack.classList.add('swiping','ripping-now');
  try { e.preventDefault(); } catch(err){}
  try { pack.setPointerCapture(e.pointerId); } catch(err){}
}

function packPointerMove(e){
  if(!packSwipe.active) return;
  const pack = document.getElementById('pack-visual');
  if(!pack) return;
  const clientY = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY);
  if(clientY == null) return;
  const rect = pack.getBoundingClientRect();
  const dy = clientY - packSwipe.startY;
  const progress = Math.max(0, Math.min(1, dy / (rect.height * 0.28)));
  packSwipe.progress = progress;
  const line = document.getElementById('pack-tear-line');
  if(line) line.style.width = (progress * 100).toFixed(1) + '%';
  const body = pack.querySelector('.pack-body');
  if(body){
    const shake = Math.sin(progress * 18) * progress * 2.5;
    body.style.transform = 'translateY('+(progress * 11)+'px) translateX('+shake+'px) rotate('+(shake*0.35)+'deg)';
  }
  try { e.preventDefault(); } catch(err){}
}

function finishTopRipThenOpen(){
  packSwipe.active = false;
  resetPackVisual();
  beginPackOpen(true);
}

function packPointerUp(e){
  if(!packSwipe.active) return;
  const done = packSwipe.progress >= 0.42;
  packSwipe.active = false;
  const pack = document.getElementById('pack-visual');
  if(pack){
    try { pack.releasePointerCapture(e.pointerId); } catch(err){}
  }
  if(done){
    finishTopRipThenOpen();
  } else {
    const line = document.getElementById('pack-tear-line');
    if(line) line.style.width = '0';
    if(pack) pack.classList.remove('swiping','ripping-now');
    const body = pack && pack.querySelector('.pack-body');
    if(body){
      body.style.transition = 'transform .2s ease';
      body.style.transform = '';
    }
    setTimeout(function(){ resetPackVisual(); }, 220);
  }
}

function initPackSwipe(){
  const pack = document.getElementById('pack-visual');
  if(!pack) return;

  // Always (re)bind on the pack element so first load works
  if(!pack.dataset.swipeBound){
    pack.dataset.swipeBound = '1';
    pack.addEventListener('pointerdown', packPointerDown);
    pack.addEventListener('pointermove', packPointerMove);
    pack.addEventListener('pointerup', packPointerUp);
    pack.addEventListener('pointercancel', packPointerUp);
  }

  // Document-level fallback once (covers drag outside pack bounds)
  if(!window.__packSwipeDocBound){
    window.__packSwipeDocBound = true;
    document.addEventListener('pointermove', function(e){
      if(packSwipe && packSwipe.active) packPointerMove(e);
    }, {passive:false});
    document.addEventListener('pointerup', function(e){
      if(packSwipe && packSwipe.active) packPointerUp(e);
    });
    document.addEventListener('pointercancel', function(e){
      if(packSwipe && packSwipe.active) packPointerUp(e);
    });
  }
}


function previewBackURL(){
  return document.querySelector('.reveal-back img')?.src || 'art/card-back.webp';
}

function makeSealedPreviewCard(index){
  const mini = document.createElement('button');
  mini.type = 'button';
  mini.className = 'mini-card sealed';
  mini.id = 'mini-' + index;
  mini.setAttribute('aria-label', 'Face-down card ' + (index + 1) + ' — click to flip');
  mini.innerHTML = '<img src="' + previewBackURL() + '" alt="Face-down card">';
  mini.onmouseenter = null;
  mini.onmouseleave = null;
  mini.onclick = () => {
    if(opening && opening.active) showCard(index, true);
  };
  return mini;
}

function renderOpeningPackPreview(){
  const summary = document.getElementById('opened-summary');
  if(!summary) return;
  summary.innerHTML = '';
  for(let i=0;i<opening.cards.length;i++) summary.appendChild(makeSealedPreviewCard(i));
  const allButton = document.getElementById('reveal-all-btn');
  if(allButton) allButton.style.display = 'inline-block';
}

function fillPreviewCard(index, card){
  const mini = document.getElementById('mini-' + index);
  if(!mini) return;
  mini.className = 'mini-card shown';
  mini.style.borderColor = TYPE_COLORS[card.type1] || '#888';
  mini.innerHTML = card.art ? '<img src="' + card.art + '" alt="' + card.name + '">' : card.emoji;
  mini.setAttribute('aria-label', card.name + ' — click to inspect');
  mini.onmouseenter = null;
  mini.onmouseleave = null;
  mini.style.cursor = 'zoom-in';
  mini.onclick = () => {
    if(!opening || !opening.active) return;
    // Put this card in the center if needed, then binder-style zoom
    if(opening.index !== index || !opening.flipped){
      showCard(index, true);
    }
    if(typeof openBinderInspect === 'function') openBinderInspect(card);
  };
  if(opening && opening.active){
    if(!opening.revealed) opening.revealed = new Set();
    const alreadyRevealed = opening.revealed.has(index);
    opening.revealed.add(index);
    updateRevealFinishUI();
    // Echo Pulls: starts/refreshes the instant the holo is actually shown to the player —
    // not when they click Done — so sitting on a revealed card can't be used to delay it.
    if(!alreadyRevealed && card && card.rarity === 'legendary' && typeof triggerEchoFromHolo === 'function'){
      try{ triggerEchoFromHolo(card); }catch(e){ console.warn('[echo]', e); }
    }
  }
}

function revealAllCards(){
  if(!opening || !opening.active) return;
  opening.cards.forEach((card, index) => fillPreviewCard(index, card));
  const lastIndex = opening.cards.length - 1;
  showCard(lastIndex, true);
  updateRevealFinishUI();
}


function allCardsRevealed(){
  if(!opening || !opening.cards || !opening.cards.length) return false;
  if(!opening.revealed) opening.revealed = new Set();
  return opening.revealed.size >= opening.cards.length;
}
function updateRevealFinishUI(){
  const next = document.getElementById('next-btn');
  const done = document.getElementById('finish-btn');
  if(!next || !done) return;
  if(allCardsRevealed()){
    next.style.display = 'none';
    done.style.display = 'inline-block';
  } else {
    next.style.display = 'inline-block';
    done.style.display = 'none';
  }
}
function revealCurrentCard(){
  if(!opening.active || opening.flipped) return;
  const revealCard = document.getElementById('reveal-card');
  const alreadyFaceUp = revealCard.classList.contains('flipped');
  opening.flipped = true;
  revealCard.classList.add('flipped');
  document.getElementById('click-hint').style.display = 'none';
  document.getElementById('reveal-actions').style.display = 'flex';
  const card = opening.cards[opening.index];
  fillPreviewCard(opening.index, card);
  updateRevealFinishUI();
  // Pull celebrations by rarity + high value ($100+) — after flip lands
  if(typeof triggerPullCelebration === 'function'){
    triggerPullCelebration(revealCard, card, { immediate: alreadyFaceUp });
  } else if(card.rarity === 'legendary'){
    triggerHoloEffect(revealCard);
  }
  // Tell online family about great+ pulls
  if(typeof broadcastGoodPull === 'function') broadcastGoodPull(card);
    if(typeof claimFirstCharizard === 'function') try{ claimFirstCharizard(card); }catch(_z){}
  // Hint: click card to inspect (binder-style tilt)
  const hint = document.getElementById('click-hint');
  if(hint){
    hint.style.display = 'block';
    hint.textContent = 'Click card to inspect · Next / Done below';
  }
}

function showCard(idx, faceUp){
  opening.index = idx;
  opening.flipped = !!faceUp;
  const card = opening.cards[idx];
  const revealCard = document.getElementById('reveal-card');
  const front = document.getElementById('reveal-front');
  revealCard.classList.remove('holo-glow','tier-glow-nice','tier-glow-great','tier-glow-amazing','tier-glow-jackpot');
  const wrapper = revealCard.parentElement;
  if(wrapper) wrapper.querySelectorAll('.holo-banner,.pull-banner,.holo-sparkle').forEach(e=>e.remove());
  revealCard.classList.add('no-transition');
  revealCard.classList.remove('flipped');
  void revealCard.offsetWidth;
  front.style.borderColor = TYPE_COLORS[card.type1]||'#888';
  front.className = 'reveal-face reveal-front'+(card.art?' full-art':'');
  front.innerHTML = tcgHTML(card,true);
  const newTag = document.getElementById('new-tag');
  if(newTag) newTag.style.display = card.isNew ? 'block' : 'none';
  document.getElementById('card-counter').textContent = `Card ${idx+1} of ${opening.cards.length}`;

  if(faceUp){
    revealCard.classList.add('flipped');
    revealCard.classList.remove('no-transition');
    document.getElementById('click-hint').style.display = 'none';
    document.getElementById('reveal-actions').style.display = 'flex';
    opening.flipped = false;
    revealCurrentCard();
  } else {
    revealCard.classList.remove('no-transition');
    document.getElementById('click-hint').style.display = 'block';
    document.getElementById('click-hint').textContent = 'Click to flip · click again for next';
    document.getElementById('reveal-actions').style.display = 'none';
    document.getElementById('next-btn').style.display = 'inline-block';
    document.getElementById('finish-btn').style.display = 'none';
  }
}

function onCardClick(){
  if(!opening.active) return;
  if(!opening.flipped){
    revealCurrentCard();
  } else {
    // Same as binders: click the pulled card to inspect (tilt + shine)
    const card = opening.cards && opening.cards[opening.index];
    if(card && typeof openBinderInspect === 'function') openBinderInspect(card);
  }
}

function nextCard(){
  if(!opening.active) return;
  if(opening.index===0 && !opening.flipped){
    revealCurrentCard();
    return;
  }
  if(allCardsRevealed()){
    finishOpening();
    return;
  }
  // Prefer next unrevealed card after current index, else any unrevealed
  const n = opening.cards.length;
  let nextIdx = -1;
  for(let i = opening.index + 1; i < n; i++){
    if(!opening.revealed || !opening.revealed.has(i)){ nextIdx = i; break; }
  }
  if(nextIdx < 0){
    for(let i = 0; i < n; i++){
      if(!opening.revealed || !opening.revealed.has(i)){ nextIdx = i; break; }
    }
  }
  if(nextIdx >= 0) showCard(nextIdx, true);
  else finishOpening();
}






