const ActiveDirectory = require("./index");

const ad = new ActiveDirectory({
  url: "ldap://26.246.216.159",
  user: "administrador@corporation.local",
  pass: "113551gg@",
});

// ad.findUser("murilo.baleeiro")
//   .then((res) => console.log(res))
//   .catch((err) => console.log(err));

ad.addUser({ fullname: "Fulano Teste Da Silva", password: "teste@123" })
  .then((res) => console.log(res))
  .catch((err) => console.log(err));
