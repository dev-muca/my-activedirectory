const ActiveDirectory = require("./index");
const { getFirstName, getLastName, getRestName } = require("./lib/utils/names");

const ad = new ActiveDirectory({
  url: "ldap://26.246.216.159",
  user: "administrador@corporation.local",
  pass: "113551gg@",
});

async function f(param) {
  try {
    const res = await ad.getUserLocation(param);
    return console.log(res);
  } catch (err) {
    return console.log(err);
  }
}

/* f({
  fullname: "Carla Da Silva Gimenes",
  password: "mudar@123",
  location: "Colaboradores/Administrativo",
  email: "carla.gimenes@gmail.com",
  description: "Teste",
  company: "company",
  title: "title",
  department: "department",
  office: "office",
  countryAcronym: "BR",
  countryName: "Brasil",
  cityName: "Lins",
  stateName: "São Paulo",
  postalCode: "16400-000",
  mobileNumber: "14 98765-4321",
  telephoneNumber: "14 3541-4575",
  streetAddress: "Rua Casa do Caralho",
  website: "google.com",
}); */

f("murilo.baleeiro");
