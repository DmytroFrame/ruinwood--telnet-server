/**
 * English strings: the reference dictionary. Every other locale must define the same keys
 * (enforced by the `Dictionary` type). Placeholders use `{name}` syntax.
 */
export const en = {
  "language.name": "English",
  "game.title": "RUINWOOD",
  "game.tagline": "an island of ruins, monsters and treasure",

  // Login screen
  "login.prompt": "What is your name, traveler? ",
  "login.invalidName": "Name: 2–16 letters, digits, _ or -",
  "login.nameTaken": "That hero is already in the game. Pick another name.",
  "login.online": "Players online: {count}",
  "login.tip": "Your name keeps your progress. Ctrl+C to quit.",
  "login.language": "Tab — language: {language}",

  // Connection
  "session.windowTooSmall": "Enlarge the window (now {cols}x{rows}, need {minCols}x{minRows}+)",
  "session.bye": "Farewell, traveler!",
  "server.full": "The server is full, try again later.",
  "server.shutdown": "The server is shutting down. Your progress is saved.",

  // Game events
  "event.welcome": "Welcome to Ruinwood, {name}!",
  "event.welcomeBack": "Welcome back, {name}! Level {level}.",
  "event.tips": "H — help, O — settings, 1-4 — hotbar. The campfire ¤ heals.",
  "event.joined": "→ {name} joined the game",
  "event.left": "← {name} left the game",
  "event.chat": "{name}: {text}",
  "event.online": "Online: {list}",
  "event.potionNone": "You're out of potions.",
  "event.potionFullHp": "You're already at full health.",
  "event.potionDrink": "You drink a potion (+{hp} HP).",
  "event.bombNone": "No bombs left.",
  "event.bombHit": "BOOM! The bomb hit {count} enemies.",
  "event.bombMiss": "BOOM! The bomb hit nothing.",
  "event.scrollNone": "No recall scrolls.",
  "event.scrollUse": "The scroll flares and you find yourself by the campfire.",
  "event.chest": "Chest: {loot}.",
  "event.heartFound": "{name} found a heart container!",
  "event.pickupGold": "+{amount} gold",
  "event.pickupPotion": "You picked up a potion.",
  "event.pickupBomb": "You picked up a bomb.",
  "event.pickupScroll": "You picked up a recall scroll.",
  "event.levelUp": "★ Level {level}! Attack +1, max HP +2.",
  "event.levelUpOther": "★ {name} reached level {level}",
  "event.death": "✝ Killed by {mob}. You dropped {gold} gold where you fell.",
  "event.deathOther": "✝ {name} was killed by {mob}",
  "event.respawn": "You wake up by the campfire.",
  "event.kill": "You defeated {mob} (lv. {level}) +{xp} XP",
  "event.soundOn": "♪ Sound on.",

  // Loot
  "loot.gold": "{amount} gold",
  "loot.potion": "a potion",
  "loot.bombs": "bombs ×{count}",
  "loot.scroll": "a recall scroll",
  "loot.heartContainer": "a heart container (+1 ♥ forever)",

  // Mobs
  "mob.slime": "Slime",
  "mob.bat": "Bat",
  "mob.wolf": "Wolf",
  "mob.goblin": "Goblin",
  "mob.skeleton": "Skeleton",
  "mob.golem": "Stone golem",

  // Zones
  "zone.sea": "Sea",
  "zone.shallows": "Shallows",
  "zone.beach": "Beach",
  "zone.meadow": "Meadow",
  "zone.forest": "Forest",
  "zone.hills": "Hills",
  "zone.cliffs": "Cliffs",
  "zone.peaks": "Peaks",
  "zone.ruins": "Ruins",
  "zone.camp": "Camp",

  // HUD
  "hud.online": "online {count}",
  "hud.level": "Lv {level} ",
  "hud.zone": "{zone} · danger {danger} · {x},{y}",
  "hud.target": "Target: {mob} lv.{level} ",
  "hud.dead": "  ✝ YOU DIED · respawn in {seconds}s  ",

  // Hotbar
  "item.sword": "Sword",
  "item.potion": "Potion",
  "item.bomb": "Bomb",
  "item.scroll": "Scroll",

  // Sidebar
  "sidebar.players": "PLAYERS ({count})",
  "sidebar.level": "lv.{level}",
  "sidebar.you": "(you)",
  "sidebar.more": "…{count} more (/who)",
  "sidebar.events": "EVENTS",

  // Status bar
  "chat.prompt": "Say: ",
  "chat.hint": "  Enter — send, Esc — cancel",
  "key.space": "Space",
  "hint.move": "move",
  "hint.attack": "attack",
  "hint.items": "items",
  "hint.chat": "chat",
  "hint.settings": "settings",
  "hint.help": "help",
  "hint.quit": "quit",

  // Help overlay
  "help.title": "CONTROLS",
  "help.move": "W A S D / arrows   move (bump to attack)",
  "help.attack": "Space / 1          sword strike",
  "help.potion": "2 / E              drink a potion",
  "help.bomb": "3                  throw a bomb (5x5)",
  "help.scroll": "4                  recall scroll to camp",
  "help.chat": "T                  chat (/who, /quit)",
  "help.settings": "O / Esc            settings",
  "help.help": "H                  this help",
  "help.quit": "Ctrl+C             quit",
  "help.legendMobs": "@ players   s v w g S G  mobs",
  "help.legendItems": "$ gold  ♥ heart  ! potion  ● bomb  § scroll",
  "help.legendCamp": "■ chest   ¤ campfire — heals, safe zone",
  "help.close": "press any key to close",

  // Settings menu
  "settings.title": "SETTINGS",
  "settings.language": "Language",
  "settings.sound": "Sound",
  "settings.nameTags": "Name tags",
  "settings.sidebar": "Side panel",
  "settings.camera": "Camera",
  "settings.hint": "↑↓ select · ←→ Enter change · Esc close",
  "value.on": "on",
  "value.off": "off",
  "value.auto": "auto",
  "value.always": "always",
  "value.never": "never",
  "value.smooth": "smooth",
  "value.centered": "centered",
} as const;
