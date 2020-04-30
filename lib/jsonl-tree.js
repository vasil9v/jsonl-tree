const readline = require("readline");

/*
 * Return the indentation level and the
 * rest of the line.
 * Supports both whitespace and alternatively
 * an int specifying what the indentation
 * level is.
 */
function getIndentation(s) {
  let i = 0;
  let sep = ' ';
  if (s[0] === ' ' || s[0] === '\t') {
    sep = s[0];
  }
  else {
    let val = 0;
    while (s[i] >= '0' && s[i] <= 9) {
      val = (val * 10) + (s[i] - '0');
      i += 1;
    }
    return {
      level: val,
      line: s.substring(i)
    };
  }

  while (s[i] === sep) {
    i += 1;
  }
  return {
    level: i,
    line: s.substring(i)
  };
};

let tree, lastLevel, parents, fieldName;
function initState() {
  tree = null;
  lastLevel = 0;
  parents = [];
  fieldName = "children";
}

/*
 * The jsonltree() accepts an entire
 * jsonl-tree multiline string and returns
 * the finalized JSON structure.
 */
function jsonltree(jlt) {
  initState();
  let lines = jlt.split("\n");
  for (let line of lines) {
    jsonltreeLine(line);
  }
  return finalize(tree);
};

/*
 * jsonltreeLine() parses one indented line and
 * adds it to the appropriate child in the tree.
 */
function jsonltreeLine(line) {

  if (line.trim().startsWith("//")) {
    let eq = line.substring(2).trim().split("=");
    if (eq[0].trim() === "nest") {
      fieldName = eq[1].trim();
    }
    return;
  }

  let result = getIndentation(line); // TODO destructuring
  let json = JSON.parse(result.line);

  tree = tree || json;

  let delta = result.level - lastLevel;
  while (Math.abs(delta) > 1) {
    delta /= 2;
    delta = Math.round(delta);
  }

  switch (delta) {
    case 1: // indent 1
      let p = parents[parents.length - 1][fieldName];
      parents.push(p[p.length - 1]);
      p = parents[parents.length - 1];
      p[fieldName] = p[fieldName] || [];
      p[fieldName].push(json);
      break;
    case 0: // same level, add to the present list of children
      if (parents.length === 0) {
        tree = {
          [fieldName]: []
        };
        parents.push(tree);
      }
      parents[parents.length - 1][fieldName].push(json);
      break;
    case -1: // pop out one level, add to parent list of children
      parents.pop();
      parents[parents.length - 1][fieldName].push(json);
      break;
    default:
      throw new Error("indentation level not expected: " + (delta) + " at: " + result.line);
      break;
  }
  lastLevel = result.level;
};

/*
 * Called by the readline hook on EOF.
 */
function finalize() {
  // remove the topmost object if it was just holding a single 0-th level object
  let keys = Object.keys(tree);
  if (keys.length === 1 && keys[0] === fieldName && tree[fieldName].length === 1) {
    tree = tree[fieldName][0];
  }
  return tree;
};

/*
 * If invoked via command line pipeline,
 * then use readline to process each line
 * input one at a time by calling
 * jsonltreeLine() until you hit EOF.
 *
 * Otherwise just export the needed
 * functions to the module importer.
 */
if (require.main === module) {
  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", function (line) {
    if (!fieldName) {
      initState();
    }
    jsonltreeLine(line);
  });

  rl.on("close", function () {
    console.log(JSON.stringify(finalize(tree), null, 2));
  });
}
else {
  module.exports = {
    getIndentation: getIndentation,
    jsonltree: jsonltree,
    jsonltreeLine: jsonltreeLine
  };
}
