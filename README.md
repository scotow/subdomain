# subdomain

A simple OVH's API wrapper to list, create and delete subdomain(s) entry.

### How to install

`npm install -g https://github.com/Scotow/subdomain`

### Example

`subdomain -d google.com --ip=8.8.8.8 -a dns -r dev`
> Create the subdomain "dns" and make it targets to 8.8.8.8, delete subdomain "dev".

### Credentials

Setup your credentials by editing the `credentials.json` file in the project's directory and fill it using the following pattern:

```JSON
{
	"appKey": "YOUR_APP_KEY",
	"appSecret": "YOUR_APP_SECRET_KEY",
	"consumerKey": "YOUR_CONSUMER_KEY"
}
```

### App

Head to this [link](https://eu.api.ovh.com/createToken/) to create an app credentials. 🔑
