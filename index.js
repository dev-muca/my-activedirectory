const ldap = require("ldapjs");
const configFile = require("./config.json");

class ActiveDirectory {
  constructor(config) {
    this.url = config.url;
    this.user = config.user;
    this.pass = config.pass;
    this.domain = config.user.split("@")[1];
    this.baseDN = `DC=${this.domain.split(".")[0].toUpperCase()},DC=${this.domain.split(".")[1].toUpperCase()}`;
  }

  authenticate(username, password) {
    return new Promise((resolve, reject) => {
      if (!username || !password) return reject(new Error("credentials must be provided"));

      const client = ldap.createClient({
        url: this.url,
      });

      client.bind(`${username}@${this.domain}`, password, (err) => {
        if (err) {
          client.unbind();
          return reject(false);
        }

        const params = {
          scope: "sub",
          filter: `(sAMAccountName=${username})`,
        };

        client.search(this.baseDN, params, (err, res) => {
          if (err) return reject(err);

          res.on("searchEntry", (entry) => resolve(true));

          res.on("error", (err) => reject(false));

          res.on("end", (res) => {
            client.unbind((err) => {
              if (err) {
                reject(err);
                return;
              }

              if (res.status !== 0) {
                reject(new Error("Authenticate failed"));
              }
            });
          });
        });
      });
    });
  }

  userExists(username) {
    return new Promise((resolve, reject) => {
      if (!username) return reject(false);

      const client = ldap.createClient({
        url: this.url,
      });

      client.bind(this.user, this.pass, (err) => {
        if (err) {
          client.unbind();
          return reject(false);
        }

        const params = {
          scope: "sub",
          filter: `(sAMAccountName=${username})`,
        };

        client.search(this.baseDN, params, (err, res) => {
          if (err) {
            console.log("cliente f-err");
            reject(false);
          }

          res.on("searchEntry", () => resolve(true));

          res.on("error", () => reject(false));

          res.on("end", (res) => {
            client.unbind((err) => {
              if (err) reject(false);

              if (res.status === 0) {
                resolve(false);
              } else {
                reject(false);
              }
            });
          });
        });
      });
    });
  }

  findUser(username) {
    return new Promise((resolve, reject) => {
      if (!username) return reject(new Error("username is required"));

      const client = ldap.createClient({
        url: this.url,
      });

      client.bind(this.user, this.pass, (err) => {
        if (err) return reject(err);

        const params = {
          scope: "sub",
          filter: `(sAMAccountName=${username})`,
          attributes: configFile.defaults.attributes,
        };

        client.search(this.baseDN, params, (err, res) => {
          if (err) return reject(err);

          let user = null;

          res.on("searchEntry", (entry) => {
            // user = entry.pojo.attributes[0];

            const attributes = entry.pojo.attributes;
            const details = {};

            for (const attribute of attributes) {
              const attributeName = attribute.type;
              const attributeValue = attribute.values.length === 1 ? attribute.values[0] : attribute.values;

              details[attributeName] = attributeValue;
            }

            user = details;
          });

          res.on("error", (err) => {
            return reject(err);
          });

          res.on("end", (res) => {
            client.unbind((err) => {
              if (err) {
                reject(err);
                return;
              }

              if (res.status === 0) {
                resolve(user);
              } else {
                reject(new Error("user not found."));
              }
            });
          });
        });
      });
    });
  }

  findAllUsers(filter, value) {
    return new Promise((resolve, reject) => {
      const client = ldap.createClient({
        url: this.url,
      });

      client.bind(this.user, this.pass, (err) => {
        if (err) return reject(err);

        const params = {
          scope: "sub",
          filter: `(objectClass=${configFile.defaults.objectClass})`,
          attributes: configFile.defaults.attributes,
        };

        client.search(this.baseDN, params, (err, res) => {
          if (err) return reject(err);

          let users = [];
          let user = null;

          res.on("searchEntry", (entry) => {
            const attributes = entry.pojo.attributes;
            const details = {};

            for (const attribute of attributes) {
              const attributeName = attribute.type;
              const attributeValue = attribute.values.length === 1 ? attribute.values[0] : attribute.values;

              details[attributeName] = attributeValue;
            }

            user = details;
            users.push(user);
          });

          res.on("error", (err) => {
            return reject(err);
          });

          res.on("end", (res) => {
            client.unbind((err) => {
              if (err) {
                reject(err);
                return;
              }

              if (res.status === 0) {
                if (filter && value) {
                  const filtered = users.filter((user) => user[filter] == value);
                  resolve(filtered);
                  return;
                }
                resolve(users);
                return;
              } else {
                reject(new Error("data not found."));
                return;
              }
            });
          });
        });
      });
    });
  }

  addUser(user) {
    return new Promise((reject, resolve) => {
      let {
        fullname,
        username,
        email,
        description,
        company,
        title,
        department,
        office,
        country,
        city,
        state,
        postalCode,
        mobileNumber,
        homePhone,
        streetAddress,
        password,
        local,
        enabled,
      } = user;

      // miniium required fullname and password
      if (!fullname || !password) {
        reject(new Error("fullname and password is required"));
        return;
      }

      const nameParts = fullname.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      const restName = nameParts.slice(1, nameParts.length).join(" ");

      if (!username) username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;

      // const userObject = {
      //   givenName: firstName,
      //   sn: lastName,
      //   cn: `${firstName} ${restName}`,
      //   name: fullname,
      //   displayName: fullname,
      //   sAMAccountName: username,
      //   mail: email,
      //   userPrincipalName: `${username}@${this.domain}`,
      //   description: description,
      //   company: company,
      //   title: title,
      //   department: department,
      //   physicalDeliveryOfficeName: office,
      //   co: country,
      //   l: city,
      //   st: state,
      //   postalCode: postalCode,
      //   mobile: mobileNumber,
      //   telephoneNumber: mobileNumber,
      //   homePhone: homePhone,
      //   streetAddress: streetAddress,
      //   userAccountControl: enabled ? 66048 : 66050,
      //   userPassword: password,
      //   objectClass: ["top", "person", "organizationalPerson", "user"],
      // };

      const userObject = {
        cn: "teste teste",
        sn: "teste",
        givenName: "teste",
        sAMAccountName: "teste.com",
        userPrincipalName: `${user.sAMAccountName}@example.com`,
        userPassword: "teste@123",
        objectClass: ["top", "person", "organizationalPerson", "user"],
      };

      const client = ldap.createClient({
        url: this.url,
      });

      client.bind(this.user, this.pass, (err) => {
        if (err) return reject(err);

        client.add(`CN=${userObject.cn},${this.baseDN}`, userObject, (err) => {
          if (err) {
            client.unbind();
            reject(err);
            return;
          }

          resolve("User created");
          client.unbind();
        });
      });

      client.unbind();
    });
  }
}

module.exports = ActiveDirectory;
