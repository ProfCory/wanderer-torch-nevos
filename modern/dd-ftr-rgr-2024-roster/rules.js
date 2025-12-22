// rules.js - tiny rules data subset for UI + auto-features.
// This intentionally avoids copying large blocks of rules text.
// It provides only structure and names to support tracking.
window.RULES_2024 = {
  skills: [
    { key:"Acrobatics", ability:"DEX" },
    { key:"Animal Handling", ability:"WIS" },
    { key:"Arcana", ability:"INT" },
    { key:"Athletics", ability:"STR" },
    { key:"Deception", ability:"CHA" },
    { key:"History", ability:"INT" },
    { key:"Insight", ability:"WIS" },
    { key:"Intimidation", ability:"CHA" },
    { key:"Investigation", ability:"INT" },
    { key:"Medicine", ability:"WIS" },
    { key:"Nature", ability:"INT" },
    { key:"Perception", ability:"WIS" },
    { key:"Performance", ability:"CHA" },
    { key:"Persuasion", ability:"CHA" },
    { key:"Religion", ability:"INT" },
    { key:"Sleight of Hand", ability:"DEX" },
    { key:"Stealth", ability:"DEX" },
    { key:"Survival", ability:"WIS" }
  ],
  classes: {
    Fighter: {
      ref: "https://www.dndbeyond.com/classes/2190879-fighter",
      // Minimal feature map by level (names only) for tracking
      featuresByLevel: {
        1: ["Fighting Style", "Second Wind", "Weapon Mastery"],
        2: ["Action Surge", "Tactical Mind"],
        3: ["Fighter Subclass"],
        4: ["Ability Score Improvement"],
        5: ["Extra Attack", "Tactical Shift"],
        6: ["Ability Score Improvement"],
        7: ["Subclass Feature"],
        8: ["Ability Score Improvement"],
        9: ["Indomitable", "Tactical Master"],
        10:["Subclass Feature"],
        11:["Extra Attack (2)"],
        12:["Ability Score Improvement"],
        13:["Indomitable (2)"],
        14:["Ability Score Improvement"],
        15:["Subclass Feature"],
        16:["Ability Score Improvement"],
        17:["Action Surge (2)", "Indomitable (3)"],
        18:["Subclass Feature"],
        19:["Ability Score Improvement"],
        20:["Extra Attack (3)"]
      }
    },
    Rogue: {
      ref: "https://www.dndbeyond.com/classes/2190883-rogue",
      featuresByLevel: {
        1: ["Expertise", "Sneak Attack", "Thieves' Cant"],
        2: ["Cunning Action"],
        3: ["Rogue Subclass", "Steady Aim"],
        4: ["Ability Score Improvement"],
        5: ["Cunning Strike", "Uncanny Dodge"],
        6: ["Expertise (2)"],
        7: ["Evasion"],
        8: ["Ability Score Improvement"],
        9: ["Subclass Feature"],
        10:["Ability Score Improvement"],
        11:["Reliable Talent"],
        12:["Ability Score Improvement"],
        13:["Subclass Feature"],
        14:["Devious Strikes"],
        15:["Slippery Mind"],
        16:["Ability Score Improvement"],
        17:["Subclass Feature"],
        18:["Elusive"],
        19:["Ability Score Improvement"],
        20:["Stroke of Luck"]
      }
    }
  }
};