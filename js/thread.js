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
  if (build.skills.length == 0)
    return;
  run = true;

  // remove any gear that's not the right type
  function reduceType(part, source)
  {
    build[part] = Object.keys(source);
    switch (build.class)
    {
      case "Blademaster":
        build[part] = filter(source, "type", "in", ["Both", "Blademaster"], build[part]);
        break;
      case "Gunner":
        build[part] = filter(source, "type", "in", ["Both", "Bow", "Bowgun"], build[part]);
        break;
    }
  }
  reduceType("heads", heads);
  reduceType("chests", chests);
  reduceType("arms", arms);
  reduceType("waists", waists);
  reduceType("legs", legs);

  // remove any gear that does provide a bonus to at least one skill
  // also, give each piece of equipment a weight
  function reduceSkillsAndWeigh(from)
  {
    for (let i = 0, l = from.length; i < l; ++ i)
    {
      const name = from[i];
      const piece = armour[name];
      piece.weight = 0;

      const skills = Object.keys(piece.skills);
      let include = false;
      build.skills.forEach(sk => {
        if (piece.skills["Torso Inc"] !== undefined || (skills.includes(sk.stats.Jewel) && piece.skills[sk.stats.Jewel] > 0))
        {
          include = true;
          piece.weight += piece.skills[sk.stats.Jewel];
        }
      });
      if (include == false)
      {
        from.splice(i, 1);
        --i;
        --l;
      }
    }
  }
  reduceSkillsAndWeigh(build.heads);
  reduceSkillsAndWeigh(build.chests);
  reduceSkillsAndWeigh(build.arms);
  reduceSkillsAndWeigh(build.waists);
  reduceSkillsAndWeigh(build.legs);

  // sort by the weight assigned in reduce skills
  function desc(gear)
  {
    gear.sort((a, b) => {
      return armour[b].weight - armour[a].weight;
    });
  }
  desc(build.heads);
  desc(build.chests);
  desc(build.arms);
  desc(build.waists);
  desc(build.legs);

  if (build.heads.length > 8)
    build.heads.splice(Math.ceil(build.heads.length * 0.5));
  if (build.chests.length > 8)
    build.chests.splice(Math.ceil(build.chests.length * 0.5));
  if (build.arms.length > 8)
    build.arms.splice(Math.ceil(build.arms.length * 0.5));
  if (build.waists.length > 8)
    build.waists.splice(Math.ceil(build.waists.length * 0.5));
  if (build.legs.length > 8)
    build.legs.splice(Math.ceil(build.legs.length * 0.5));

  build.jewels = [];
  for (const bskill of build.skills)
  {
    const statname = bskill.stats.Jewel;

    for (const [jname, jstats] of Object.entries(jewels))
    {
      const b = jstats.Skills[statname];
      if (b !== undefined && b > 0 && !build.jewels.includes(jname))
        build.jewels.push(jname);
    }
  }

  // compute the number of possible sets
  build.combis = build.heads.length *
                 build.chests.length *
                 build.arms.length *
                 build.waists.length *
                 build.legs.length;
  build.count = 0;

  // setup done, pass off to loop
  console.log(build.combis + " combinations...");
  build.start = (new Date()).getTime();
  loop();
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
  function prog()
  {
    return build.count / build.combis;
  }
  postMessage({"cmd": "prog", "value": Math.floor(prog() * 100)});

  const lname = build.legs.pop();
  const leg = legs[lname];
  for (const wname of build.waists)
  {
  const waist = waists[wname];
  for (const aname of build.arms)
  {
  const arm = arms[aname];
  for (const cname of build.chests)
  {
  const chest = chests[cname];
  for (const hname of build.heads)
  {
  const head = heads[hname];
    ++build.count;
    const torsoInc = ("Torso Inc" in head.skills ? 1 : 0) +
                     ("Torso Inc" in chest.skills ? 1 : 0) +
                     ("Torso Inc" in arm.skills ? 1 : 0) +
                     ("Torso Inc" in waist.skills ? 1 : 0) +
                     ("Torso Inc" in leg.skills ? 1 : 0) ;

    let set = {
      "gear": {
        "head": {"name": hname, "jewels": []},
        "chest": {"name": cname, "jewels": []},
        "arms": {"name": aname, "jewels": []},
        "waist": {"name": wname, "jewels": []},
        "legs": {"name": lname, "jewels": []}
      },
      "points": {},
      "need": {}
    };

    for (const skstat of Object.values(build.skills))
      set.need[skstat.Jewel] = skstat.Points;

    points(set, head);
    for (let i = 0; i < torsoInc+1; ++i)
      points(set, chest);
    points(set, arm);
    points(set, waist);
    points(set, leg);

    for (const [jname, jstat] of Object.entries(set.need))
      set.need[jname] -= set.points[jname];

    function allSkills(set)
    {
      for (const p of Object.values(set.need))
      {
        if (p > 0)
          return false;
      }
      return true;
    }

    var slots = {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0
    };
    ++slots[heads[hname].slots];
    ++slots[chests[cname].slots];
    ++slots[arms[aname].slots];
    ++slots[waists[wname].slots];
    ++slots[legs[lname].slots];

    for (const [name, stat] of Object.entries(set.need))
    {
      if (stat <= 0) // already got all we need
        continue;

      // look for gems
      //
    }

  } // head
  } // chest
  } // arm
  } // waist

  if (build.legs.length)
  {
    if (run)
      setTimeout(loop, 0);
    else
    {
      const end = (new Date()).getTime();
      console.log("Stopped after searching " + build.count + " sets of " + build.combis + " combinations in " + ((end - build.start) / 1000) + "s");
    }
  }
  else
  {
    const end = (new Date()).getTime();
    postMessage({"cmd": "stop"});
    console.log("Searched " + build.count + " sets of " + build.combis + " combinations in " + ((end - build.start) / 1000));
  }
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
