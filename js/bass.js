"use strict";

let skills = {};
let armour = {};
let jewels = {};

let selectedSkills = [];
let sets = [];

let worker = new Worker('./js/thread.js');
worker.onmessage = function(msg) {
  const data = msg.data;
  switch (data.cmd)
  {
    case "prog":
      $("progress").val(data.value);
      $("span#count").text(sets.length);
      break;
    case "stop":
      $("progress").val(100);
      $("button#punchit").text("Search");
      $("span#count").text(sets.length);
      run = false;
      break;
    case "set":
      const set = data.set;
      sets.push(set);
      addSetToTable(set);
      break;
    default:
      throw "Unknown command: " + data.cmd;
  }
};


$(document).ready(function() {
  $.getJSON("data/skills.json", function(payload) {
    skills = payload;
    worker.postMessage({"cmd": "addSkills", "payload": skills});
    updateSkillsTable();
  });
  $.getJSON("data/armour.json", function(payload) {
    armour = payload;
    worker.postMessage({"cmd": "addArmour", "payload": armour});
  });
  $.getJSON("data/jewels.json", function(payload) {
    jewels = payload;
    worker.postMessage({"cmd": "addJewels", "payload": jewels});
  });

  $("select#filter").change(updateSkillsTable);
  $("select#class").change(updateSkillsTable);
  $("input#class-filter").change(updateSkillsTable);
  $("input#bad-filter").change(updateSkillsTable);
  $("button#removeSkills").click(function() {selectedSkills = []; updateSkillsSelected()});
  $("button#punchit").click(punchit);
});

function addSkill(skillname)
{
  if (selectedSkills.length >= 5)
    throw "Too many skills";

  const skill = skills[skillname];
  if (skill === undefined)
    throw "Unknown skill: " + skillname;

  selectedSkills.push({"name": skillname, "stats": skill});
  updateSkillsSelected();
  updateSkillsTable();
}

function removeSkill(skillname)
{
  if (selectedSkills.length === 0)
    throw "No skills";

  let index = -1;
  for (let i = 0, l = selectedSkills.length; i < l; ++i)
  {
    const name = selectedSkills[i].name;
    if (name === skillname)
    {
      index = i;
      break;
    }
  }

  if (index >= 0)
    selectedSkills.splice(index, 1);
  updateSkillsSelected();
  updateSkillsTable();
}

function updateSkillsSelected()
{
  $('div.skill-slot').each(function(index) {
    if (index < selectedSkills.length)
    {
      $(this).text(selectedSkills[index].name);
      $(this).removeClass("empty");
      $(this).click((e) => { removeSkill(e.target.textContent); });
    }
    else
    {
      $(this).text("Skill #" + (index+1));
      $(this).addClass("empty");
      $(this).off("click");
    }
  });
}

function updateSkillsTable()
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


  // filter out skills we already chose
  for (var i = selectedSkills.length - 1; i >= 0; i--)
  {
    const skill = selectedSkills[i];
    filtered = filter(skills, "Jewel", "!=", skill.stats.Jewel, filtered);
  }

  // sort by jewel then points
  filtered.sort((a, b) => {
    const c = skills[a].Jewel.localeCompare(skills[b].Jewel);
    if (c)
      return c;
    return skills[a].Points - skills[b].Points;
  });

  $('div#skills').empty();
  for (const name of filtered)
  {
    const skill = skills[name];
    var tooltip = "Jewel: " + skill.Jewel + "\n" +
                  "Points: " + skill.Points;
    $('div#skills:last-child').append('<p class="tooltip" title="' + tooltip + '">'+name+'</p><hr/>');
  };
  $("div#skills p").click((e) => { addSkill(e.target.textContent); });
}

// fix this
function addSetToTable(set)
{
  var maxdef = 0;
  maxdef += armour[set.gear.head.name].defense.max;
  maxdef += armour[set.gear.chest.name].defense.max;
  maxdef += armour[set.gear.arms.name].defense.max;
  maxdef += armour[set.gear.waist.name].defense.max;
  maxdef += armour[set.gear.legs.name].defense.max;

  let row = "<tr>" +
    '<td>' + maxdef + '</td>' +
    "<td>" + set.gear.head.name + "</td>" +
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
function punchit()
{
  if (run)
  {
    worker.postMessage({"cmd": "stop"});
    $("button#punchit").text("Search");
    run = false;
  }
  else
  {
    let build = {
      "skills": selectedSkills,
      "elder": $("select#elder").val(),
      "hr": $("select#hr").val(),
      "gender": $("select#gender").val(),
      "slots": $("select#slots").val(),
      "class": $("select#class").val(),
      "piercings": $("input#piercings").prop("checked"),
      "torsoinc": $("input#torsoinc").prop("checked")
    };
    worker.postMessage({"cmd": "start", "build": build});
    $("button#punchit").text("Stop");
    $('progress').show();
    $('progress').val(0.0);
    clearSetsTable();
    run = true;
  }
}
