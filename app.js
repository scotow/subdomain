// IP
const publicIp = require('public-ip');

// OVH
const credentials = require('./credentials.json');
const ovh = require('ovh')({
	endpoint: 'ovh-eu',
	appKey: credentials.appKey,
	appSecret: credentials.appSecret,
	consumerKey: credentials.consumerKey
});

function addSubdomainPromise(domain, ip, subdomain) {
	return ovh.requestPromised('POST', `/domain/zone/${domain}/record`, {
		fieldType: 'A', // Required: Resource record Name (type: zone.NamedResolutionFieldTypeEnum)
		subDomain: subdomain, // Resource record subdomain (type: string)
		target: ip // Required: Resource record target (type: string)
	});
}

function refreshPromise(domain) {
	return ovh.requestPromised('POST', `/domain/zone/${domain}/refresh`);
}

function usage() {
	console.log('Usage: domain subdomain [subdomain ...]');
	process.exit(1);
}

const domain = process.argv[2];
const subdomains = process.argv.slice(3);

if(!domain || !subdomains.length) usage();

publicIp.v4().then(ip => {
	Promise.all(subdomains.map(addSubdomainPromise.bind(null, domain, ip)))
	.then(infos => {
		console.log(infos);
		return refreshPromise(domain);
	}, console.error).then(console.log, console.error);
});
