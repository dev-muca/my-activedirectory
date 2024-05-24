const ldap = require("ldapjs");
const ssha = require("node-ssha256");
const configFile = require("./lib/config.json");
const { getFirstName, getLastName, getRestName } = require("./lib/utils/names");
const { parseLocation } = require("./lib/utils/parseLocation");

class ActiveDirectory {
  constructor(config) {
    this.url = config.url;
    this.user = config.user;
    this.pass = config.pass;
    this.domain = config.user.split("@")[1];
    this.baseDN = `DC=${this.domain.split(".")[0].toUpperCase()},DC=${this.domain.split(".")[1].toUpperCase()}`;
  }

  userExists(username) {
    return new Promise((resolve, reject) => {
      if (!username) return reject(false);

      const client = ldap.createClient({
        url: this.url,
        tlsOptions: {
          rejectUnauthorized: false,
        },
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

  authenticate(username, password) {
    return new Promise(async (resolve, reject) => {
      if (!username) return reject({ field: "username", message: "Username is required" });
      if (!password) return reject({ field: "password", message: "Password is required" });

      const exists = await this.userExists(username);

      if (!exists) return reject({ field: "username", message: "Invalid username" });

      const client = ldap.createClient({
        url: this.url,
        tlsOptions: {
          rejectUnauthorized: false,
        },
      });

      client.bind(`${username}@${this.domain}`, password, (err) => {
        if (err) {
          client.unbind();
          return reject({ field: "password", message: "invalid password" });
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

  findUser(username) {
    return new Promise((resolve, reject) => {
      if (!username) return reject(new Error("username is required"));

      const client = ldap.createClient({
        url: this.url,
        tlsOptions: {
          rejectUnauthorized: false,
        },
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
            // console.log(entry.pojo.objectName);

            const attributes = entry.pojo.attributes;
            const details = {};

            for (const attribute of attributes) {
              const attributeName = attribute.type;
              const attributeValue = attribute.values.length === 1 ? attribute.values[0] : attribute.values;

              details[attributeName] = attributeValue;
            }

            details.objectName = entry.pojo.objectName;
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
        tlsOptions: {
          rejectUnauthorized: false,
        },
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

  getUserLocation(userName) {
    return new Promise(async (resolve, reject) => {
      this.findUser(userName)
        .then((userObject) => {
          if (Object.keys(userObject).length < 1) {
            return reject({ error: true, message: "User does not exist." });
          }
          let dn = userObject.objectName;
          let left = String(dn).replace(/DC=/g, "dc=").replace(/CN=/g, "cn=").replace(/OU=/g, "ou=").split(",dc=")[0];
          let location = String(left).split(",").slice(1).reverse().join("/").replace(/cn=/g, "!").replace(/ou=/g, "");
          return resolve(location);
        })
        .catch((err) => {
          return reject(err);
        });
    });
  }

  addUser(user) {
    return new Promise((resolve, reject) => {
      //Required fields
      let { fullname, username, password, location } = user;

      //Optional fields
      let {
        commonName,
        name,
        displayName,
        email,
        description,
        company,
        title,
        department,
        office,
        countryAcronym,
        countryName,
        cityName,
        stateName,
        postalCode,
        mobileNumber,
        telephoneNumber,
        streetAddress,
        website,
      } = user;

      if (!fullname) return reject({ field: "fullname", message: "fullname is required" });
      if (!password) return reject({ field: "password", message: "password is required" });
      if (!username) username = `${getFirstName(fullname).toLowerCase()}.${getLastName(fullname).toLowerCase()}`;

      commonName = `${getFirstName(fullname)} ${getRestName(fullname)}`;
      name = fullname;
      displayName = fullname;

      const userObject = {
        userPrincipalName: `${username}@${this.domain}`,
        objectClass: configFile.defaults.objectClass,
        userPassword: password,
        givenName: getFirstName(fullname),
        sn: getLastName(fullname),
        sAMAccountName: username,
        cn: commonName,
        name: name,
        displayName: displayName,
        mail: email,
        description: description,
        company: company,
        title: title,
        department: department,
        physicalDeliveryOfficeName: office,
        c: countryAcronym,
        co: countryName,
        l: cityName,
        st: stateName,
        postalCode: postalCode,
        mobile: mobileNumber,
        telephoneNumber: mobileNumber,
        homePhone: telephoneNumber,
        streetAddress: streetAddress,
        wWWHomePage: website,
      };

      location = parseLocation(location);
      console.log(location);

      const client = ldap.createClient({
        url: this.url,
        tlsOptions: {
          rejectUnauthorized: false,
        },
      });

      client.bind(this.user, this.pass, (err) => {
        if (err) return reject(err);

        client.add(`CN=${userObject.cn},OU=Users,${this.baseDN}`, userObject, (addErr) => {
          client.unbind();

          if (addErr) {
            const ENTRY_EXISTS = addErr.message.includes("Entry Already Exists");
            if (ENTRY_EXISTS) {
              return reject({ created: false, message: "user already exists" });
            }
          }

          resolve({ created: true, message: "user created" });
        });
      });
    });
  }
}

module.exports = ActiveDirectory;
