'use strict';

function filter(object, key, comparison, value, keys = Object.keys(object))
{
  function test(obj, key, comparison, value)
  {
    if (obj[key] === undefined || obj[key] === null)
      throw "Object with no key: " + key;

    switch (comparison)
    {
      case ">":
        return obj[key] > value;
      case "<":
        return obj[key] < value;
      case "==":
        return obj[key] == value;
      case "!=":
        return obj[key] != value;
      case "includes":
        return obj[key].includes(value);
      case "excludes":
        return !(obj[key].includes(value));
      case "in":
      {
        for (var i = value.length - 1; i >= 0; i--)
        {
          if (obj[key] === value[i])
            return true;
        }
        return false;
      }
      case "empty":
      {
        return obj[key].length === 0;
      }
    }
    throw "Non-existing comparison: " + comparison;
  }

  for (let i = 0, l = keys.length; i < l; ++i)
  {
    const obj = object[keys[i]];

    if (test(obj, key, comparison, value) === false)
    {
      keys.splice(i, 1);
      --i;
      --l;
    }
  }
  return keys;
}

function sort(objects, keys)
{
  objects.sort((a, b) => {
    for (let i = 0, l = keys.length; i < l; i++)
    {
      let modifier = keys[i].order || 1;
      let key = keys[i].key || keys[i];
      if (a[key] < b[key])
        return -1 * modifier;
      if (a[key] > b[key])
        return 1 * modifier;
    }
    return 0;
  });
}
