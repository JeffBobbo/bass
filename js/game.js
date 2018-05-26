"use strict";

class Game
{
  constructor(name, res, hasJewels)
  {
    this.name = name;
    this.res = res;
    this.hasJewels = hasJewels;

    this.armour = {};
    this.heads  = {};
    this.chests = {};
    this.arms   = {};
    this.waists = {};
    this.legs   = {};
    this.skills = {};
    this.jewels = {};

    // the skills that are selected for the build
    this.selected = new Array(5).fill(null);
    // the build configuration
    this.build = null;

    // sets we've found
    this.sets = [];
    // sets we're displaying
    this.display = [];
    // sorting criteria
    this.sorting = [];

    this.workers = null;

    this.workers = new WorkerPool(2, (msg) => {
      const data = msg.data;
      switch (data.cmd)
      {
        case "prog":
          this.workers.progress[data.thread] = data.count;
          let sum = 0;
          for (const p of this.workers.progress)
            sum += p;
          $("progress").val(Math.floor((sum / this.build.combis) * 100));
          $("progress").prop("title", commify(sum) + " of " + commify(this.build.combis) + " sets searched");
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
            set.def = 0;
            set.res = {"Fire": 0, "Water": 0, "Thunder": 0, "Ice": 0, "Dragon": 0};
            for (const piece of Object.values(set.gear))
            {
              const item = this.armour[piece.name];

              // defense
              set.def += item.defense;//.min;

              // resistances
              for (const [res, amt] of Object.entries(item.resistance))
                set.res[res] += amt;
            }
            // calculate effective scores
            set.effdef = Math.floor((1 / (160 / (set.def + 160))) * set.def);
            set.eff = {};
            for (const res of Object.keys(set.res))
              set.eff[res] = Math.floor((1 / ((160 * (1 - set.res[res] / 100)) / (set.def + 160))) * set.def);

            let jwls = {};
            for (const jewel of set.jewels)
            {
              if (jwls[jewel] === undefined)
                jwls[jewel] = 0;
              ++jwls[jewel];
            }
            set.jewels = jwls;
            if (this.display.length < 100)
            {
              this.display.push(set);
              addSetToTable(set);
            }
            this.sets.push(set);
          }
          $("span#count").text(commify(this.sets.length) + " sets found");
          break;
        default:
          throw "Unknown command: " + data.cmd;
      }
    });
  }

  registerSkills(skills)
  {
    this.skills = skills;
    this.workers.postAll({"cmd": "addSkills", "payload": this.skills});
  }

  registerArmour(armour)
  {
    this.armour = armour;

    this.heads  = {};
    this.chests = {};
    this.arms   = {};
    this.waists = {};
    this.legs   = {};

    for (const [name, stats] of Object.entries(armour))
    {
      let to = null;
      if (stats.part === "Head")
        to = this.heads;
      else if (stats.part === "Chest")
        to = this.chests;
      else if (stats.part === "Arms")
        to = this.arms;
      else if (stats.part === "Waist")
        to = this.waists;
      else if (stats.part === "Legs")
        to = this.legs;
      else
        throw "Unknown armour type: " + stats.part;

      to[name] = stats;
    }
    this.workers.postAll({"cmd": "addArmour", "payload": [this.heads, this.chests, this.arms, this.waists, this.legs]});
  }

  registerJewels(jewels)
  {
    this.jewels = jewels;
    this.workers.postAll({"cmd": "addJewels", "payload": this.jewels});
  }

  resistances()
  {
    return this.res;
  }

  tableHead()
  {
    $('table#sets thead tr').remove();

    let row = '<tr>' +
      '<th class="sort">' +
          '<img src="img/def.png" title="Defence"/>' +
          '<i id="def" data-key="defmax" class="fa fa-sort"/>' +
        '</th>';

      for (const r of this.resistances())
      {
        row += '<th class="sort">' +
          '<img src="img/' + r.toLowerCase() + '.png" title="' + r + ' resistance"/>' +
          '<i id="' + r.toLowerCase() + '" data-key="res.' + r + '" class="fa fa-sort"/>' +
        '</th>'
      }

      for (const p of ['Head', 'Chest', 'Arms', 'Waist', 'Legs'])
      {
        row += '<th>' +
          //'<img src="img/' + p.toLowerCase() + '.png" title="Head"/>' +
          p +
          '</th>';
      }
      if (this.hasJewels)
        row += '<th>Jewels</th><th>Slots</th>';
    row += '</tr>';
    $("table#sets > thead").append(row);
  }

  usesJewels()
  {
    return this.hasJewels;
  }

  //skills() { return this.skills; }
  ////armour() { return this.armour; }
  //jewels() { return this.jewels; }
}
