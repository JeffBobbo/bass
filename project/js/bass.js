"use strict";

let games = {};
let game = null;

let run = false;

$(document).ready(function() {
  let parse = () => {
    const data = location.search.substr(1); // ignore the ?
    let get = {};
    for (const pair of data.split('&'))
    {
      const p = pair.split('=');
      get[p[0]] = decodeURI(p[1]);
    }
    return get;
  };
  const get = parse();

  let gname = get['game'] || 'mhfu';
  if (gname != 'mhf' && gname != 'mhfu')
    throw "Invalid game";

  // setup the games
  {
    games['mhf'] = new Game('mhfu', ['Fire', 'Water', 'Thunder', 'Dragon'], false);
    games['mhfu'] = new Game('mhfu', ['Fire', 'Water', 'Thunder', 'Ice', 'Dragon'], true);
  }
  game = games[gname];
  $('select#game').val(gname);
  game.tableHead();

  // retrieve the data
  const dir = 'data/' + gname + '/';
  $.getJSON(dir + 'skills.json', function(payload) {
    let foo = payload;
    game.registerSkills(foo);

    updateSkillsOverview();
    updateSkillSelectAll();
  });
  $.getJSON(dir + 'armour.json', function(payload) {
    let foo = payload;
    game.registerArmour(foo);
  });
  $.getJSON(dir + 'jewels.json', function(payload) {
    let foo = payload;
    game.registerJewels(foo);
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
    const key = col.data('key');
    const order = col.data('order');

    const norder = order === undefined ? "desc" : (order === "asc" ? undefined : "asc");

    // if we were already sorting by it, remove it
    for (let i = 0, l = game.sorting.length; i < l; ++i)
    {
      const by = game.sorting[i];
      if (by.key === key)
      {
        game.sorting.splice(i, 1);
        --i;
        --l;
        continue;
      }
    }
    col.removeClass("fa-sort fa-sort-up fa-sort-down");
    // and put it at the front of the queue
    if (norder !== undefined)
    {
      game.sorting.push({"key": key, "order": norder});
      col.addClass(norder === "asc" ? "fa-sort-up" : "fa-sort-down");
      col.data('order', norder);
    }
    else
    {
      col.addClass("fa-sort");
      col.removeData('order');
    }

    if (game.sorting.length > 0)
    {
      sortSets();
      displaySets();
    }
  });

  $("input[type=radio][name=def-style]").change(function() {
    const effStyle = $("input[type=radio][name=def-style]:checked").val() === "eff";

    if (effStyle)
    {
      $("th > i#def").data('key', 'effdef');
      for (const r of game.resistances())
        $('th > i#' + r.toLowerCase()).data('key', 'eff.' + r);
    }
    else
    {
      $("th > i#def").data('key', 'def');
      for (const r of game.resistances())
        $('th > i#' + r.toLowerCase()).data('key', 'res.' + r);
    }
    displaySets();
  });

  $('button#switch').click(switchGame);
});

function sortSets()
{
  let sorter = (a, b) => {
    for (const by of game.sorting)
    {
      const keys = by.key.split('.');
      let x = a, y = b;
      for (const key of keys)
      {
        x = x[key];
        y = y[key];
      }
      const cmp = x - y;
      if (cmp !== 0)
        return by.order === "asc" ? cmp : -cmp;
    }
    return 0;
  };

  const NUM_DISPLAY = 100;
  game.display = game.sets.slice(0, NUM_DISPLAY);
  game.display.sort(sorter); // sort the initial cut

  // now do the rest
  for (let i = NUM_DISPLAY, l = game.sets.length; i < l; ++i)
  {
    const set = game.sets[i];
    if (sorter(set, game.display[NUM_DISPLAY-1]) >= 0) // if it's worse, skip
      continue;

    // find where it should be in our display -- binary search
    let at = -1;
    let min = 0, max = 99, mid;
    while (min <= max)
    {
      mid = Math.floor((min + max) / 2);
      const c = sorter(set, game.display[mid]);
      if (c === 0)
        break;
      else
        c > 0 ? min = mid+1 : max = mid-1;
    }

    // insert at the right place, pop off the end
    game.display.splice(mid, 0, set);
    game.display.pop();
  }
}

function selectSkill(select)
{
  const skillname = select.target.value;
  if (skillname === "")
  {
    game.selected[select.target.id.substr(-1)] = null;
  }
  else
  {
    const skill = game.skills[skillname];
    game.selected[select.target.id.substr(-1)] = {"name": select.target.value, "stats": skill};
  }
}

function sortSkills(skillList)
{
  switch ($("input[type=radio][name=skill-sort]:checked").val())
  {
    // sort by jewel then points
    case "jewel":
      skillList.sort((a, b) => {
        const c = game.skills[a].Jewel.localeCompare(game.skills[b].Jewel);
        if (c)
          return c;
        return game.skills[a].Points - game.skills[b].Points;
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
  let filtered = Object.keys(game.skills);

  // filter out by the selection
  {
    const v = $("select#filter").val();
    if (v === "Other")
      filtered = filter(game.skills, "Categories", "empty", null, filtered);
    else if (v !== "all")
      filtered = filter(game.skills, "Categories", "includes", v, filtered)
  }

  // filter out bad skills
  if ($("input#bad-filter").prop("checked"))
    filtered = filter(game.skills, "Points", ">", 0, filtered);

  // filter out class
  if ($("input#class-filter").prop('checked'))
  {
    if ($("select#class").val() === "Blademaster")
    {
      filtered = filter(game.skills, "Categories", "excludes", "Bowgun", filtered);
      filtered = filter(game.skills, "Categories", "excludes", "Bow", filtered);
    }
    else
    {
      filtered = filter(game.skills, "Categories", "excludes", "Blademaster", filtered)
    }
  }

  sortSkills(filtered);

  $('div#skill-overview').empty();
  for (const name of filtered)
  {
    const skill = game.skills[name];
    var tooltip = "Jewel: " + skill.Jewel + "\n" +
                  "Points: " + skill.Points;
    $('div#skill-overview:last-child').append('<p title="' + tooltip + '">'+name+'</p><hr/>');
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

  let filtered = Object.keys(game.skills);
  const v = $('select#skill-filter-' + id).val();
  if (v === "Other")
  {
    filtered = filter(game.skills, "Categories", "empty", null, filtered);
  }
  else if (v === "Class")
  {
    const weapon = $("select#class").val();
    if (weapon === "Gunner")
      filtered = filter(game.skills, "Categories", "is", ["Bowgun", "Bow", "Gunner"], filtered);
    else
      filtered = filter(game.skills, "Categories", "includes", "Blademaster", filtered);
  }
  else if (v !== "all")
  {
    filtered = filter(game.skills, "Categories", "includes", v, filtered)
  }

  if ($("input#bad-filter").prop("checked"))
    filtered = filter(game.skills, "Points", ">", 0, filtered);

  // filter selected skills
  for (let i = 0, l = game.selected.length; i < l; ++i)
  {
    if (i == id)
      continue;
    const skill = game.selected[i];
    if (skill === null)
      continue;
    filtered = filter(game.skills, "Jewel", "!=", skill.stats.Jewel, filtered);
  }

  sortSkills(filtered);

  const old = select.val();
  select.empty();
  select.append("<option value=''></option>");
  for (const skill of filtered)
    select.append("<option value='" + skill + "'>" + skill + "</option>");
  select.val(old);
}

function armourStatString(piece)
{
  let stat = "Part: " + piece.part + "\n" +
  "Class: " + piece.type + "\n" +
  "Rarity: " + piece.rarity + "\n" +
  "Defense: " + piece.defense + "\n" +
  "Resistances:\n";
  for (const res of game.resistances())
    stat += "  " + piece.resistance[res] + " " + res + "\n";
  stat += "Skills:\n";
  for (const [name, points] of Object.entries(piece.skills))
    stat += "  " + points + " " + name + "\n";
  stat += "Slots: " + piece.slots + "\n";
  stat += "Cost:\n  " + commify(piece.price) + "z\n";
  for (const [item, quant] of Object.entries(piece.resources))
    stat += "  " + quant + "x " + item + "\n";

  return stat;
}

function displaySets()
{
  let table = $("table#sets>tbody").empty();
  for (const set of game.display)
    addSetToTable(set);
}

function addSetToTable(set)
{
  const effStyle = $("input[type=radio][name=def-style]:checked").val() === "eff";
  let row = "<tr>";
  if (effStyle)
    row += '<td title="Defense: ' + commify(set.def) + '">' + commify(set.effdef) + '</td>';
  else
    row += '<td title="Effective defense: ' + commify(set.effdef) + '">' + commify(set.def) + '</td>';

  for (const res of game.resistances())
  {
    if (effStyle)
      row += '<td title="Resistance: ' + set.res[res] + '"';
    else
      row += '<td title="Effective defense: ' + commify(set.eff[res]) + '"';

    if (set.res[res] > 0)
      row += ' class="numeric good">';
    else if (set.res[res] < 0)
      row += ' class="numeric bad">';
    else
      row += ' class="numeric">'

    if (effStyle)
      row += commify(set.eff[res]) + '</td>';
    else
      row += set.res[res] + '</td>';
  }
  row +=
    "<td title='" + armourStatString(game.armour[set.gear.head.name]) + "''>" + set.gear.head.name + "</td>" +
    "<td title='" + armourStatString(game.armour[set.gear.chest.name]) + "''>" + set.gear.chest.name + "</td>" +
    "<td title='" + armourStatString(game.armour[set.gear.arms.name]) + "''>" + set.gear.arms.name + "</td>" +
    "<td title='" + armourStatString(game.armour[set.gear.waist.name]) + "''>" + set.gear.waist.name + "</td>" +
    "<td title='" + armourStatString(game.armour[set.gear.legs.name]) + "''>" + set.gear.legs.name + "</td>" +
    "<td>";
  if (game.usesJewels())
  {
    for (const [jewel, amount] of Object.entries(set.jewels))
      row += amount + "x " + jewel + "</br>";
    row += "</td>" +
    "<td>";
    for (let i = 1; i <= 3; ++i)
      row += set.slots[i] + "x " + i + " slots<br/>";
    row += "</td>";
  }
  row +="</tr>";
  $("table#sets > tbody:last-child").append(row);
}

function clearSetsTable()
{
  $("table#sets tbody tr").remove();
}

function setup(build)
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
        build[part] = filter(source, "type", "in", ["Both", "Gunner"], build[part]);
        break;
    }
  }
  reduceType("heads", game.heads);
  reduceType("chests", game.chests);
  reduceType("arms", game.arms);
  reduceType("waists", game.waists);
  reduceType("legs", game.legs);

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
  reduceSkillsAndWeigh(build.heads, game.heads);
  reduceSkillsAndWeigh(build.chests, game.chests);
  reduceSkillsAndWeigh(build.arms, game.arms);
  reduceSkillsAndWeigh(build.waists, game.waists);
  reduceSkillsAndWeigh(build.legs, game.legs);

  // sort by the weight assigned in reduce skills
  function desc(list, from)
  {
    list.sort((a, b) => {
      return from[b].weight - from[a].weight;
    });
  }
  desc(build.heads, game.heads);
  desc(build.chests, game.chests);
  desc(build.arms, game.arms);
  desc(build.waists, game.waists);
  desc(build.legs, game.legs);

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

    for (const [jname, jstats] of Object.entries(game.jewels))
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
    let offset = 0, len = Math.floor(build.legs.length / game.workers.count), end = len;
    for (let i = 0; i < game.workers.count-1; ++i)
    {
      game.workers.post(i, {"cmd": "start", "build": build, "offset": offset, "end": end});
      offset += len;
      end += len;
    }
    game.workers.post(game.workers.count-1, {"cmd": "start", "build": build, "offset": offset, "end": build.legs.length})
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
    game.workers.postAll({"cmd": "stop"});
    $("button#punchit").text("Stopping");
    $("button#punchit").prop("disabled", true);
    run = false;
  }
  else
  {
    let chosen = [];
    for (const skill of game.selected)
    {
      if (skill === null)
        continue;
      chosen.push(skill);
    }
    game.build = {
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
    game.sets = [];
    game.display = [];
    game.workers.reset();
    setup(game.build);
  }
}

function switchGame()
{
  const g = $('select#game').val();

  if (run)
  {
    game.workers.postAll({"cmd": "stop"});
    $("button#punchit").text("Stopping");
    $("button#punchit").prop("disabled", true);
    run = false;
  }

  game = games[g];

  if (Object.keys(game.skills).length === 0)
  {
    // retrieve the data
    const dir = 'data/' + g + '/';
    $.getJSON(dir + 'skills.json', function(payload) {
      let foo = payload;
      game.registerSkills(foo);

      updateSkillsOverview();
      updateSkillSelectAll();
    });
    $.getJSON(dir + 'armour.json', function(payload) {
      let foo = payload;
      game.registerArmour(foo);
    });
    $.getJSON(dir + 'jewels.json', function(payload) {
      let foo = payload;
      game.registerJewels(foo);
    });
  }

  game.tableHead();
  displaySets();
  updateSkillSelectAll();
  for (let i = 0; i < game.selected.length; ++i)
  {
    if (game.selected[i])
      $('select#skill-select-' + i).val(game.selected[i].name);
  }
  // retrieve the data
  updateSkillsOverview();
}
