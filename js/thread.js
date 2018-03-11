'use strict';

importScripts("tools.js");

let skills = {};
let armour = {};
let jewels = {};

let heads = {};
let chests = {};
let arms = {};
let waists = {};
let legs = {};

let build = null;
let run = false;
let sets = [];

function setup(data)
{
  build = data;
  run = true;

  // do a reduction on the gear set to make the search faster
  let filtered = Object.keys(armour);
  switch (build.class)
  {
    case "Blademaster":
      filtered = filter(armour, "type", "in", ["Both", "Blademaster"], filtered);
    break;
    case "Gunner":
      filtered = filter(armour, "type", "in", ["Both", "Bow", "Bowgun"], filtered);
    break;
  }
  build.filtered = filtered;

  // setup done, pass off to loop
  loop();
}

function reduce(from, filter)
{
  let to = {};
  for (const [name, piece] of Object.entries(from))
  {
    if (!filter.includes(name))
      continue;
    const skills = Object.keys(piece.skills);
    let include = true;
    build.skills.forEach(sk => {
      if (skills.includes(sk.stats.Jewel) == true || piece.skills[sk] < 0)
        include = false;
    });
    if (include)
      to[name] = piece;
  }
  return to;
}

function points(set, part)
{
  for (const [skill, points] of Object.entries(part.skills))
  {
    if (!Object.keys(set.points).includes(skill))
      set.points[skill] = 0;
    set.points[skill] += points;
  }
}

function loop()
{
  let uheads = reduce(heads, build.filtered);
  let uchests = reduce(chests, build.filtered);
  let uarms = reduce(arms, build.filtered);
  let uwaists = reduce(waists, build.filtered);
  let ulegs = reduce(legs, build.filtered);

  let count = 0;

  for (const [hname, head] of Object.entries(uheads))
  {
  for (const [cname, chest] of Object.entries(uchests))
  {
  for (const [aname, arm] of Object.entries(uarms))
  {
  for (const [wname, waist] of Object.entries(uwaists))
  {
  for (const [lname, leg] of Object.entries(ulegs))
  {
    if (count++ % 1000 == 0)
      console.log(count);
    const torsoInc = "Torso Inc" in head.skills ||
                     "Torso Inc" in chest.skills ||
                     "Torso Inc" in arm.skills ||
                     "Torso Inc" in waist.skills ||
                     "Torso Inc" in leg.skills;

    let set = {
      "gear": [hname, cname, aname, wname, lname],
      "points": {}
    };

    points(set, head);
    points(set, chest);
    points(set, arm);
    points(set, waist);
    points(set, leg);

    let hasAllSkills = true;
    build.skills.forEach(sk => {
      if (!(sk.name in set.points) || set.points[sk.name] < sk.stats.Points)
        hasAllSkills = false;
    });
    if (hasAllSkills === false)
      continue;

    console.log(set);
    return;
  } // leg
  } // waist
  } // arm
  } // chest
  } // head
  console.log("no sets");
}

onmessage = function(msg)
{
  if (typeof msg !== 'object')
    throw "Received non-object message";

  const data = msg.data;
  switch (data['cmd'])
  {
    case "addSkills":
      skills = data.payload;
    break;
    case "addArmour":
      armour = data.payload;
      const keys = Object.keys(armour);
      for (var i = keys.length - 1; i >= 0; i--)
      {
        const piece = keys[i];
        switch (armour[piece].part)
        {
          case "Head":
            heads[piece] = armour[piece];
            break;
          case "Chest":
            chests[piece] = armour[piece];
            break;
          case "Arms":
            arms[piece] = armour[piece];
            break;
          case "Waist":
            waists[piece] = armour[piece];
            break;
          case "Legs":
            legs[piece] = armour[piece];
            break;
          default:
            throw "Unknown armour type: " + armour[piece].part;
        }
      }
    break;
    case "addJewels":
      jewels = data.payload;
    break;
    case "start":
    setup(data.build);
      break;
    case "stop":
      run = false;
      break;
    default:
      throw "Received unknown command: " + data['cmd'];
  };
};
