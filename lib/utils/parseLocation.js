function parseLocation(local) {
  const arr = local.split("/");
  let finalLocal = "";

  for (let i = arr.length; i > 0; i--) {
    if (i == arr.length - 1) {
      finalLocal += `OU=${arr[i - 1]}`;
    } else {
      finalLocal += `OU=${arr[i - 1]},`;
    }
  }

  return finalLocal;
}

module.exports = { parseLocation };
