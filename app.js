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
	}).catch(console.error);
}

function addSubdomainPromise(domain, ip, subdomain) {
	return ovh.requestPromised('POST', `/domain/zone/${domain}/record`, {
		fieldType: 'A', // Required: Resource record Name (type: zone.NamedResolutionFieldTypeEnum)
		subDomain: subdomain, // Resource record subdomain (type: string)
		target: ip // Required: Resource record target (type: string)
	});
}

function removeSubdomainPromise(domain, subdomain) {
	function deleteEntryPromise(id) {
		return ovh.requestPromised('DELETE', `/domain/zone/${domain}/record/${id}`);
	}

	return ovh.requestPromised('GET', `/domain/zone/${domain}/record`, {
		fieldType: 'A', // Required: Resource record Name (type: zone.NamedResolutionFieldTypeEnum)
		subDomain: subdomain // Resource record subdomain (type: string)
	}).then(ids => {
		return Promise.all(ids.map(deleteEntryPromise));
	}).catch(console.error);
}

function refreshPromise(domain) {
	return ovh.requestPromised('POST', `/domain/zone/${domain}/refresh`);
}

function actionsPromise(domain, ip, add, remove) {
	return Promise.all(
		add.map(addSubdomainPromise.bind(null, domain, ip))
		.concat(remove.map(removeSubdomainPromise.bind(null, domain)))
	);
}

function prepareKey(key) {
	if(!key) return [];
	if(_.isString(key)) return [key];
	return _.compact(key);
}

const argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .example('$0 -d google.com --ip=8.8.8.8 -a dns -r dev', 'Create the subdomain "dns" and make it target 8.8.8.8, delete subdomain "dev".')
	.option('d', {
		type: 'string',
		alias: 'domain',
		description: 'Domain name you want to modify',
		demandOption: true,
		coerce: key => _.isArray(key) ? _.last(key) : key
	})
	.option('i', {
		type: 'string',
		alias: 'ip',
		description: 'IP target of the subdomain',
	})
	.option('a', {
		type: 'string',
		implies: 'd',
		alias: 'add',
		description: 'Subdomain to add',
		default: [],
		coerce: prepareKey,
	})
	.option('r', {
		type: 'string',
		implies: 'd',
		alias: 'remove',
		description: 'Subdomain to remove',
		default: [],
		coerce: prepareKey,
	})
	.check(({domain, ip}) => {
		if(!domain) return false;
		if(!ip) return true;
		return /^(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})(.(25[0-5]|2[0-4][0-9]|1?[0-9]{1,2})){3}$/.test(ip)
	})
    .help('h').alias('h', 'help')
    .epilog('More info at: https://github.com/Scotow/subdomain')
    .argv;

if(!(argv.add.length + argv.remove.length)) {
	listSubdomainsPromise(argv.domain)
	.then(infos => console.log(infos.map(({subDomain, target}) => `${subDomain} -> ${target}`).join('\n')))
	.catch(console.error);
} else {
	if(argv.ip) {
		actionsPromise(argv.domain, argv.ip, argv.add, argv.remove)
		.then(refreshPromise(argv.domain))
		.catch(console.error);
	} else {
		publicIp.v4()
		.then(ip => {
			return actionsPromise(argv.domain, ip, argv.add, argv.remove);
		})
		.then(refreshPromise(argv.domain))
		.catch(console.error);
	}
}
