'use strict';

importScripts("tools.js");

let skills = {};
let jewels = {};
let heads = {};
let chests = {};
let arms = {};
let waists = {};
let legs = {};

let build = null;
let end = 0;
let p = 0;
let run = false;
let sets = [];
let combinations = null;

let id = null;

function points(set, part)
{
  for (const [skill, points] of Object.entries(part.skills))
  {
    if (!Object.keys(set.points).includes(skill))
      set.points[skill] = 0;
    set.points[skill] += points;
  }
}

function* generate()
{
  for (; p < end; ++p)
  {
    const lname = build.legs[p];
    for (const wname of build.waists)
    {
      for (const aname of build.arms)
      {
        for (const cname of build.chests)
        {
          for (const hname of build.heads)
            yield [hname, cname, aname, wname, lname];
        }
      }
    }
  }
}
function loop()
{
  if (run)
  {
    let sets = [];
    let last = true;
    for (let i = 0; i < 1000 && last === true; ++i)
      last = search(sets);
    postMessage({"cmd": "sets", "sets": sets});
    postMessage({"cmd": "prog", "thread": id, "count": build.count});
    if (last === false)
    {
      const end = (new Date()).getTime();
      postMessage({"cmd": "stopped"});
      console.log("Thread " + id + " searched " + build.count + " sets of " + build.combis + " combinations in " + ((end - build.start) / 1000) + "s");
    }
    else
    {
      setTimeout(loop, 0);
    }
  }
  else
  {
    const end = (new Date()).getTime();
    postMessage({"cmd": "stopped"});
    console.log("Thread " + id + " stopped after searching " + build.count + " sets of " + build.combis + " combinations in " + ((end - build.start) / 1000) + "s");
  }
}

function search(sets)
{
  const g = combinations.next();
  if (g.done)
    return false;
  const [hname, cname, aname, wname, lname] = g.value;
  const [head, chest, arm, waist, leg] = [heads[hname], chests[cname], arms[aname], waists[wname], legs[lname]];
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
    "jewels": []
  };
  let need = {};

  for (const skill of build.skills)
    need[skill.stats.Jewel] = skill.stats.Points;

  points(set, head);
  for (let i = 0; i < torsoInc+1; ++i)
    points(set, chest);
  points(set, arm);
  points(set, waist);
  points(set, leg);

  for (const [jname, jstat] of Object.entries(need))
    need[jname] -= set.points[jname] ? set.points[jname] : 0;

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
  ++slots[build.slots];

  for (var [name, stat] of Object.entries(need))
  {
    while (stat > 0)
    {
      var best = null;
      // look for gems
      for (const jname of build.jewels[name])
      {
        const jewel = jewels[jname];
        let canfit = false;
        for (let i = jewel.Slots; i <= 3; ++i)
        {
          if (slots[i] > 0)
          {
            canfit = true;
            break;
          }
        }
        if (canfit && (best === null || jewel.Skills[name] > jewels[best].Skills[name]))
          best = jname;
      }

      if (best === null) // there is no gem to use, so break out
        break;

      --slots[jewels[best].Slots];
      need[name] -= jewels[best].Skills[name];
      stat -= jewels[best].Skills[name];
      set.jewels.push(best);
    }
  }

  const allSkills = (need) => {
    for (const stat of Object.values(need))
    {
      if (stat > 0)
        return false;
    }
    return true;
  }
  const badSkills = (points) => {
    for (const [name, stat] of Object.entries(points))
    {
      if (stat <= -10)
        return true;
    }
  }

  if (!build.allowbad && badSkills(set.points))
    return true;;

  if (allSkills(need))
    sets.push(set);
  return true;
}

onmessage = function(msg)
{
  if (typeof msg !== 'object')
    throw "Received non-object message";

  const data = msg.data;
  switch (data['cmd'])
  {
    case "id":
      id = data.id;
    break;
    case "addSkills":
      skills = data.payload;
    break;
    case "addArmour":
      heads = data.payload[0];
      chests = data.payload[1];
      arms = data.payload[2];
      waists = data.payload[3];
      legs = data.payload[4];
    break;
    case "addJewels":
      jewels = data.payload;
    break;
    case "start":
      build = data.build;
      p = data.offset;
      end = data.end;
      run = true;
      combinations = generate();
      loop();
      break;
    case "stop":
      run = false;
      break;
    default:
      throw "Received unknown command: " + data['cmd'];
  };
};
