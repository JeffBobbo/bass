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
    let include = false;
    piece.weight = 0;
    build.skills.forEach(sk => {
      if (skills.includes(sk.stats.Jewel) && piece.skills[sk.stats.Jewel] > 0)
      {
        include = true;
        piece.weight += piece.skills[sk.stats.Jewel];
      }
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
  const possibilities = Object.keys(uheads).length *
                        Object.keys(uchests).length *
                        Object.keys(uarms).length *
                        Object.keys(uwaists).length *
                        Object.keys(ulegs).length;

  let count = 0;

  let desc = list => {
    list.sort((a, b) => {
      return list[a].weight - list[b].weight; 
    });
  };

  for (const hname of Object.keys(uheads).sort(desc))
  {
  const head = uheads[hname];
  console.log(head.weight);
  for (const cname of Object.keys(uchests).sort(desc))
  {
  const chest = uchests[cname];
  for (const aname of Object.keys(uarms).sort(desc))
  {
  const arm = uarms[aname];
  for (const wname of Object.keys(uwaists).sort(desc))
  {
  const waist = uwaists[wname];
  for (const lname of Object.keys(ulegs).sort(desc))
  {
    const leg = ulegs[lname];
    ++count;
    const torsoInc = ("Torso Inc" in head.skills ? 1 : 0) +
                     ("Torso Inc" in chest.skills ? 1 : 0) +
                     ("Torso Inc" in arm.skills ? 1 : 0) +
                     ("Torso Inc" in waist.skills ? 1 : 0) +
                     ("Torso Inc" in leg.skills ? 1 : 0) ;

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

    console.log("searched " + count + " sets");
    console.log(set);
    return;
  } // leg
  } // waist
  } // arm
  } // chest
  } // head
  console.log("searched " + count + " sets");
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
