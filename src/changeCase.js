const camelCase2snakeCase = s => {
    const ret = [];
    for (const c of s.split("")) {
        if (c.toUpperCase() === c && c.toLowerCase() !== c) {
            ret.push(`_${c.toLowerCase()}`);
        } else {
            ret.push(c);
        }
    }
    return ret.join("");
}

module.exports = {camelCase2snakeCase};
