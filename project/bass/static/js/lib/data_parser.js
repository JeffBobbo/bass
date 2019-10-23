'use strict';

function parseSkills(source)
{
  const skills = {};
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    const skill = line.substring(1, line.indexOf('"', 1));
    line = lines[++i];
    const category = line.substr(4, line.indexOf('"', 4) - 1);
    console.log(skill);
    console.log(category);
    line = lines[++i];
    while (line && line.length)
    {
      line = lines[++i];
    }
  }
}
