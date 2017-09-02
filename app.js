#!/usr/bin/env node

// UTILS
const _ = require('underscore');

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

function listSubdomainsPromise(domain) {
	function domainInfoPromise(id) {
		return ovh.requestPromised('GET', `/domain/zone/${domain}/record/${id}`);
	}

	return ovh.requestPromised('GET', `/domain/zone/${domain}/record`, {
		fieldType: 'A', // Required: Resource record Name (type: zone.NamedResolutionFieldTypeEnum)
	}).then(ids => {
		return Promise.all(ids.map(domainInfoPromise));
	});
}

function addSubdomainPromise(domain, ip, subdomain) {
	return ovh.requestPromised('POST', `/domain/zone/${domain}/record`, {
		fieldType: 'A', // Required: Resource record Name (type: zone.NamedResolutionFieldTypeEnum)
		subDomain: subdomain, // Resource record subdomain (type: string)
		target: ip // Required: Resource record target (type: string)
	});
}

function removeSubdomainPromise(domain, all, subdomain) {
	function deleteEntryPromise(id) {
		return ovh.requestPromised('DELETE', `/domain/zone/${domain}/record/${id}`);
	}

	return ovh.requestPromised('GET', `/domain/zone/${domain}/record`, {
		fieldType: 'A', // Required: Resource record Name (type: zone.NamedResolutionFieldTypeEnum)
		subDomain: subdomain // Resource record subdomain (type: string)
	}).then(ids => {
		if(all && ids.length) {
			return Promise.all(ids.map(deleteEntryPromise));
		} else if(ids.length) {
			return deleteEntryPromise(ids[0]);
		} else {
			return Promise.reject(`No subdomain '${subdomain}' found.`);
		}
	});
}

function refreshPromise(domain) {
	return ovh.requestPromised('POST', `/domain/zone/${domain}/refresh`);
}

function actionsPromise(domain, ip, add, remove, all) {
	return Promise.all(
		add.map(addSubdomainPromise.bind(null, domain, ip))
		.concat(remove.map(removeSubdomainPromise.bind(null, domain, all)))
	);
}

function extractKey(key) {
	return _.isArray(key) ? _.last(key) : key
}

function prepareKey(key) {
	if(!key) return []; 				// Empty string.
	if(_.isString(key)) return [key]; 	// Embeb in an array.
	return _.compact(key);				// Remove falsly values.
}

const argv = require('yargs')
    .usage('Usage: $0 -d domain [-a subdomain] [-r subdomain [--all]]')
    .example('$0 -d google.com --ip=8.8.8.8 -a dns -r dev --all', 'Create the subdomain "dns" and make it targets to 8.8.8.8, delete all subdomains "dev".')
	.option('d', {
		type: 'string',
		alias: 'domain',
		description: 'Domain name you want to modify',
		demandOption: true,
		coerce: extractKey
	})
	.option('i', {
		type: 'string',
		implies: 'a',
		alias: 'ip',
		description: 'IP target of the subdomain',
		coerce: extractKey
	})
	.option('a', {
		type: 'string',
		implies: 'd',
		alias: 'add',
		description: 'Subdomain to add',
		coerce: prepareKey,
	})
	.option('r', {
		type: 'string',
		implies: 'd',
		alias: 'remove',
		description: 'Subdomain to remove',
		coerce: prepareKey,
	})
	.option('all', {
		implies: 'r',
		description: 'Remove all the DNS entries matching the name, rather than only one.',
	})
	.check(({domain, ip}) => {
		if(!domain) return false;
		if(_.isString(ip) && !/^(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})(.(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})){3}$/.test(ip)) return false;
		return true;
	})
    .help('h').alias('h', 'help')
    .epilog('More info at: https://github.com/Scotow/subdomain')
    .argv;

argv.add = argv.add || [];
argv.remove = argv.remove || [];

if(!(argv.add.length + argv.remove.length)) {
	listSubdomainsPromise(argv.domain)
	.then(infos => console.log(infos.map(({subDomain, target}) => `${subDomain} -> ${target}`).join('\n')))
	.catch(console.error);
} else {
	if(argv.ip) {
		actionsPromise(argv.domain, argv.ip, argv.add, argv.remove, argv.all)
		.then(refreshPromise(argv.domain))
		.catch(console.error);
	} else {
		publicIp.v4()
		.then(ip => actionsPromise(argv.domain, ip, argv.add, argv.remove, argv.all))
		.then(refreshPromise(argv.domain))
		.catch(console.error);
	}
}
