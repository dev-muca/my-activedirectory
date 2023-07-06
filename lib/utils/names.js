function getFirstName(fullname) {
  const nameParts = fullname.split(" ");
  const firstName = nameParts[0];

  return firstName;
}

function getLastName(fullname) {
  const nameParts = fullname.split(" ");
  const lastName = nameParts[nameParts.length - 1];

  return lastName;
}

function getRestName(fullname) {
  const nameParts = fullname.split(" ");
  const restName = nameParts.length > 1 ? nameParts.slice(1, nameParts.length).join(" ") : nameParts[0];

  return restName;
}

module.exports = { getFirstName, getLastName, getRestName };
