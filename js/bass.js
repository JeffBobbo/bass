"use strict";

// all skills, armour pieces and hewels
let skills = {};
let armour = {};
let jewels = {};

// all armour pieces, filtered appropriately
let heads = {};
let chests = {};
let arms = {};
let waists = {};
let legs = {};

// the currently selected skills
let selectedSkills = new Array(5).fill(null);

let build = null;

// sets thave been been found
let sets = [];

let workers = null;
let progress = [];

// how to go about sorting
let sorting = [];

class WorkerPool
{
  constructor(size, cb)
  {
    this.size = size;
    this.workers = [];
    for (let i = 0; i < size; ++i)
    {
      let worker = new Worker('./js/thread.js');
      worker.onmessage = cb;
      worker.postMessage({"cmd": "id", "id": i});
      this.workers.push(worker);
      progress.push(0);
    }
  }

  get count() { return this.size; }

  postAll(msg)
  {
    for (let i = 0; i < this.size; ++i)
      this.workers[i].postMessage(msg);
  }

  post(index, msg)
  {
    this.workers[index].postMessage(msg);
  }
}

$(document).ready(function() {
  workers = new WorkerPool(2, (msg) => {
    const data = msg.data;
    switch (data.cmd)
    {
      case "prog":
        progress[data.thread] = data.count;
        let sum = 0;
        for (const p of progress)
          sum += p;
        $("progress").val(Math.floor((sum / build.combis) * 100));
        $("progress").prop("title", sum + " of " + build.combis + " sets searched");
        break;
      case "stopped":
        $("button#punchit").text("Search");
        $("button#punchit").prop("disabled", false);
        run = false;
        break;
      case "sets":
        for (let set of data.sets)
        {
          // compute set stats
          set.defmin = 0;
          set.defmax = 0;
          set.res = {"Fire": 0, "Water": 0, "Thunder": 0, "Ice": 0, "Dragon": 0};
          for (const piece of Object.values(set.gear))
          {
            const item = armour[piece.name];

            // defense
            set.defmin += item.defense.min;
            set.defmax += item.defense.max;

            // resistances
            for (const [res, amt] of Object.entries(item.resistance))
              set.res[res] += amt;
          }
          if (sets.length < 100)
            addSetToTable(set);
          sets.push(set);
        }
        $("span#count").text(sets.length + " sets found");
        break;
      default:
        throw "Unknown command: " + data.cmd;
    }
  });

  const dir = 'data_pp';
  $.getJSON(dir + "/skills.json", function(payload) {
    skills = payload;
    workers.postAll({"cmd": "addSkills", "payload": skills});
    updateSkillsOverview();

    // add skills to selects
    updateSkillSelectAll();
  });
  $.getJSON(dir + "/armour.json", function(payload) {
    armour = payload;
    for (const [name, stats] of Object.entries(armour))
    {
      let to = null;
      if (stats.part === "Head")
        to = heads;
      else if (stats.part === "Chest")
        to = chests;
      else if (stats.part === "Arms")
        to = arms;
      else if (stats.part === "Waist")
        to = waists;
      else if (stats.part === "Legs")
        to = legs;
      else
        throw "Unknown armour type: " + stats.part;

      to[name] = stats;
    }
    workers.postAll({"cmd": "addArmour", "payload": [heads, chests, arms, waists, legs]});
  });
  $.getJSON(dir + "/jewels.json", function(payload) {
    jewels = payload;
    workers.postAll({"cmd": "addJewels", "payload": jewels});
  });

  $("select#filter").change(updateSkillsOverview);
  $("select#class").change(updateSkillsOverview);
  $("input#class-filter").change(updateSkillsOverview);
  $("input#bad-filter").change(function() {
    updateSkillsOverview();
    updateSkillSelectAll();
  });
  $("input[type=radio][name=skill-sort]").change(function() {
    updateSkillsOverview();
    updateSkillSelectAll();
  });

  $("button#punchit").click(punchit);

  $("select.skill-filter").change(function(element) {
    updateSkillSelect(element.target.id.substr(-1));
  });
  $("select.skill-select").change(function(element) {
    selectSkill(element);
    updateSkillSelectAll();
  });

  $("th.sort>i").click(function(element) {
    const col = $(element.target);
    const keys = col.data('key').split('.');
    const order = col.data('order');

    const norder = order === undefined || order === "asc" ? "desc" : "asc";
    //sorting = {"key": key, "order": norder};
    col.removeClass("fa-sort fa-sort-up fa-sort-down");
    col.addClass(norder === "asc" ? "fa-sort-up" : "fa-sort-down");
    col.data('order', norder);

    sets.sort((a, b) => {
      for (const key of keys)
      {
        a = a[key];
        b = b[key];
      }
      if (norder === "asc")
        return a - b;
      else
        return b - a;
    });
    let table = $("table#sets>tbody").empty();
    for (let i = 0, l = Math.min(100, sets.length); i < l; ++i)
      addSetToTable(sets[i]);
  });
});

function selectSkill(select)
{
  const skillname = select.target.value;
  if (skillname === "")
  {
    selectedSkills[select.target.id.substr(-1)] = null;
  }
  else
  {
    const skill = skills[skillname];
    selectedSkills[select.target.id.substr(-1)] = {"name": select.target.value, "stats": skill};
  }
}

function sortSkills(skillList)
{
  switch ($("input[type=radio][name=skill-sort]:checked").val())
  {
    // sort by jewel then points
    case "jewel":
      skillList.sort((a, b) => {
        const c = skills[a].Jewel.localeCompare(skills[b].Jewel);
        if (c)
          return c;
        return skills[a].Points - skills[b].Points;
      });
      break;
    // sort by skill name
    case "skill":
      skillList.sort();
    break;
  }
}


function updateSkillsOverview()
{
  let filtered = Object.keys(skills);

  // filter out by the selection
  {
    const v = $("select#filter").val();
    if (v === "Other")
      filtered = filter(skills, "Categories", "empty", null, filtered);
    else if (v !== "all")
      filtered = filter(skills, "Categories", "includes", v, filtered)
  }

  // filter out bad skills
  if ($("input#bad-filter").prop("checked"))
    filtered = filter(skills, "Points", ">", 0, filtered);

  // filter out class
  if ($("input#class-filter").prop('checked'))
  {
    if ($("select#class").val() === "Blademaster")
    {
      filtered = filter(skills, "Categories", "excludes", "Bowgun", filtered);
      filtered = filter(skills, "Categories", "excludes", "Bow", filtered);
    }
    else
    {
      filtered = filter(skills, "Categories", "excludes", "Blademaster", filtered)
    }
  }

  sortSkills(filtered);

  $('div#skill-overview').empty();
  for (const name of filtered)
  {
    const skill = skills[name];
    var tooltip = "Jewel: " + skill.Jewel + "\n" +
                  "Points: " + skill.Points;
    $('div#skill-overview:last-child').append('<p class="tooltip" title="' + tooltip + '">'+name+'</p><hr/>');
  };
}

function updateSkillSelectAll()
{
  updateSkillSelect(0);
  updateSkillSelect(1);
  updateSkillSelect(2);
  updateSkillSelect(3);
  updateSkillSelect(4);
}
function updateSkillSelect(id)
{
  let select = $('select#skill-select-' + id);

  let filtered = Object.keys(skills);
  const v = $('select#skill-filter-' + id).val();
  if (v === "Other")
  {
    filtered = filter(skills, "Categories", "empty", null, filtered);
  }
  else if (v === "Class")
  {
    const weapon = $("select#class").val();
    if (weapon === "Gunner")
      filtered = filter(skills, "Categories", "is", ["Bowgun", "Bow"], filtered);
    else
      filtered = filter(skills, "Categories", "includes", "Blademaster", filtered);
  }
  else if (v !== "all")
  {
    filtered = filter(skills, "Categories", "includes", v, filtered)
  }

  if ($("input#bad-filter").prop("checked"))
    filtered = filter(skills, "Points", ">", 0, filtered);

  // filter selected skills
  for (let i = 0, l = selectedSkills.length; i < l; ++i)
  {
    if (i == id)
      continue;
    const skill = selectedSkills[i];
    if (skill === null)
      continue;
    filtered = filter(skills, "Jewel", "!=", skill.stats.Jewel, filtered);
  }

  sortSkills(filtered);

  const old = select.val();
  select.empty();
  select.append("<option value=''></option>");
  for (const skill of filtered)
    select.append("<option value='" + skill + "'>" + skill + "</option>");
  select.val(old);
}

function addSetToTable(set)
{
  let row = "<tr>" +
    '<td>' + set.defmax + '</td>';
    for (const res of ['Fire', 'Water', 'Thunder', 'Ice', 'Dragon'])
    {
      if (set.res[res] > 0)
        row += '<td class="numeric good">';
      else if (set.res[res] < 0)
        row += '<td class="numeric bad">';
      else
        row += '<td class="numeric">'
      row += set.res[res] + '</td>';
    }
    row += "<td>" + set.gear.head.name + "</td>" +
    "<td>" + set.gear.chest.name + "</td>" +
    "<td>" + set.gear.arms.name + "</td>" +
    "<td>" + set.gear.waist.name + "</td>" +
    "<td>" + set.gear.legs.name + "</td>" +
    "<td>";
    for (const jewel of set.jewels)
      row += jewel + "</br>";
    row += "</td>" +
    "</tr>";
  $("table#sets > tbody:last-child").append(row);
}

function clearSetsTable()
{
  $("table#sets tbody tr").remove();
}

let run = false;
function setup()
{
  if (build.skills.length == 0)
  {
    console.error("No skills");
    return;
  }

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

  // remove piercings?
  if (build.piercings === false)
  {
    for (let i = 0, l = build.heads.length; i < l; ++i)
    {
      const name = build.heads[i];
      if (name.includes("Piercing"))
      {
        build.heads.splice(i, 1);
        --i;
        --l;
      }
    }
  }

  // remove any gear that does provide a bonus to at least one skill
  // also, give each piece of equipment a weight
  function reduceSkillsAndWeigh(list, from)
  {
    for (let i = 0, l = list.length; i < l; ++ i)
    {
      const name = list[i];
      const piece = from[name];
      piece.weight = piece.rarity;

      const skills = Object.keys(piece.skills);
      let include = false;
      if (piece.skills["Torso Inc"] !== undefined && build.torsoinc)
      {
        include = true;
        piece.weight += 5; // weigh Torso Inc at 5
      }
      build.skills.forEach(sk => {
        if (skills.includes(sk.stats.Jewel) && piece.skills[sk.stats.Jewel] > 0)
        {
          include = true;
          piece.weight += piece.skills[sk.stats.Jewel];
        }
      });
      if (include == false)
      {
        list.splice(i, 1);
        --i;
        --l;
      }
    }
  }
  reduceSkillsAndWeigh(build.heads, heads);
  reduceSkillsAndWeigh(build.chests, chests);
  reduceSkillsAndWeigh(build.arms, arms);
  reduceSkillsAndWeigh(build.waists, waists);
  reduceSkillsAndWeigh(build.legs, legs);

  // sort by the weight assigned in reduce skills
  function desc(list, from)
  {
    list.sort((a, b) => {
      return from[b].weight - from[a].weight;
    });
  }
  desc(build.heads, heads);
  desc(build.chests, chests);
  desc(build.arms, arms);
  desc(build.waists, waists);
  desc(build.legs, legs);

  while (build.heads.length > 20)
    build.heads.splice(Math.ceil(build.heads.length * 0.9));
  while (build.chests.length > 20)
    build.chests.splice(Math.ceil(build.chests.length * 0.9));
  while (build.arms.length > 20)
    build.arms.splice(Math.ceil(build.arms.length * 0.9));
  while (build.waists.length > 20)
    build.waists.splice(Math.ceil(build.waists.length * 0.9));
  while (build.legs.length > 20)
    build.legs.splice(Math.ceil(build.legs.length * 0.9));

  build.jewels = {};
  for (const bskill of build.skills)
  {
    const statname = bskill.stats.Jewel;
    if (build.jewels[statname] === undefined)
      build.jewels[statname] = [];

    for (const [jname, jstats] of Object.entries(jewels))
    {
      const b = jstats.Skills[statname];
      if (b !== undefined && b > 0)
        build.jewels[statname].push(jname);
    }
  }

  // compute the number of possible sets
  build.combis = build.heads.length *
                 build.chests.length *
                 build.arms.length *
                 build.waists.length *
                 build.legs.length;
  if (build.combis === 0)
  {
    console.error("No combinations possible");
    return;
  }
  build.count = 0;
  build.found = 0;

  // setup done, pass off to workers
  console.log(build.combis + " combinations...");
  build.start = (new Date()).getTime();

  {
    let offset = 0, len = Math.floor(build.legs.length / workers.count), end = len;
    for (let i = 0; i < workers.count-1; ++i)
    {
      workers.post(i, {"cmd": "start", "build": build, "offset": offset, "end": end});
      offset += len;
      end += len;
    }
    workers.post(workers.count-1, {"cmd": "start", "build": build, "offset": offset, "end": build.legs.length})
  }


  run = true;
  $("button#punchit").text("Stop");
  $('progress').show();
  $('progress').val(0.0);
  $("span#count").text("0 sets found");
  clearSetsTable();
}

function punchit()
{
  if (run)
  {
    workers.postAll({"cmd": "stop"});
    $("button#punchit").text("Stopping");
    $("button#punchit").prop("disabled", true);
    run = false;
  }
  else
  {
    let chosen = [];
    for (const skill of selectedSkills)
    {
      if (skill === null)
        continue;
      chosen.push(skill);
    }
    build = {
      "skills": chosen,
      "elder": $("select#elder").val(),
      "hr": $("select#hr").val(),
      "gender": $("select#gender").val(),
      "slots": $("select#slots").val(),
      "class": $("select#class").val(),
      "allowbad": $("input#badskills").prop("checked"),
      "piercings": $("input#piercings").prop("checked"),
      "torsoinc": $("input#torsoinc").prop("checked")
    };
    setup();
  }
}
