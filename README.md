# subdomain

A simple OVH's API wrapper to create subdomain(s).

### How to install

`npm install -g https://github.com/Scotow/subdomain`

### Usage

`node subdomain domain subdomain [subdomain ...]`

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
