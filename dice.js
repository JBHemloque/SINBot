var getRandomInt = function(min, max){
    if (max === "F") {
        return getRandomInt(-1, 1);
    }
    return Math.floor(Math.random() * (max - min + 1) + min);
};

var parseValue = function(val) {
    if (val === "F") {
        return val;
    }
    return parseInt(val || "1");
};

var rollDie = function(val) {
    if ((val === "F") || (val === "f")) {
        return getRandomInt(-1, 1);
    }
    return getRandomInt(1, val);
}

var parseRoll = function(roll) {
  
    // only here for the snippet
    console.log("Parsing " + roll);
  
    var parts = roll.split(/d/);
    var sum = 0;
    var details = [];
    var limit = parseValue(parts[1]);
    for (var i = parseValue(parts[0]) - 1; i >= 0; i--) {
        var got = rollDie(limit);
        sum += got;
        details.push(got);
      
        // only here for the snippet
        console.log("  From roll " + roll + " part " + i + " got " + got + " sum " + sum);
      
    }
    return sum; // + " (" + details.join() + ")";
};

var roll = function(spec) {
    return "[" + spec + "] " + spec.replace(/[^+0-9dF]+/g, "")
          .split(/\+/)
          .map(parseRoll)
          .reduce(function(a,b){return a + b;});
};

exports.rollDice = roll;
