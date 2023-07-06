# MY-ACTIVEDIRECTORY

Active Directory API for NodeJS usage. This library provides a set of API methods to perform all CRUd operations in Active Directory (Microsoft Domain Controllers) through the LDAP protocol

## Installation

NPM or YARN:

```bash
npm install my-activdirectory

or

yarn add my-activedirectory
```

## Usage

```js
const ActiveDirectory = require("my-activedirectory");
const AD = new ActiveDirectory({
  url: "ldap://your-domain.com",
  user: "admin_user",
  pass: "admin_pass",
});
```

## Methods

```js
userExists(username)
...return true/false

authenticate(username, password)
...return true/false with field contains error

findUser(username)
...return user details

findAllUsers(filter, value)
...returns all users, when filling in the filter and value parameters,
the query will return filtered users

getUserLocation(userName)
...return user OU location ex.: OU=User,DC=your_domain,DC=com

addUser(user)
...returns whether the user was created or not,
the following parameters are the minimum to create a user: fullname, password.

Other fields can be provided, such as:
commonName, name, displayName, email, description,
company, title, department, office, countryAcronym,
countryName, cityName, stateName, postalCode,
mobileNumber, telephoneNumber, streetAddress,
website.
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
