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

  authenticate(user, pass) {}

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
}

module.exports = ActiveDirectory;
